import { describe, it, expect } from 'vitest';
import {
 calculateGoalProgress,
 calculateGoalProgressLanes,
 calculateMilestoneProgress,
 calculateMilestoneProgressLanes,
 calculateStructuralTaskProgress,
 calculateTaskProgressLanes,
} from './progress';
import { StatusType, PriorityType, MilestoneItem, GoalItem, TaskItem } from './types';

const baseEntity = {
 description: '',
 priority: PriorityType.MEDIUM,
};

const makeTask = (id: string, status: StatusType, opts: { subtasks?: number; subtasksDone?: number; todos?: number; todosDone?: number } = {}) => ({
 ...baseEntity,
 id,
 title: `task-${id}`,
 status,
 milestone_id: 'm',
 subtasks: Array.from({ length: opts.subtasks ?? 0 }, (_, i) => ({
 ...baseEntity,
 id: `${id}-s-${i}`,
 title: `sub-${i}`,
 status: i < (opts.subtasksDone ?? 0) ? StatusType.FINISHED : StatusType.OUTSTANDING,
 milestone_id: 'm',
 subtasks: [],
 todos: [],
 })) as any,
 todos: Array.from({ length: opts.todos ?? 0 }, (_, i) => ({
 ...baseEntity,
 id: `${id}-t-${i}`,
 title: `todo-${i}`,
 status: i < (opts.todosDone ?? 0) ? StatusType.FINISHED : StatusType.OUTSTANDING,
 })),
});

describe('calculateMilestoneProgress', () => {
 it('returns 100 for milestone with no tasks but FINISHED status', () => {
 const m: MilestoneItem = {
 ...baseEntity,
 id: 'm',
 title: 'm',
 status: StatusType.FINISHED,
 tasks: [],
 };
 expect(calculateMilestoneProgress(m)).toBe(100);
 });

 it('treats CLOSED as completed structural work', () => {
 const g: GoalItem = {
 ...baseEntity,
 id: 'closed-goal',
 title: 'closed-goal',
 status: StatusType.CLOSED,
 milestones: [{
 ...baseEntity,
 id: 'closed-milestone',
 title: 'closed-milestone',
 status: StatusType.CLOSED,
 tasks: [makeTask('closed-task', StatusType.CLOSED)],
 }],
 };

 expect(calculateGoalProgress(g)).toBe(100);
 });

 it('keeps completed parent entities at 100 even when descendants remain open', () => {
 const task = makeTask('closed-parent', StatusType.CLOSED, { subtasks: 2, subtasksDone: 0 });
 const milestone: MilestoneItem = {
 ...baseEntity,
 id: 'closed-parent-milestone',
 title: 'closed-parent-milestone',
 status: StatusType.CLOSED,
 tasks: [makeTask('open-child', StatusType.OUTSTANDING)],
 };

 expect(calculateStructuralTaskProgress(task as TaskItem)).toBe(100);
 expect(calculateMilestoneProgress(milestone)).toBe(100);
 });

 it('returns 0 for milestone with no tasks and not finished', () => {
 const m: MilestoneItem = {
 ...baseEntity,
 id: 'm',
 title: 'm',
 status: StatusType.OUTSTANDING,
 tasks: [],
 };
 expect(calculateMilestoneProgress(m)).toBe(0);
 });

 it('weights structural tasks and subtasks while ignoring recurring todo definitions', () => {
 // 2 tasks, one finished, plus 2 structural subtasks, 1 done.
 // The 2 todos are recurring definitions, so they do not affect structural progress.
 // Total 4 structural units, 2 done = 50%.
 const m: MilestoneItem = {
 ...baseEntity,
 id: 'm',
 title: 'm',
 status: StatusType.IN_PROGRESS,
 tasks: [
 makeTask('a', StatusType.FINISHED, { subtasks: 2, subtasksDone: 1, todos: 2, todosDone: 1 }),
 makeTask('b', StatusType.OUTSTANDING),
 ],
 };
 expect(Math.round(calculateMilestoneProgress(m))).toBe(50);
 });

 it('ignores routine container tasks in structural progress', () => {
 const m: MilestoneItem = {
 ...baseEntity,
 id: 'm',
 title: 'm',
 status: StatusType.IN_PROGRESS,
 tasks: [
 { ...makeTask('routine', StatusType.FINISHED, { todos: 3, todosDone: 3 }), kind: 'routine' },
 makeTask('project', StatusType.OUTSTANDING),
 ],
 };
 expect(calculateMilestoneProgress(m)).toBe(0);
 });
});

