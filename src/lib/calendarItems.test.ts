import { describe, it, expect } from 'vitest';
import { buildCalendarItems, calendarDateKey, filterItemsByDate, groupItemsByDate, parseCalendarDate } from './calendarItems';
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
 subtasks: [
 {
 id: 's1',
 title: 'subtask',
 description: '',
 status: StatusType.OUTSTANDING,
 priority: PriorityType.LOW,
 due_date: '2026-05-06T00:00:00Z',
 task_id: 't1',
 },
 ],
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
 expect(items.map((i) => i.itemType).sort()).toEqual(['Goal', 'Milestone', 'Task', 'Subtask', 'Todo'].sort());
 });

 it('preserves breadcrumb context', () => {
 const items = buildCalendarItems([goalWithEverything], [], [], []);
 const todo = items.find((i) => i.itemType === 'Todo')!;
 const subtask = items.find((i) => i.itemType === 'Subtask')!;
 expect(todo.goalTitle).toBe('goal');
 expect(todo.milestoneTitle).toBe('milestone');
 expect(todo.taskTitle).toBe('task');
 expect(subtask.goalTitle).toBe('goal');
 expect(subtask.milestoneTitle).toBe('milestone');
 expect(subtask.taskTitle).toBe('task');
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

 it('records scheduled_date as the effective task date source', () => {
 const scheduledTask = {
 ...goalWithEverything.milestones[0].tasks[0],
 scheduled_date: '2026-05-08',
 due_date: '2026-05-10',
 };
 const items = buildCalendarItems([], [scheduledTask], [], []);
 const task = items.find((item) => item.itemType === 'Task' && item.id === 't1');
 expect(task?.due_date).toBe('2026-05-08');
 expect(task?.dateSource).toBe('scheduled_date');
 });
});

describe('filterItemsByDate', () => {
 it('matches by toDateString', () => {
 const items = buildCalendarItems([goalWithEverything], [], [], []);
 const target = new Date('2026-05-10T00:00:00Z');
 const same = filterItemsByDate(items, target);
 expect(same.length).toBeGreaterThan(0);
 });

 it('treats YYYY-MM-DD as a local calendar day', () => {
 const date = parseCalendarDate('2026-07-11');
 expect(calendarDateKey(date)).toBe('2026-07-11');
 const same = filterItemsByDate(
 [
 {
 id: 'date-only',
 title: 'Date only',
 due_date: '2026-07-11',
 status: StatusType.OUTSTANDING,
 itemType: 'Task',
 },
 ],
 date,
 );
 expect(same).toHaveLength(1);
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
