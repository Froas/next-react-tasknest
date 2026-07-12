import { describe, expect, it } from 'vitest';
import { isMilestoneEffectivelyFinished, isMilestoneLocked } from './milestoneGating';
import { MilestoneItem, PriorityType, StatusType } from './types';

const milestone = (id: string, status: StatusType, completionRule?: MilestoneItem['completion_rule']): MilestoneItem => ({
 id,
 title: id,
 description: '',
 priority: PriorityType.MEDIUM,
 status,
 completion_rule: completionRule,
 tasks: [],
});

describe('milestone sequential gating', () => {
 it('does not lock milestones when free order is enabled', () => {
 const rows = [milestone('one', StatusType.OUTSTANDING), milestone('two', StatusType.OUTSTANDING)];
 expect(isMilestoneLocked(rows, 1, false)).toBe(false);
 });

 it('locks the next milestone until every previous milestone is persisted as complete', () => {
 const rows = [milestone('one', StatusType.IN_PROGRESS), milestone('two', StatusType.OUTSTANDING)];
 expect(isMilestoneLocked(rows, 1, true)).toBe(true);
 rows[0] = milestone('one', StatusType.FINISHED);
 expect(isMilestoneLocked(rows, 1, true)).toBe(false);
 });

 it('treats closed milestones as complete', () => {
 expect(isMilestoneEffectivelyFinished(milestone('closed', StatusType.CLOSED))).toBe(true);
 });

 it('does not bypass an outcome rule merely because structural work is empty', () => {
 const outcome = milestone('outcome', StatusType.IN_PROGRESS, {
 type: 'metric_target',
 metric_name: 'Weight',
 current_value: 95,
 target_value: 90,
 direction: 'at_most',
 });
 expect(isMilestoneEffectivelyFinished(outcome)).toBe(false);
 });
});
