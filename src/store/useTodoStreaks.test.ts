import { describe, it, expect, beforeEach } from 'vitest';
import { getStreak, useTodoStreaks } from './useTodoStreaks';

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
 useTodoStreaks.setState({ completions: {} });
 });

 it('records a completion', () => {
 useTodoStreaks.getState().recordCompletion('t1');
 const completions = useTodoStreaks.getState().completions['t1'];
 expect(completions).toHaveLength(1);
 });

 it('does not duplicate same-day completion', () => {
 useTodoStreaks.getState().recordCompletion('t1');
 useTodoStreaks.getState().recordCompletion('t1');
 expect(useTodoStreaks.getState().completions['t1']).toHaveLength(1);
 });

 it('removes last completion', () => {
 useTodoStreaks.getState().recordCompletion('t1');
 useTodoStreaks.getState().removeLastCompletion('t1');
 expect(useTodoStreaks.getState().completions['t1']).toHaveLength(0);
 });
});
