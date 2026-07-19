'use client';

import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { Check, Gauge, GitMerge, ListChecks, Repeat2, Target, TrendingUp, type LucideIcon } from 'lucide-react';
import { CompletionRuleScope, describeGoalMeasurement, GoalMeasurementDraft, GoalCompletionMode } from '@/features/goal-flow/goalMeasurement';
import { CompletionRule } from '@/lib/types';
import styles from './GoalCreationFlow.module.css';

export interface GoalFlowRecurringAction {
 id: string;
 title: string;
 repeatInterval?: string;
 routineTitle: string;
}

interface CompletionRuleSetupProps {
 completionRule?: CompletionRule | null;
 initialMetricUnit?: string;
 recurringActions: GoalFlowRecurringAction[];
 onSave: (draft: GoalMeasurementDraft) => Promise<void>;
 scope: CompletionRuleScope;
 compact?: boolean;
}

const POLICIES: Array<{
 mode: GoalCompletionMode;
 title: string;
 description: string;
 icon: LucideIcon;
}> = [
 { mode: 'structural', title: 'Plan complete', description: 'Every milestone and project task is finished.', icon: ListChecks },
 { mode: 'metric_target', title: 'Target reached', description: 'A number reaches a clear outcome target.', icon: TrendingUp },
 { mode: 'consistency', title: 'Consistency', description: 'One repeating action is completed often enough.', icon: Repeat2 },
 { mode: 'hybrid', title: 'Hybrid', description: 'Plan, outcome and consistency all matter.', icon: GitMerge },
];

const outcomeFromRule = (rule?: CompletionRule | null) => (
 rule?.type === 'metric_target' ? rule : rule?.type === 'hybrid' ? rule.outcome : undefined
);

const consistencyFromRule = (rule?: CompletionRule | null) => (
 rule?.type === 'consistency' ? rule : rule?.type === 'hybrid' ? rule.consistency : undefined
);

