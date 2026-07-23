import { describe, expect, it } from 'vitest';
import { pickDefaultTodayGoalId, pickDefaultTodayScope } from './todayScope';

const groups = [
 { key: 'goal-a', goalId: 'goal-a' },
 { key: 'goal-b', goalId: 'goal-b' },
];

describe('pickDefaultTodayScope', () => {
 it('opens the most recently pinned available goal', () => {
 expect(pickDefaultTodayScope(groups, ['goal-a', 'goal-b'], 3)).toBe('goal-b');
 expect(pickDefaultTodayGoalId(groups, ['goal-a', 'goal-b'])).toBe('goal-b');
 });

 it('falls back to Focus when it contains routines', () => {
 expect(pickDefaultTodayScope(groups, [], 3)).toBe('focus');
 });

 it('opens All instead of an empty Focus', () => {
 expect(pickDefaultTodayScope(groups, [], 0)).toBe('all');
 });

 it('ignores pinned goals that are not present today', () => {
 expect(pickDefaultTodayScope(groups, ['missing-goal'], 0)).toBe('all');
 });
});
