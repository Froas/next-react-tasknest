import { describe, it, expect } from 'vitest';
import { priorityWeight, USER_FACING_STATUSES, STATUS_LABELS } from './sort';
import { PriorityType, StatusType } from './types';

describe('priorityWeight', () => {
 it('orders high > medium > low', () => {
 expect(priorityWeight(PriorityType.HIGH)).toBeGreaterThan(priorityWeight(PriorityType.MEDIUM));
 expect(priorityWeight(PriorityType.MEDIUM)).toBeGreaterThan(priorityWeight(PriorityType.LOW));
 });

 it('returns -1 for missing/unknown values', () => {
 expect(priorityWeight(undefined)).toBe(-1);
 expect(priorityWeight('whatever')).toBe(-1);
 });
});

describe('USER_FACING_STATUSES', () => {
 it('includes only the 4 user-relevant statuses', () => {
 expect(USER_FACING_STATUSES).toEqual([
 StatusType.OUTSTANDING,
 StatusType.IN_PROGRESS,
 StatusType.FINISHED,
 StatusType.CANCELLED,
 ]);
 });

 it('every status has a label', () => {
 Object.values(StatusType).forEach((s) => {
 expect(STATUS_LABELS[s]).toBeTruthy();
 });
 });
});
