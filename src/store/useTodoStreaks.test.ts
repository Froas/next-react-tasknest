import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getStreak, useTodoStreaks } from './useTodoStreaks';
import { todoOccurrencesApi } from '@/lib/api';

const dateKey = (d: Date) => {
 const y = d.getFullYear();
 const m = String(d.getMonth() + 1).padStart(2, '0');
 const day = String(d.getDate()).padStart(2, '0');
 return `${y}-${m}-${day}`;
};

const today = () => {
 const d = new Date();
 d.setHours(0, 0, 0, 0);
 return d;
};

const daysAgo = (n: number) => {
 const d = today();
 d.setDate(d.getDate() - n);
 return d;
};

describe('getStreak', () => {
 it('returns 0 for empty', () => {
 expect(getStreak([])).toBe(0);
 });

 it('counts consecutive days ending today', () => {
 expect(getStreak([dateKey(today()), dateKey(daysAgo(1)), dateKey(daysAgo(2))])).toBe(3);
 });

 it('1-day grace window: yesterday alone counts as streak 1', () => {
 expect(getStreak([dateKey(daysAgo(1))])).toBe(1);
 });

 it('breaks streak on gap', () => {
 expect(getStreak([dateKey(today()), dateKey(daysAgo(2))])).toBe(1);
 });

 it('returns 0 when last completion is older than yesterday', () => {
 expect(getStreak([dateKey(daysAgo(3))])).toBe(0);
 });
});

describe('useTodoStreaks store', () => {
 beforeEach(() => {
 useTodoStreaks.setState({ completions: {}, hydrated: false, loading: false });
 vi.restoreAllMocks();
 });

 it('hydrates completion dates from backend occurrences without duplicates', async () => {
 vi.spyOn(todoOccurrencesApi, 'history').mockResolvedValue([
 { id: 'o1', todo_id: 't1', date: '2026-07-14', status: 'done', created_at: '', updated_at: '', todo_title: 'One' },
 { id: 'o2', todo_id: 't1', date: '2026-07-14', status: 'minimum', created_at: '', updated_at: '', todo_title: 'One' },
 { id: 'o3', todo_id: 't1', date: '2026-07-15', status: 'done', created_at: '', updated_at: '', todo_title: 'One' },
 ]);

 await useTodoStreaks.getState().hydrate(true);

 expect(useTodoStreaks.getState().completions).toEqual({
 t1: ['2026-07-14', '2026-07-15'],
 });
 expect(useTodoStreaks.getState().hydrated).toBe(true);
 });
});
