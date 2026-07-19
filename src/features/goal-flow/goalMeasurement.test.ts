import { describe, expect, it } from 'vitest';
import { buildGoalCompletionRule, describeGoalMeasurement, GoalMeasurementDraft, validateGoalMeasurement } from './goalMeasurement';

const weightLossDraft: GoalMeasurementDraft = {
 mode: 'hybrid',
 metricName: 'Weight',
 metricUnit: 'kg',
 startValue: '110',
 targetValue: '80',
 direction: 'decrease',
 consistencyTodoId: 'calorie-deficit-todo',
 consistencyLabel: 'Stay below 2200 kcal',
 requiredDone: '6',
 windowDays: '7',
};

describe('goal measurement setup', () => {
 it('builds a hybrid rule with a stable metric and one selected recurring action', () => {
 const rule = buildGoalCompletionRule(weightLossDraft, 'weight-metric');
 expect(rule).toEqual({
 type: 'hybrid',
 structural_weight: 20,
 outcome_weight: 50,
 consistency_weight: 30,
 outcome: {
 type: 'metric_target',
 metric_definition_id: 'weight-metric',
 metric_name: 'Weight',
 start_value: 110,
 current_value: 110,
 target_value: 80,
 direction: 'decrease',
 },
 consistency: {
 type: 'consistency',
 todo_id: 'calorie-deficit-todo',
 label: 'Stay below 2200 kcal',
 required_done: 6,
 window_days: 7,
 },
 });
 });

 it('rejects a decreasing target above the starting value', () => {
 expect(validateGoalMeasurement({ ...weightLossDraft, targetValue: '120' }))
 .toBe('A decrease target must be below the starting value.');
 });

 it('keeps plan-only completion valid without extra fields', () => {
 expect(validateGoalMeasurement({
 ...weightLossDraft,
 mode: 'structural',
 metricName: '',
 startValue: '',
 targetValue: '',
 consistencyTodoId: '',
 })).toBeNull();
 expect(buildGoalCompletionRule({ ...weightLossDraft, mode: 'structural' })).toEqual({ type: 'structural' });
 });

 it('describes a metric rule in plain language', () => {
 expect(describeGoalMeasurement({ ...weightLossDraft, mode: 'metric_target' })).toEqual({
 summary: 'Weight: 110 kg → 80 kg',
 condition: 'Complete when Weight ≤ 80 kg.',
 });
 });

 it('describes every condition in a hybrid rule', () => {
 expect(describeGoalMeasurement(weightLossDraft)).toEqual({
 summary: 'Weight: 110 kg → 80 kg',
 condition: 'Complete when the plan is finished, Weight ≤ 80 kg, and Stay below 2200 kcal is checked 6 times within 7 days.',
 });
 });

 it('describes structural defaults at milestone and task scope', () => {
 const structural = { ...weightLossDraft, mode: 'structural' as const };
 expect(describeGoalMeasurement(structural, 'milestone').condition)
 .toBe('Complete when every project task in this milestone is finished.');
 expect(describeGoalMeasurement(structural, 'task').condition)
 .toBe('Complete when every one-time step is finished.');
 });
});
