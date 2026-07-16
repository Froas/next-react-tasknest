'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, GitMerge } from 'lucide-react';
import { AuthRequiredError, MetricDefinitionItem, goalsApi, metricDefinitionsApi, milestonesApi, tasksApi } from '@/lib/api';
import { CompletionRule, GoalItem, MilestoneItem, StatusType, TaskItem } from '@/lib/types';
import { toast } from '@/store/useToast';

type RuleType = CompletionRule['type'];
type MetricRule = Extract<CompletionRule, { type: 'metric_target' }>;
type ConsistencyRule = Extract<CompletionRule, { type: 'consistency' }>;

type CompletionRuleEntity = GoalItem | MilestoneItem | TaskItem;
type CompletionRuleEntityType = 'goal' | 'milestone' | 'task';

interface CompletionRulePanelProps {
 entity: CompletionRuleEntity;
 entityType: CompletionRuleEntityType;
 onSaved: (entity: CompletionRuleEntity) => void;
 metricTaskIds?: string[];
}

const numericText = (value: number | undefined) => value === undefined ? '' : String(value);
const EMPTY_TASK_IDS: string[] = [];

export const CompletionRulePanel: React.FC<CompletionRulePanelProps> = ({ entity, entityType, onSaved, metricTaskIds = EMPTY_TASK_IDS }) => {
 const currentRule = entity.completion_rule ?? { type: 'structural' as const };
 const currentOutcome = currentRule.type === 'metric_target'
 ? currentRule
 : currentRule.type === 'hybrid'
 ? currentRule.outcome
 : undefined;
 const currentConsistency = currentRule.type === 'consistency'
 ? currentRule
 : currentRule.type === 'hybrid'
 ? currentRule.consistency
 : undefined;
 const [ruleType, setRuleType] = useState<RuleType>(currentRule.type);
 const [metrics, setMetrics] = useState<MetricDefinitionItem[]>([]);
 const [metricName, setMetricName] = useState(currentOutcome?.metric_name ?? '');
 const [startValue, setStartValue] = useState(numericText(currentOutcome?.start_value));
 const [targetValue, setTargetValue] = useState(numericText(currentOutcome?.target_value));
 const [direction, setDirection] = useState<NonNullable<MetricRule['direction']>>(currentOutcome?.direction ?? 'at_least');
 const [requiredDone, setRequiredDone] = useState(numericText(currentConsistency?.required_done ?? 7));
 const [windowDays, setWindowDays] = useState(numericText(currentConsistency?.window_days ?? 7));
 const [structuralWeight, setStructuralWeight] = useState(numericText(currentRule.type === 'hybrid' ? currentRule.structural_weight ?? 20 : 20));
 const [outcomeWeight, setOutcomeWeight] = useState(numericText(currentRule.type === 'hybrid' ? currentRule.outcome_weight ?? 40 : 40));
 const [consistencyWeight, setConsistencyWeight] = useState(numericText(currentRule.type === 'hybrid' ? currentRule.consistency_weight ?? 40 : 40));
 const [saving, setSaving] = useState(false);

 useEffect(() => {
 let cancelled = false;
 void metricDefinitionsApi.getAll()
 .then((rows) => {
 if (cancelled) return;
 const taskIds = new Set(metricTaskIds);
 setMetrics(rows.filter((metric) => {
 if (entityType === 'goal') return metric.goal_id === entity.id;
 if (entityType === 'task') return metric.task_id === entity.id;
 return Boolean(metric.task_id && taskIds.has(metric.task_id));
 }));
 })
 .catch((error) => {
 if (error instanceof AuthRequiredError) return;
 console.error('Failed to load completion-rule metrics:', error);
 });
 return () => {
 cancelled = true;
 };
 }, [entity.id, entityType, metricTaskIds]);

 const metricOptions = useMemo(
 () => Array.from(new Set(metrics.map((metric) => metric.name))).sort((a, b) => a.localeCompare(b)),
 [metrics],
 );

 const buildMetricRule = (): MetricRule => ({
 type: 'metric_target',
 metric_name: metricName.trim(),
 ...(startValue.trim() ? { start_value: Number(startValue) } : {}),
 ...(targetValue.trim() ? { target_value: Number(targetValue) } : {}),
 direction,
 });

 const buildConsistencyRule = (): ConsistencyRule => ({
 type: 'consistency',
 required_done: Math.max(1, Number(requiredDone) || 1),
 window_days: Math.max(1, Number(windowDays) || 7),
 });

 const saveRule = async () => {
 if ((ruleType === 'metric_target' || ruleType === 'hybrid') && (!metricName.trim() || !targetValue.trim())) {
 toast.error('Choose a metric and target value');
 return;
 }
 let completionRule: CompletionRule;
 if (ruleType === 'metric_target') completionRule = buildMetricRule();
 else if (ruleType === 'consistency') completionRule = buildConsistencyRule();
 else if (ruleType === 'hybrid') {
 completionRule = {
 type: 'hybrid',
 structural_weight: Math.max(0, Number(structuralWeight) || 0),
 outcome_weight: Math.max(0, Number(outcomeWeight) || 0),
 consistency_weight: Math.max(0, Number(consistencyWeight) || 0),
 outcome: buildMetricRule(),
 consistency: buildConsistencyRule(),
 };
 } else completionRule = { type: 'structural' };

 setSaving(true);
 try {
 const updated = entityType === 'goal'
 ? await goalsApi.update({ id: entity.id, completion_rule: completionRule })
 : entityType === 'milestone'
 ? await milestonesApi.update({ id: entity.id, completion_rule: completionRule })
 : await tasksApi.update({ id: entity.id, completion_rule: completionRule });
 onSaved(updated);
 toast.success(`${entityType[0].toUpperCase()}${entityType.slice(1)} completion rule saved`);
 } catch (error) {
 console.error('Failed to save completion rule:', error);
 toast.error('Failed to save completion rule');
 } finally {
 setSaving(false);
 }
 };

 const showOutcome = ruleType === 'metric_target' || ruleType === 'hybrid';
 const showConsistency = ruleType === 'consistency' || ruleType === 'hybrid';

 return (
 <section className="mb-6 rounded-2xl border p-4" style={{ border: 'var(--tn-line)', background: 'var(--tn-card)' }}>
 <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
 <div className="flex items-start gap-2">
 <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: 'var(--tn-hover)', color: 'var(--tn-accent)' }}>
 <GitMerge className="h-4 w-4" />
 </span>
 <div>
 <h3 className="text-sm font-semibold text-foreground">Completion rule</h3>
 <p className="text-xs text-muted-foreground">Controls automatic completion and the three progress lanes.</p>
 </div>
 </div>
 {entity.status === StatusType.FINISHED && (
 <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--tn-good, #2f7d50)' }}>
 <CheckCircle2 className="h-3.5 w-3.5" /> Finished
 </span>
 )}
 </div>

 <div className="grid max-w-5xl min-w-0 gap-3 md:grid-cols-[minmax(180px,240px)_minmax(0,1fr)] md:items-center">
 <select value={ruleType} onChange={(event) => setRuleType(event.target.value as RuleType)} className="filter-input h-10 min-h-10 w-full min-w-0 self-start">
 <option value="structural">Structural</option>
 <option value="metric_target">Outcome metric</option>
 <option value="consistency">Consistency</option>
 <option value="hybrid">Hybrid</option>
 </select>
 <p className="self-center text-xs text-muted-foreground">
 {ruleType === 'structural' && 'Complete when structural project work is finished.'}
 {ruleType === 'metric_target' && 'Complete when the selected metric reaches its target.'}
 {ruleType === 'consistency' && 'Complete after enough routine occurrences inside the time window.'}
 {ruleType === 'hybrid' && 'Complete only when the weighted structural, outcome, and consistency lanes reach 100%.'}
 </p>
 </div>

 {showOutcome && (
 <div className="mt-4 grid max-w-5xl min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
 <label className="grid min-w-0 content-start gap-1.5 text-xs text-muted-foreground">
 Metric
 <select value={metricName} onChange={(event) => setMetricName(event.target.value)} className="filter-input h-10 min-h-10 w-full min-w-0 self-start">
 <option value="">Choose metric</option>
 {metricOptions.map((name) => <option key={name} value={name}>{name}</option>)}
 </select>
 </label>
 <label className="grid min-w-0 content-start gap-1.5 text-xs text-muted-foreground">
 Start
 <input type="number" value={startValue} onChange={(event) => setStartValue(event.target.value)} className="filter-input h-10 min-h-10 w-full min-w-0 self-start" />
 </label>
 <label className="grid min-w-0 content-start gap-1.5 text-xs text-muted-foreground">
 Target
 <input type="number" value={targetValue} onChange={(event) => setTargetValue(event.target.value)} className="filter-input h-10 min-h-10 w-full min-w-0 self-start" />
 </label>
 <label className="grid min-w-0 content-start gap-1.5 text-xs text-muted-foreground">
 Direction
 <select value={direction} onChange={(event) => setDirection(event.target.value as NonNullable<MetricRule['direction']>)} className="filter-input h-10 min-h-10 w-full min-w-0 self-start">
 <option value="at_least">At least</option>
 <option value="at_most">At most</option>
 <option value="increase">Increase</option>
 <option value="decrease">Decrease</option>
 </select>
 </label>
 </div>
 )}

 {showConsistency && (
 <div className="mt-4 grid max-w-3xl min-w-0 gap-3 sm:grid-cols-2">
 <label className="grid min-w-0 content-start gap-1.5 text-xs text-muted-foreground">
 Required completed occurrences
 <input type="number" min="1" value={requiredDone} onChange={(event) => setRequiredDone(event.target.value)} className="filter-input h-10 min-h-10 w-full min-w-0 self-start" />
 </label>
 <label className="grid min-w-0 content-start gap-1.5 text-xs text-muted-foreground">
 Window in days
 <input type="number" min="1" value={windowDays} onChange={(event) => setWindowDays(event.target.value)} className="filter-input h-10 min-h-10 w-full min-w-0 self-start" />
 </label>
 </div>
 )}

 {ruleType === 'hybrid' && (
 <div className="mt-4 grid max-w-3xl min-w-0 gap-3 sm:grid-cols-3">
 {[
 ['Structural weight', structuralWeight, setStructuralWeight],
 ['Outcome weight', outcomeWeight, setOutcomeWeight],
 ['Consistency weight', consistencyWeight, setConsistencyWeight],
 ].map(([label, value, setter]) => (
 <label key={label as string} className="grid min-w-0 content-start gap-1.5 text-xs text-muted-foreground">
 {label as string}
 <input
 type="number"
 min="0"
 value={value as string}
 onChange={(event) => (setter as React.Dispatch<React.SetStateAction<string>>)(event.target.value)}
 className="filter-input h-10 min-h-10 w-full min-w-0 self-start"
 />
 </label>
 ))}
 </div>
 )}

 <div className="mt-4 flex max-w-5xl justify-end border-t pt-4" style={{ borderColor: 'var(--tn-line)' }}>
 <button type="button" onClick={saveRule} disabled={saving} className="btn btn-primary justify-center disabled:opacity-50">
 {saving ? 'Saving…' : 'Save rule'}
 </button>
 </div>
 </section>
 );
};

interface GoalCompletionRulePanelProps {
 goal: GoalItem;
 onSaved: (goal: GoalItem) => void;
}

export const GoalCompletionRulePanel: React.FC<GoalCompletionRulePanelProps> = ({ goal, onSaved }) => (
 <CompletionRulePanel
 entity={goal}
 entityType="goal"
 onSaved={(entity) => onSaved(entity as GoalItem)}
 />
);
