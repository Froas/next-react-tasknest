import { describe, it, expect } from 'vitest';
import { calculateMilestoneProgress, calculateGoalProgress } from './progress';
import { StatusType, PriorityType, MilestoneItem, GoalItem } from './types';

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

 it('weights tasks + subtasks + todos as equal units', () => {
 // 2 tasks, one finished, plus 4 children, 2 done. Total 6 units, 3 done = 50%.
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
});