describe('calculateGoalProgress', () => {
 it('returns 0 when no milestones', () => {
 const g: GoalItem = {
 ...baseEntity,
 id: 'g',
 title: 'g',
 status: StatusType.OUTSTANDING,
 milestones: [],
 };
 expect(calculateGoalProgress(g)).toBe(0);
 });

 it('averages milestone progresses', () => {
 const g: GoalItem = {
 ...baseEntity,
 id: 'g',
 title: 'g',
 status: StatusType.IN_PROGRESS,
 milestones: [
 { ...baseEntity, id: 'm1', title: 'm1', status: StatusType.FINISHED, tasks: [] },
 { ...baseEntity, id: 'm2', title: 'm2', status: StatusType.OUTSTANDING, tasks: [] },
 ],
 };
 expect(calculateGoalProgress(g)).toBe(50);
 });

 it('exposes split progress lanes without mixing consistency into structural progress', () => {
 const g: GoalItem = {
 ...baseEntity,
 id: 'g',
 title: 'g',
 status: StatusType.IN_PROGRESS,
 milestones: [
 {
 ...baseEntity,
 id: 'm1',
 title: 'm1',
 status: StatusType.IN_PROGRESS,
 tasks: [makeTask('a', StatusType.FINISHED, { todos: 2, todosDone: 2 })],
 },
 ],
 };

 const lanes = calculateGoalProgressLanes(g);
 expect(lanes.find((lane) => lane.id === 'structural')?.value).toBe(100);
 expect(lanes.find((lane) => lane.id === 'outcome')?.value).toBeNull();
 expect(lanes.find((lane) => lane.id === 'consistency')?.detail).toContain('2 recurring routines');
 });

 it('calculates metric target outcome progress when a rule is present', () => {
 const g: GoalItem = {
 ...baseEntity,
 id: 'g',
 title: 'g',
 status: StatusType.IN_PROGRESS,
 completion_rule: {
 type: 'metric_target',
 metric_name: 'Weight',
 start_value: 105,
 current_value: 100,
 target_value: 90,
 direction: 'decrease',
 },
 milestones: [],
 };

 const lanes = calculateGoalProgressLanes(g);
 expect(Math.round(lanes.find((lane) => lane.id === 'outcome')?.value ?? 0)).toBe(33);
 expect(lanes.find((lane) => lane.id === 'outcome')?.detail).toContain('Weight');
 });

 it('calculates consistency progress when a rule is present', () => {
 const g: GoalItem = {
 ...baseEntity,
 id: 'g',
 title: 'g',
 status: StatusType.IN_PROGRESS,
 completion_rule: {
 type: 'consistency',
 current_done: 5,
 required_done: 7,
 window_days: 7,
 },
 milestones: [],
 };

 const lanes = calculateGoalProgressLanes(g);
 expect(Math.round(lanes.find((lane) => lane.id === 'consistency')?.value ?? 0)).toBe(71);
 expect(lanes.find((lane) => lane.id === 'consistency')?.detail).toContain('5/7');
 });

 it('reads outcome and consistency snapshots from a hybrid rule', () => {
 const g: GoalItem = {
 ...baseEntity,
 id: 'hybrid',
 title: 'hybrid',
 status: StatusType.IN_PROGRESS,
 completion_rule: {
 type: 'hybrid',
 structural_weight: 20,
 outcome_weight: 40,
 consistency_weight: 40,
 outcome: {
 type: 'metric_target',
 metric_name: 'Score',
 current_value: 5,
 target_value: 10,
 direction: 'at_least',
 },
 consistency: {
 type: 'consistency',
 current_done: 3,
 required_done: 4,
 window_days: 7,
 },
 },
 milestones: [],
 };

 const lanes = calculateGoalProgressLanes(g);
 expect(lanes.find((lane) => lane.id === 'outcome')?.value).toBe(50);
 expect(lanes.find((lane) => lane.id === 'consistency')?.value).toBe(75);
 });
});

describe('entity progress lanes', () => {
 it('shows milestone structural, outcome, and consistency independently', () => {
 const milestone: MilestoneItem = {
 ...baseEntity,
 id: 'm-lanes',
 title: 'Milestone lanes',
 status: StatusType.IN_PROGRESS,
 completion_rule: {
 type: 'hybrid',
 structural_weight: 20,
 outcome_weight: 40,
 consistency_weight: 40,
 outcome: {
 type: 'metric_target',
 metric_name: 'Score',
 current_value: 8,
 target_value: 10,
 direction: 'at_least',
 },
 consistency: {
 type: 'consistency',
 current_done: 3,
 required_done: 5,
 window_days: 7,
 },
 },
 tasks: [makeTask('lane-task', StatusType.FINISHED, { todos: 2 }) as TaskItem],
 };

 const lanes = calculateMilestoneProgressLanes(milestone);
 expect(lanes.find((lane) => lane.id === 'structural')?.value).toBe(100);
 expect(lanes.find((lane) => lane.id === 'outcome')?.value).toBe(80);
 expect(lanes.find((lane) => lane.id === 'consistency')?.value).toBe(60);
 });

 it('uses one-off subtasks for task structural progress', () => {
 const task = makeTask('task-lanes', StatusType.IN_PROGRESS, { subtasks: 2, subtasksDone: 1, todos: 3 }) as TaskItem;
 task.completion_rule = {
 type: 'consistency',
 current_done: 4,
 required_done: 8,
 window_days: 14,
 };

 const lanes = calculateTaskProgressLanes(task);
 expect(lanes.find((lane) => lane.id === 'structural')?.value).toBe(50);
 expect(lanes.find((lane) => lane.id === 'outcome')?.value).toBeNull();
 expect(lanes.find((lane) => lane.id === 'consistency')?.value).toBe(50);
 });
});
