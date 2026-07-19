import type { MetricDefinitionItem } from '@/lib/api';
import { calculateGoalProgressLanes } from '@/lib/progress';
import { GoalItem, MilestoneItem, StatusType, TaskItem, TodoItem } from '@/lib/types';

export type GoalCardTone = 'warm' | 'moss' | 'slate' | 'plum';
export type GoalCardStatusTone = 'neutral' | 'active' | 'attention' | 'complete';

export interface GoalCardLaneView {
 label: string;
 value: number | null;
}

export interface GoalCardView {
 statusLabel: string;
 statusTone: GoalCardStatusTone;
 dueLabel?: string;
 visualTone: GoalCardTone;
 progress: {
 label: string;
 headline: string;
 detail?: string;
 value: number | null;
 lanes?: GoalCardLaneView[];
 };
 nextStep: {
 title: string;
 context: string;
 };
}

const COMPLETE_STATUSES = new Set([StatusType.FINISHED, StatusType.CLOSED]);
const TERMINAL_STATUSES = new Set([
 StatusType.FINISHED,
 StatusType.CLOSED,
 StatusType.ABORTED,
 StatusType.CANCELLED,
]);
const DAY_MS = 24 * 60 * 60 * 1000;
const TONES: GoalCardTone[] = ['warm', 'moss', 'slate', 'plum'];

const isComplete = (status: StatusType) => COMPLETE_STATUSES.has(status);
const isOpen = (status: StatusType) => !TERMINAL_STATUSES.has(status);
const clamp = (value: number) => Math.min(100, Math.max(0, value));
const rounded = (value: number | null) => value === null ? null : Math.round(clamp(value));
const byPosition = <T extends { position?: number; id: string }>(items: T[] = []) => (
 [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id.localeCompare(b.id))
);
const formatNumber = (value: number | undefined) => {
 if (value === undefined) return '—';
 return Number.isInteger(value) ? String(value) : value.toFixed(1);
};
const withUnit = (value: number | undefined, unit?: string | null) => (
 `${formatNumber(value)}${unit ? ` ${unit}` : ''}`
);

const toneForGoal = (goalId: string): GoalCardTone => {
 let hash = 0;
 for (const character of goalId) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
 return TONES[Math.abs(hash) % TONES.length];
};

const metricForGoal = (
 goal: GoalItem,
 metrics: MetricDefinitionItem[],
 metricDefinitionId?: string,
 metricName?: string,
) => metrics.find((metric) => metric.id === metricDefinitionId)
 ?? metrics.find((metric) => (
 metric.goal_id === goal.id
 && !metric.milestone_id
 && !metric.task_id
 && metric.name.trim().toLocaleLowerCase() === metricName?.trim().toLocaleLowerCase()
 ));

const structuralSummary = (goal: GoalItem) => {
 const milestones = goal.milestones ?? [];
 if (milestones.length > 0) {
 const completed = milestones.filter((milestone) => isComplete(milestone.status)).length;
 return `${completed} of ${milestones.length} milestones complete`;
 }
 const tasks = (goal.tasks ?? []).filter((task) => task.kind !== 'routine');
 if (tasks.length > 0) {
 const completed = tasks.filter((task) => isComplete(task.status)).length;
 return `${completed} of ${tasks.length} tasks complete`;
 }
 return 'No plan yet';
};

const weightedHybridProgress = (goal: GoalItem): number | null => {
 const rule = goal.completion_rule;
 if (rule?.type !== 'hybrid') return null;
 if (rule.current_progress !== undefined && rule.current_progress !== null) return rounded(rule.current_progress);
 const lanes = calculateGoalProgressLanes(goal);
 const weighted = [
 { value: lanes.find((lane) => lane.id === 'structural')?.value ?? null, weight: rule.structural_weight ?? 0 },
 { value: lanes.find((lane) => lane.id === 'outcome')?.value ?? null, weight: rule.outcome_weight ?? 0 },
 { value: lanes.find((lane) => lane.id === 'consistency')?.value ?? null, weight: rule.consistency_weight ?? 0 },
 ].filter((lane) => lane.weight > 0);
 if (!weighted.length) return null;
 const totalWeight = weighted.reduce((sum, lane) => sum + lane.weight, 0);
 return rounded(weighted.reduce((sum, lane) => sum + (lane.value ?? 0) * lane.weight, 0) / totalWeight);
};

