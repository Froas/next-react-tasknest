import { CompletionRule } from '@/lib/types';

export type GoalCompletionMode = CompletionRule['type'];
export type GoalMetricDirection = 'increase' | 'decrease';
export type CompletionRuleScope = 'goal' | 'milestone' | 'task';

export interface GoalMeasurementDraft {
 mode: GoalCompletionMode;
 metricName: string;
 metricUnit: string;
 startValue: string;
 targetValue: string;
 direction: GoalMetricDirection;
 consistencyTodoId: string;
 consistencyLabel: string;
 requiredDone: string;
 windowDays: string;
}

export interface GoalMeasurementPreview {
 summary: string;
 condition: string;
}

const needsOutcome = (mode: GoalCompletionMode) => mode === 'metric_target' || mode === 'hybrid';
const needsConsistency = (mode: GoalCompletionMode) => mode === 'consistency' || mode === 'hybrid';

export function validateGoalMeasurement(draft: GoalMeasurementDraft): string | null {
 if (needsOutcome(draft.mode)) {
 const start = Number(draft.startValue);
 const target = Number(draft.targetValue);
 if (!draft.metricName.trim()) return 'Give the outcome metric a name.';
 if (!draft.startValue.trim() || !Number.isFinite(start)) return 'Enter a valid starting value.';
 if (!draft.targetValue.trim() || !Number.isFinite(target)) return 'Enter a valid target value.';
 if (start === target) return 'The starting value and target must be different.';
 if (draft.direction === 'decrease' && start < target) return 'A decrease target must be below the starting value.';
 if (draft.direction === 'increase' && start > target) return 'An increase target must be above the starting value.';
 }

 if (needsConsistency(draft.mode)) {
 const required = Number(draft.requiredDone);
 const windowDays = Number(draft.windowDays);
 if (!draft.consistencyTodoId) return 'Choose the repeating action this rule should count.';
 if (!Number.isInteger(required) || required < 1) return 'Required check-ins must be a positive whole number.';
 if (!Number.isInteger(windowDays) || windowDays < 1) return 'The time window must be a positive whole number.';
 }
 return null;
}

export function buildGoalCompletionRule(
 draft: GoalMeasurementDraft,
 metricDefinitionId?: string,
): CompletionRule {
 const outcome: Extract<CompletionRule, { type: 'metric_target' }> = {
 type: 'metric_target',
 metric_definition_id: metricDefinitionId,
 metric_name: draft.metricName.trim(),
 start_value: Number(draft.startValue),
 current_value: Number(draft.startValue),
 target_value: Number(draft.targetValue),
 direction: draft.direction,
 };
 const consistency: Extract<CompletionRule, { type: 'consistency' }> = {
 type: 'consistency',
 todo_id: draft.consistencyTodoId,
 label: draft.consistencyLabel.trim(),
 required_done: Number(draft.requiredDone),
 window_days: Number(draft.windowDays),
 };

 if (draft.mode === 'metric_target') return outcome;
 if (draft.mode === 'consistency') return consistency;
 if (draft.mode === 'hybrid') {
 return {
 type: 'hybrid',
 structural_weight: 20,
 outcome_weight: 50,
 consistency_weight: 30,
 outcome,
 consistency,
 };
 }
 return { type: 'structural' };
}

export function describeGoalMeasurement(
 draft: GoalMeasurementDraft,
 scope: CompletionRuleScope = 'goal',
): GoalMeasurementPreview {
 const metric = draft.metricName.trim() || 'Metric';
 const unit = draft.metricUnit.trim() ? ` ${draft.metricUnit.trim()}` : '';
 const start = draft.startValue.trim() || 'start';
 const target = draft.targetValue.trim() || 'target';
 const operator = draft.direction === 'decrease' ? '≤' : '≥';
 const outcomeSummary = `${metric}: ${start}${unit} → ${target}${unit}`;
 const outcomeCondition = `${metric} ${operator} ${target}${unit}`;
 const action = draft.consistencyLabel.trim() || 'Selected action';
 const required = draft.requiredDone.trim() || '—';
 const windowDays = draft.windowDays.trim() || '—';
 const checkInNoun = required === '1' ? 'check-in' : 'check-ins';

 if (draft.mode === 'metric_target') {
 return { summary: outcomeSummary, condition: `Complete when ${outcomeCondition}.` };
 }
 if (draft.mode === 'consistency') {
 return {
 summary: `${action}: ${required} ${checkInNoun} / ${windowDays} days`,
 condition: `Complete when ${action} is checked ${required} times within ${windowDays} days.`,
 };
 }
 if (draft.mode === 'hybrid') {
 return {
 summary: outcomeSummary,
 condition: `Complete when the plan is finished, ${outcomeCondition}, and ${action} is checked ${required} times within ${windowDays} days.`,
 };
 }
 if (scope === 'task') {
 return { summary: 'Plan: task steps', condition: 'Complete when every one-time step is finished.' };
 }
 if (scope === 'milestone') {
 return { summary: 'Plan: milestone tasks', condition: 'Complete when every project task in this milestone is finished.' };
 }
 return { summary: 'Plan: milestones and project tasks', condition: 'Complete when every milestone and goal-level project task is finished.' };
}

export const goalMeasurementNeedsMetric = needsOutcome;
