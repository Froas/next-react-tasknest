import { CompletionRule, GoalItem as Goal, MilestoneItem as Milestone, StatusType, TaskItem as Task } from './types';

export type ProgressLaneId = 'structural' | 'outcome' | 'consistency';

export interface ProgressLane {
 id: ProgressLaneId;
 label: string;
 value: number | null;
 detail: string;
}

interface ProgressCount {
 total: number;
 completed: number;
}

const isFinished = (status: StatusType) => (
 status === StatusType.FINISHED || status === StatusType.CLOSED
);

const isStructuralTask = (task: Task) => task.kind !== 'routine';

const clampProgress = (value: number): number => Math.min(100, Math.max(0, value));

const formatRuleNumber = (value: number | undefined): string =>
 value === undefined ? '—' : Number.isInteger(value) ? String(value) : value.toFixed(1);

const countTaskStructure = (task: Task): ProgressCount => {
 const subtasks = task.subtasks || [];
 return {
 total: 1 + subtasks.length,
 completed: (isFinished(task.status) ? 1 : 0) + subtasks.filter((subtask) => isFinished(subtask.status)).length,
 };
};

const countTasksStructure = (tasks: Task[] = []): ProgressCount => tasks
 .filter(isStructuralTask)
 .reduce<ProgressCount>((acc, task) => {
 const taskCount = countTaskStructure(task);
 return {
 total: acc.total + taskCount.total,
 completed: acc.completed + taskCount.completed,
 };
 }, { total: 0, completed: 0 });

const tasksForEntity = (entity: Goal | Milestone | Task): Task[] => {
 if ('milestones' in entity) {
 return [
 ...(entity.tasks || []),
 ...(entity.milestones || []).flatMap((milestone) => milestone.tasks || []),
 ];
 }
 if ('tasks' in entity) return entity.tasks || [];
 return [entity];
};

const countRecurringDefinitions = (entity: Goal | Milestone | Task): number => {
 return tasksForEntity(entity).reduce((total, task) => total + (task.todos?.length || 0), 0);
};

const calculateMetricRuleProgress = (rule: Extract<CompletionRule, { type: 'metric_target' }>): number | null => {
 const { current_value: current, target_value: target, start_value: start, direction } = rule;
 if (current === undefined || target === undefined) return null;
 if (direction === 'at_least') return clampProgress((current / target) * 100);
 if (direction === 'at_most') return current <= target ? 100 : clampProgress((target / current) * 100);
 if (start === undefined || start === target) return null;
 const raw = direction === 'decrease'
 ? ((start - current) / (start - target)) * 100
 : ((current - start) / (target - start)) * 100;
 return clampProgress(raw);
};

const outcomeLaneFromRule = (rule: CompletionRule | null | undefined): ProgressLane => {
 const outcomeRule = rule?.type === 'metric_target'
 ? rule
 : rule?.type === 'hybrid'
 ? rule.outcome
 : undefined;
 if (!outcomeRule) {
 return {
 id: 'outcome',
 label: 'Outcome',
 value: null,
 detail: 'Add a metric target rule to calculate outcome progress',
 };
 }
 const value = calculateMetricRuleProgress(outcomeRule);
 const metricName = outcomeRule.metric_name ?? 'metric';
 return {
 id: 'outcome',
 label: 'Outcome',
 value,
 detail: value === null
 ? `${metricName}: set start/current/target values`
 : `${metricName}: ${formatRuleNumber(outcomeRule.current_value)} → ${formatRuleNumber(outcomeRule.target_value)}`,
 };
};

const consistencyLaneFromRule = (entity: Goal | Milestone | Task, rule: CompletionRule | null | undefined): ProgressLane => {
 const recurringDefinitions = countRecurringDefinitions(entity);
 const consistencyRule = rule?.type === 'consistency'
 ? rule
 : rule?.type === 'hybrid'
 ? rule.consistency
 : undefined;
 if (consistencyRule) {
 const current = consistencyRule.current_done ?? 0;
 const required = consistencyRule.required_done;
 const value = required && required > 0 ? clampProgress((current / required) * 100) : null;
 return {
 id: 'consistency',
 label: 'Consistency',
 value,
 detail: required
 ? `${current}/${required}${consistencyRule.window_days ? ` in ${consistencyRule.window_days} days` : ''}`
 : `${recurringDefinitions} recurring routine${recurringDefinitions === 1 ? '' : 's'} tracked from Today`,
 };
 }
 return {
 id: 'consistency',
 label: 'Consistency',
 value: null,
 detail: recurringDefinitions > 0
 ? `${recurringDefinitions} recurring routine${recurringDefinitions === 1 ? '' : 's'} tracked from Today`
 : 'Tracked from TodoOccurrences on Today',
 };
};

// Structural progress for a milestone, expressed as 0-100.
// This intentionally ignores TodoDefinitions: recurring todos are daily
// consistency facts through TodoOccurrence, not one-off structural work.
export const calculateStructuralMilestoneProgress = (milestone: Milestone): number => {
 if (isFinished(milestone.status)) return 100;
 const taskCount = countTasksStructure(milestone.tasks || []);
 if (taskCount.total === 0) return 0;
 return (taskCount.completed / taskCount.total) * 100;
};

export const calculateStructuralTaskProgress = (task: Task): number => {
 if (isFinished(task.status)) return 100;
 const subtasks = task.subtasks || [];
 if (subtasks.length === 0) return 0;
 return (subtasks.filter((subtask) => isFinished(subtask.status)).length / subtasks.length) * 100;
};

// Structural progress for a goal. Milestones count as milestone-progress lanes;
// goal-scope project/challenge tasks count as structural task units.
export const calculateStructuralGoalProgress = (goal: Goal): number => {
 if (isFinished(goal.status)) return 100;
 const milestones = goal.milestones || [];
 const goalTaskCount = countTasksStructure(goal.tasks || []);
 const milestoneProgress = milestones.reduce((acc, milestone) => acc + (calculateStructuralMilestoneProgress(milestone) / 100), 0);
 const totalWeight = milestones.length + goalTaskCount.total;
 const completedWeight = milestoneProgress + goalTaskCount.completed;
 if (totalWeight === 0) return 0;
 return (completedWeight / totalWeight) * 100;
};

export const calculateGoalProgressLanes = (goal: Goal): ProgressLane[] => {
 const rule = goal.completion_rule;
 return [
 {
 id: 'structural',
 label: 'Structural',
 value: calculateStructuralGoalProgress(goal),
 detail: 'Milestones, project tasks, and subtasks',
 },
 outcomeLaneFromRule(rule),
 consistencyLaneFromRule(goal, rule),
 ];
};

export const calculateMilestoneProgressLanes = (milestone: Milestone): ProgressLane[] => {
 const rule = milestone.completion_rule;
 return [
 {
 id: 'structural',
 label: 'Structural',
 value: calculateStructuralMilestoneProgress(milestone),
 detail: 'Project tasks and their one-off subtasks',
 },
 outcomeLaneFromRule(rule),
 consistencyLaneFromRule(milestone, rule),
 ];
};

export const calculateTaskProgressLanes = (task: Task): ProgressLane[] => {
 const rule = task.completion_rule;
 return [
 {
 id: 'structural',
 label: 'Structural',
 value: calculateStructuralTaskProgress(task),
 detail: task.subtasks?.length ? 'One-off subtasks completed' : 'No structural subtasks configured',
 },
 outcomeLaneFromRule(rule),
 consistencyLaneFromRule(task, rule),
 ];
};

export const calculateMilestoneProgress = calculateStructuralMilestoneProgress;
export const calculateGoalProgress = calculateStructuralGoalProgress;
