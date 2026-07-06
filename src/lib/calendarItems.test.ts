import { describe, it, expect } from 'vitest';
import { buildCalendarItems, filterItemsByDate, groupItemsByDate } from './calendarItems';
import { StatusType, PriorityType, GoalItem } from './types';

const goalWithEverything: GoalItem = {
 id: 'g1',
 title: 'goal',
 description: '',
 status: StatusType.IN_PROGRESS,
 priority: PriorityType.HIGH,
 end_datetime: '2026-06-01T00:00:00Z',
 milestones: [
 {
 id: 'm1',
 title: 'milestone',
 description: '',
 status: StatusType.IN_PROGRESS,
 priority: PriorityType.MEDIUM,
 due_date: '2026-05-15T00:00:00Z',
 goal_id: 'g1',
 tasks: [
 {
 id: 't1',
 title: 'task',
 description: '',
 status: StatusType.OUTSTANDING,
 priority: PriorityType.LOW,
 due_date: '2026-05-10T00:00:00Z',
 milestone_id: 'm1',
 subtasks: [],
 todos: [
 {
 id: 'td1',
 title: 'todo',
 description: '',
 status: StatusType.OUTSTANDING,
 priority: PriorityType.LOW,
 due_date: '2026-05-05T00:00:00Z',
 task_id: 't1',
 },
 ],
 },
 ],
 },
 ],
};

describe('buildCalendarItems', () => {
 it('extracts all dated entities from a goal tree', () => {
 const items = buildCalendarItems([goalWithEverything], [], [], []);
 expect(items.map((i) => i.itemType).sort()).toEqual(['Goal', 'Milestone', 'Task', 'Todo'].sort());
 });

 it('preserves breadcrumb context', () => {
 const items = buildCalendarItems([goalWithEverything], [], [], []);
 const todo = items.find((i) => i.itemType === 'Todo')!;
 expect(todo.goalTitle).toBe('goal');
 expect(todo.milestoneTitle).toBe('milestone');
 expect(todo.taskTitle).toBe('task');
 });

 it('skips entities without due dates', () => {
 const goalNoDate: GoalItem = { ...goalWithEverything, end_datetime: undefined };
 const items = buildCalendarItems([goalNoDate], [], [], []);
 expect(items.find((i) => i.itemType === 'Goal' && i.id === 'g1')).toBeUndefined();
 });

 it('deduplicates entities seen via tree and flat lists', () => {
 const flatTask = goalWithEverything.milestones[0].tasks[0];
 const items = buildCalendarItems([goalWithEverything], [flatTask], [], []);
 const taskCount = items.filter((i) => i.itemType === 'Task' && i.id === 't1').length;
 expect(taskCount).toBe(1);
 });
});

describe('filterItemsByDate', () => {
 it('matches by toDateString', () => {
 const items = buildCalendarItems([goalWithEverything], [], [], []);
 const target = new Date('2026-05-10T00:00:00Z');
 const same = filterItemsByDate(items, target);
 expect(same.length).toBeGreaterThan(0);
 });
});

describe('groupItemsByDate', () => {
 it('keys by Date.toDateString()', () => {
 const items = buildCalendarItems([goalWithEverything], [], [], []);
 const map = groupItemsByDate(items);
 expect(map.size).toBeGreaterThan(0);
 map.forEach((bucket, key) => {
 expect(typeof key).toBe('string');
 expect(bucket.length).toBeGreaterThan(0);
 });
 });
});