export function CompletionRuleSetup({
 completionRule,
 initialMetricUnit,
 recurringActions,
 onSave,
 scope,
 compact = false,
}: CompletionRuleSetupProps) {
 const outcome = outcomeFromRule(completionRule);
 const consistency = consistencyFromRule(completionRule);
 const [mode, setMode] = useState<GoalCompletionMode>(completionRule?.type ?? 'structural');
 const [metricName, setMetricName] = useState(outcome?.metric_name ?? '');
 const [metricUnit, setMetricUnit] = useState(initialMetricUnit ?? '');
 const [startValue, setStartValue] = useState(outcome?.start_value === undefined ? '' : String(outcome.start_value));
 const [targetValue, setTargetValue] = useState(outcome?.target_value === undefined ? '' : String(outcome.target_value));
 const [direction, setDirection] = useState<'increase' | 'decrease'>(
 outcome?.direction === 'increase' || outcome?.direction === 'at_least' ? 'increase' : 'decrease',
 );
 const [consistencyTodoId, setConsistencyTodoId] = useState(consistency?.todo_id ?? '');
 const [requiredDone, setRequiredDone] = useState(String(consistency?.required_done ?? 6));
 const [windowDays, setWindowDays] = useState(String(consistency?.window_days ?? 7));
 const [busy, setBusy] = useState(false);
 const [saved, setSaved] = useState(Boolean(completionRule));
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 if (!consistencyTodoId && recurringActions.length === 1) setConsistencyTodoId(recurringActions[0].id);
 }, [consistencyTodoId, recurringActions]);

 useEffect(() => {
 if (initialMetricUnit) setMetricUnit((current) => current || initialMetricUnit);
 }, [initialMetricUnit]);

 const selectedAction = useMemo(
 () => recurringActions.find((action) => action.id === consistencyTodoId),
 [consistencyTodoId, recurringActions],
 );
 const showOutcome = mode === 'metric_target' || mode === 'hybrid';
 const showConsistency = mode === 'consistency' || mode === 'hybrid';
 const preview = describeGoalMeasurement({
 mode,
 metricName,
 metricUnit,
 startValue,
 targetValue,
 direction,
 consistencyTodoId,
 consistencyLabel: selectedAction?.title ?? '',
 requiredDone,
 windowDays,
 }, scope);
 const scopeLabel = `${scope[0].toUpperCase()}${scope.slice(1)}`;

 const selectMode = (nextMode: GoalCompletionMode) => {
 setMode(nextMode);
 setSaved(false);
 setError(null);
 };

 const submit = async (event: FormEvent) => {
 event.preventDefault();
 if (busy) return;
 setBusy(true);
 setError(null);
 try {
 await onSave({
 mode,
 metricName,
 metricUnit,
 startValue,
 targetValue,
 direction,
 consistencyTodoId,
 consistencyLabel: selectedAction?.title ?? '',
 requiredDone,
 windowDays,
 });
 setSaved(true);
 } catch (cause) {
 setSaved(false);
 setError(cause instanceof Error ? cause.message : 'Could not save the completion rule.');
 } finally {
 setBusy(false);
 }
 };

 return (
 <section className={compact ? styles.inlineMeasure : styles.measureLane}>
 {!compact && <div className={styles.measureIcon}><Gauge size={19} /></div>}
 {!compact && <div className={styles.sectionIntro}>
 <span className={styles.kicker}>Goal completion</span>
 <h2>How will TaskNest know this goal is done?</h2>
 <p>Choose one completion policy. You can keep the default now and refine it later.</p>
 </div>}

 <form onSubmit={submit}>
 <div className={styles.policyGrid} role="radiogroup" aria-label={`${scopeLabel} completion policy`}>
 {POLICIES.map((policy) => {
 const Icon = policy.icon;
 const unavailable = (policy.mode === 'consistency' || policy.mode === 'hybrid') && recurringActions.length === 0;
 return (
 <button
 key={policy.mode}
 type="button"
 role="radio"
 aria-checked={mode === policy.mode}
 disabled={unavailable}
 className={`${styles.policyCard} ${mode === policy.mode ? styles.policyCardActive : ''}`}
 onClick={() => selectMode(policy.mode)}
 >
 <span className={styles.policyIcon}><Icon size={17} /></span>
 <strong>{policy.title}</strong>
 <small>{policy.description}</small>
 {policy.mode === 'hybrid' && <em>Best for outcome goals</em>}
 </button>
 );
 })}
 </div>

 {recurringActions.length === 0 && (
 <p className={styles.measureHint}>Add a repeating action in System to unlock Consistency and Hybrid.</p>
 )}

 {(showOutcome || showConsistency) && (
 <div className={styles.ruleBuilder}>
 {showOutcome && (
 <section className={styles.ruleGroup}>
 <div className={styles.ruleGroupHeader}>
 <h3>Outcome metric</h3>
 <p>This creates a numeric metric on Today and uses its latest value for progress.</p>
 </div>
 <div className={styles.metricFields}>
 <label><span>Metric</span><input value={metricName} onChange={(event) => setMetricName(event.target.value)} placeholder="e.g. Weight" /></label>
 <label><span>Unit</span><input value={metricUnit} onChange={(event) => setMetricUnit(event.target.value)} placeholder="e.g. kg" /></label>
 <label><span>Start</span><input type="number" step="any" value={startValue} onChange={(event) => setStartValue(event.target.value)} placeholder="e.g. 110" /></label>
 <label><span>Target</span><input type="number" step="any" value={targetValue} onChange={(event) => setTargetValue(event.target.value)} placeholder="e.g. 80" /></label>
 <label>
 <span>Direction</span>
 <select value={direction} onChange={(event) => setDirection(event.target.value as 'increase' | 'decrease')}>
 <option value="decrease">Decrease to target</option>
 <option value="increase">Increase to target</option>
 </select>
 </label>
 </div>
 </section>
 )}

 {showConsistency && (
 <section className={styles.ruleGroup}>
 <div className={styles.ruleGroupHeader}>
 <h3>Execution rule</h3>
 <p>Count only one selected action, so unrelated routine check-ins cannot complete this {scope}.</p>
 </div>
 <div className={styles.consistencyFields}>
 <label>
 <span>Repeating action</span>
 <select value={consistencyTodoId} onChange={(event) => setConsistencyTodoId(event.target.value)}>
 <option value="">Choose an action</option>
 {recurringActions.map((action) => (
 <option key={action.id} value={action.id}>{action.title} · {action.routineTitle}</option>
 ))}
 </select>
 </label>
 <label><span>Required check-ins</span><input type="number" min="1" step="1" value={requiredDone} onChange={(event) => setRequiredDone(event.target.value)} /></label>
 <label><span>Within days</span><input type="number" min="1" step="1" value={windowDays} onChange={(event) => setWindowDays(event.target.value)} /></label>
 </div>
 </section>
 )}
 </div>
 )}

 <div className={styles.completionPreview} aria-live="polite">
 <div className={styles.completionPreviewHeader}>
 <span>Rule preview</span>
 <span className={styles.ruleScope}><Target size={12} /> Applies to {scopeLabel}</span>
 </div>
 <strong>{preview.summary}</strong>
 <p>{preview.condition}</p>
 </div>

 {error && <p className={styles.error}>{error}</p>}
 <div className={styles.measureActions}>
 {saved && <span><Check size={14} /> Rule saved</span>}
 <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save completion rule'}</button>
 </div>
 </form>
 </section>
 );
}

export function GoalMeasureSetup(props: Omit<CompletionRuleSetupProps, 'scope' | 'compact'>) {
 return <CompletionRuleSetup {...props} scope="goal" />;
}