const progressForGoal = (goal: GoalItem, metrics: MetricDefinitionItem[]): GoalCardView['progress'] => {
 const rule = goal.completion_rule ?? { type: 'structural' as const };
 const lanes = calculateGoalProgressLanes(goal);
 const structural = lanes.find((lane) => lane.id === 'structural')?.value ?? 0;

 if (rule.type === 'metric_target') {
 const metric = metricForGoal(goal, metrics, rule.metric_definition_id, rule.metric_name);
 const name = metric?.name || rule.metric_name || 'Outcome';
 return {
 label: 'Outcome',
 headline: rule.current_value === undefined
 ? `${name}: add a current value`
 : `${name}: ${withUnit(rule.current_value, metric?.unit)} → ${withUnit(rule.target_value, metric?.unit)}`,
 detail: rule.start_value === undefined ? undefined : `Started at ${withUnit(rule.start_value, metric?.unit)}`,
 value: rounded(lanes.find((lane) => lane.id === 'outcome')?.value ?? null),
 };
 }

 if (rule.type === 'consistency') {
 const current = rule.current_done ?? 0;
 const required = rule.required_done ?? 0;
 return {
 label: 'Consistency',
 headline: rule.label || `${current} of ${required || '—'} repetitions`,
 detail: required ? `${current}/${required} completed in ${rule.window_days ?? 7} days` : 'Set a repetition target',
 value: rounded(lanes.find((lane) => lane.id === 'consistency')?.value ?? null),
 };
 }

 if (rule.type === 'hybrid') {
 return {
 label: 'Overall progress',
 headline: structuralSummary(goal),
 detail: 'Plan, outcome, and routine all contribute',
 value: weightedHybridProgress(goal),
 lanes: [
 { label: 'Plan', value: rounded(lanes.find((lane) => lane.id === 'structural')?.value ?? null) },
 { label: 'Outcome', value: rounded(lanes.find((lane) => lane.id === 'outcome')?.value ?? null) },
 { label: 'Routine', value: rounded(lanes.find((lane) => lane.id === 'consistency')?.value ?? null) },
 ],
 };
 }

 return {
 label: 'Plan progress',
 headline: structuralSummary(goal),
 value: rounded(structural),
 };
};

const nextTodo = (task: TaskItem): TodoItem | undefined => byPosition(task.todos ?? [])
 .find((todo) => !todo.repeat_interval && isOpen(todo.status));

const nextFromTask = (task: TaskItem, context: string): GoalCardView['nextStep'] => {
 const todo = nextTodo(task);
 return todo
 ? { title: todo.title, context: `${task.title} · ${context}` }
 : { title: task.title, context };
};

const nextFromMilestone = (milestone: MilestoneItem): GoalCardView['nextStep'] => {
 const task = byPosition(milestone.tasks ?? []).find((candidate) => candidate.kind !== 'routine' && isOpen(candidate.status));
 if (task) return nextFromTask(task, milestone.title);
 return { title: 'Add the next task', context: milestone.title };
};

const nextStepForGoal = (goal: GoalItem): GoalCardView['nextStep'] => {
 if (isComplete(goal.status)) return { title: 'Review what you achieved', context: 'Goal complete' };

 const milestone = byPosition(goal.milestones ?? []).find((candidate) => isOpen(candidate.status));
 if (milestone) return nextFromMilestone(milestone);

 const goalTask = byPosition(goal.tasks ?? []).find((task) => task.kind !== 'routine' && isOpen(task.status));
 if (goalTask) return nextFromTask(goalTask, 'Goal plan');

 const allTasks = [
 ...(goal.tasks ?? []),
 ...(goal.milestones ?? []).flatMap((item) => item.tasks ?? []),
 ];
 const routine = byPosition(allTasks).find((task) => task.kind === 'routine' && isOpen(task.status));
 const recurringTodo = routine && byPosition(routine.todos ?? []).find((todo) => Boolean(todo.repeat_interval));
 if (recurringTodo) return { title: recurringTodo.title, context: routine.title };
 if (routine) return { title: routine.title, context: 'Routine' };

 return { title: 'Build your plan', context: 'Add milestones and next steps' };
};

const dueState = (goal: GoalItem, now: Date) => {
 if (!goal.end_datetime || isComplete(goal.status)) return undefined;
 const due = new Date(goal.end_datetime);
 if (Number.isNaN(due.getTime())) return undefined;
 const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
 const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
 const days = Math.ceil((dueDay - today) / DAY_MS);
 if (days < 0) return { label: `${Math.abs(days)}d overdue`, overdue: true };
 if (days === 0) return { label: 'Due today', overdue: false };
 return { label: `${days}d left`, overdue: false };
};

export const buildGoalCardView = (
 goal: GoalItem,
 metrics: MetricDefinitionItem[] = [],
 now = new Date(),
): GoalCardView => {
 const due = dueState(goal, now);
 const completed = isComplete(goal.status);
 const archived = goal.status === StatusType.CANCELLED || goal.status === StatusType.ABORTED;
 const started = goal.status === StatusType.STARTED || goal.status === StatusType.IN_PROGRESS;
 const progress = progressForGoal(goal, metrics);
 const hasMovement = progress.value !== null && progress.value > 0;
 return {
 statusLabel: completed ? 'Completed' : archived ? 'Archived' : due?.overdue ? 'Needs attention' : started || hasMovement ? 'Active' : 'Not started',
 statusTone: completed ? 'complete' : due?.overdue ? 'attention' : started || hasMovement ? 'active' : 'neutral',
 dueLabel: due?.label,
 visualTone: toneForGoal(goal.id),
 progress,
 nextStep: nextStepForGoal(goal),
 };
};
