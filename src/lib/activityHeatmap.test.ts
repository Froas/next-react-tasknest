import { describe, it, expect } from 'vitest';
import {
 buildActivityCounts,
 buildHeatmapGrid,
 longestStreak,
 currentStreak,
 activeDays,
 busiestDay,
} from './activityHeatmap';
import { GoalItem, StatusType, PriorityType } from './types';
import type { TodoOccurrenceItem } from './api';

const baseEntity = {
 description: '',
 priority: PriorityType.MEDIUM,
};

const dayKeyOf = (d: Date) => {
 const x = new Date(d);
 x.setHours(0, 0, 0, 0);
 return x.toISOString();
};

const today = new Date();
today.setHours(12, 0, 0, 0);
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const twoDaysAgo = new Date(today);
twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

const routineOccurrence: TodoOccurrenceItem = {
 id: 'routine-today',
 date: today.toISOString().slice(0, 10),
 status: 'done',
 completed_at: today.toISOString(),
 todo_id: 'todo-routine',
 created_at: today.toISOString(),
 updated_at: today.toISOString(),
 todo_title: 'Daily routine',
};

const sampleGoal: GoalItem = {
 ...baseEntity,
 id: 'g',
 title: 'Goal',
 status: StatusType.IN_PROGRESS,
 milestones: [
 {
 ...baseEntity,
 id: 'm',
 title: 'Milestone',
 status: StatusType.IN_PROGRESS,
 goal_id: 'g',
 tasks: [
 {
 ...baseEntity,
 id: 't1',
 title: 'Task 1',
 status: StatusType.FINISHED,
 end_datetime: today.toISOString(),
 milestone_id: 'm',
 subtasks: [],
 todos: [],
 },
 {
 ...baseEntity,
 id: 't2',
 title: 'Task 2',
 status: StatusType.FINISHED,
 end_datetime: today.toISOString(),
 milestone_id: 'm',
 subtasks: [],
 todos: [],
 },
 {
 ...baseEntity,
 id: 't3',
 title: 'Task 3',
 status: StatusType.FINISHED,
 end_datetime: yesterday.toISOString(),
 milestone_id: 'm',
 subtasks: [],
 todos: [],
 },
 ],
 },
 ],
};

describe('buildActivityCounts', () => {
 it('counts finished entities by date', () => {
 const counts = buildActivityCounts([sampleGoal]);
 const todayKey = today.toISOString().slice(0, 10);
 expect(counts.get(todayKey)?.count).toBe(2);
 });

 it('breaks down by entity kind', () => {
 const counts = buildActivityCounts([sampleGoal]);
 const todayKey = today.toISOString().slice(0, 10);
 expect(counts.get(todayKey)?.byKind.Task).toBe(2);
 });

 it('skips entities without end_datetime', () => {
 const goal: GoalItem = {
 ...baseEntity,
 id: 'g',
 title: 'g',
 status: StatusType.FINISHED,
 milestones: [],
 };
 const counts = buildActivityCounts([goal]);
 expect(counts.size).toBe(0);
 });

 it('adds completed routine occurrences to the same daily bucket', () => {
 const counts = buildActivityCounts([sampleGoal], [routineOccurrence]);
 const todayKey = today.toISOString().slice(0, 10);
 expect(counts.get(todayKey)?.count).toBe(3);
 expect(counts.get(todayKey)?.byKind.Routine).toBe(1);
 });
});

describe('buildHeatmapGrid', () => {
 it('produces N weeks × 7 days grid', () => {
 const grid = buildHeatmapGrid([sampleGoal], 5);
 expect(grid.weeks).toHaveLength(5);
 grid.weeks.forEach((week) => expect(week).toHaveLength(7));
 });

 it('total equals sum of finished entities in window', () => {
 const grid = buildHeatmapGrid([sampleGoal], 5);
 expect(grid.total).toBe(3);
 });

 it('max equals busiest single-day count', () => {
 const grid = buildHeatmapGrid([sampleGoal], 5);
 expect(grid.max).toBe(2);
 });
});

describe('longestStreak', () => {
 it('returns 0 for empty', () => {
 expect(longestStreak(new Map())).toBe(0);
 });

 it('counts consecutive days', () => {
 const map = new Map([
 ['2026-01-01', { count: 1, byKind: {} }],
 ['2026-01-02', { count: 1, byKind: {} }],
 ['2026-01-03', { count: 1, byKind: {} }],
 ['2026-01-05', { count: 1, byKind: {} }],
 ]);
 expect(longestStreak(map)).toBe(3);
 });
});

describe('currentStreak', () => {
 it('counts a completion on the current logical day', () => {
 const key = today.toISOString().slice(0, 10);
 expect(currentStreak(new Map([[key, { count: 1, byKind: { Routine: 1 } }]]))).toBe(1);
 });
});

describe('activeDays', () => {
 it('counts only days with completions', () => {
 const grid = buildHeatmapGrid([sampleGoal], 5);
 expect(activeDays(grid)).toBe(2); // today + yesterday
 });
});

describe('busiestDay', () => {
 it('returns the day with max count', () => {
 const grid = buildHeatmapGrid([sampleGoal], 5);
 const busy = busiestDay(grid);
 expect(busy?.count).toBe(2);
 });

 it('returns null when no completions', () => {
 expect(busiestDay({ weeks: [], total: 0, max: 0, monthLabels: [] })).toBeNull();
 });
});
