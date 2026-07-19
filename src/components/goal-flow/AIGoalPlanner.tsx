'use client';

import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
 ArrowLeft,
 ArrowRight,
 Check,
 Gauge,
 ListChecks,
 Repeat2,
 RotateCcw,
 Save,
 Sparkles,
 Target,
 Trash2,
} from 'lucide-react';
import {
 aiGoalPlansApi,
 templatesApi,
 type AIGoalDraft,
 type AIGoalPlannerConfig,
 type AIGoalQuestion,
 type TemplateBlueprint,
 type TemplateBlueprintMilestone,
 type TemplateBlueprintTask,
 type TemplateBlueprintTodo,
} from '@/lib/api';
import type { CompletionRule } from '@/lib/types';
import {
 clearAIGoalDraftState,
 loadAIGoalDraftState,
 saveAIGoalDraftState,
} from '@/features/goal-flow/aiGoalDraftStorage';
import { toast } from '@/store/useToast';
import styles from './AIGoalPlanner.module.css';

type PlannerStage = 'brief' | 'questions' | 'preview';

const updateAt = <T,>(items: T[], index: number, value: T) =>
 items.map((item, itemIndex) => (itemIndex === index ? value : item));

export function AIGoalPlanner({ onBack }: { onBack: () => void }) {
 const router = useRouter();
 const [config, setConfig] = useState<AIGoalPlannerConfig | null>(null);
 const [stage, setStage] = useState<PlannerStage>('brief');
 const [intent, setIntent] = useState('');
 const [questions, setQuestions] = useState<AIGoalQuestion[]>([]);
 const [answers, setAnswers] = useState<Record<string, string>>({});
 const [resolvedAnswers, setResolvedAnswers] = useState<Array<{ question_id: string; question: string; value: string }>>([]);
 const [draft, setDraft] = useState<AIGoalDraft | null>(null);
 const [assumptions, setAssumptions] = useState<string[]>([]);
 const [loading, setLoading] = useState(false);
 const [savingTemplate, setSavingTemplate] = useState(false);
 const [creatingGoal, setCreatingGoal] = useState(false);
 const [regeneratingMilestone, setRegeneratingMilestone] = useState<number | null>(null);
 const [storageHydrated, setStorageHydrated] = useState(false);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 let cancelled = false;
 void aiGoalPlansApi.getConfig()
 .then((result) => {
 if (!cancelled) setConfig(result);
 })
 .catch((cause) => {
 if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load AI planning');
 });
 return () => { cancelled = true; };
 }, []);

 useEffect(() => {
 const restored = loadAIGoalDraftState();
 if (restored) {
 setStage(restored.stage);
 setIntent(restored.intent);
 setQuestions(restored.questions);
 setAnswers(restored.answers);
 setResolvedAnswers(restored.resolvedAnswers);
 setDraft(restored.draft);
 setAssumptions(restored.assumptions);
 }
 setStorageHydrated(true);
 }, []);

 useEffect(() => {
 if (!storageHydrated) return;
 saveAIGoalDraftState({
 stage,
 intent,
 questions,
 answers,
 resolvedAnswers,
 draft,
 assumptions,
 });
 }, [answers, assumptions, draft, intent, questions, resolvedAnswers, stage, storageHydrated]);

 const refreshConfig = async () => {
 try {
 setConfig(await aiGoalPlansApi.getConfig());
 } catch {
 // A quota refresh must never hide a plan that was already generated.
 }
 };

 const allowanceExhausted = config?.allowance?.remaining === 0;
 const resetDate = config?.allowance?.resets_at ? new Date(config.allowance.resets_at) : null;
 const resetLabel = resetDate && !Number.isNaN(resetDate.getTime())
 ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(resetDate)
 : 'next month';
 const allowanceLabel = config?.allowance
 ? config.allowance.remaining === null
 ? `${config.allowance.used} AI requests used · no monthly limit`
 : config.allowance.remaining === 0
 ? `Monthly AI allowance used · resets ${resetLabel}`
 : `${config.allowance.remaining} of ${config.allowance.limit} AI requests left this month`
 : null;

 const blueprint = draft?.blueprint;
 const milestones = useMemo(() => blueprint?.milestones ?? [], [blueprint]);
 const routines = useMemo(
 () => (blueprint?.goal_tasks ?? []).filter((task) => task.kind === 'routine'),
 [blueprint],
 );
 const outcomeRule = blueprint?.completion_rule?.type === 'metric_target'
 ? blueprint.completion_rule
 : blueprint?.completion_rule?.type === 'hybrid'
 ? blueprint.completion_rule.outcome
 : undefined;
 const metric = (blueprint?.metrics ?? []).find((item) => (
 item.name.trim().toLocaleLowerCase() === outcomeRule?.metric_name?.trim().toLocaleLowerCase()
 )) ?? blueprint?.metrics?.[0];

 const runGeneration = async (submittedAnswers = resolvedAnswers) => {
 if (intent.trim().length < 5 || loading || allowanceExhausted) return;
 setLoading(true);
 setError(null);
 try {
 const result = await aiGoalPlansApi.generate({
 intent: intent.trim(),
 answers: submittedAnswers,
 locale: 'en',
 });
 setAssumptions(result.assumptions);
 if (result.status === 'needs_clarification') {
 setQuestions(result.questions);
 setAnswers({});
 setStage('questions');
 return;
 }
 if (!result.draft) throw new Error('AI returned an empty plan');
 setDraft(result.draft);
 setStage('preview');
 } catch (cause) {
 setError(cause instanceof Error ? cause.message : 'Could not generate the plan');
 } finally {
 await refreshConfig();
 setLoading(false);
 }
 };

 const submitBrief = (event: FormEvent) => {
 event.preventDefault();
 void runGeneration([]);
 };

 const submitAnswers = (event: FormEvent) => {
 event.preventDefault();
 const currentAnswers = questions.map((question) => ({
 question_id: question.id,
 question: question.question,
 value: (answers[question.id] ?? '').trim(),
 }));
 if (currentAnswers.some((answer) => !answer.value)) {
 setError('Answer each question so the plan has a solid foundation.');
 return;
 }
 const currentIds = new Set(currentAnswers.map((answer) => answer.question_id));
 const submitted = [
 ...resolvedAnswers.filter((answer) => !currentIds.has(answer.question_id)),
 ...currentAnswers,
 ];
 setResolvedAnswers(submitted);
 void runGeneration(submitted);
 };

 const updateDraft = (patch: Partial<AIGoalDraft>) => {
 setDraft((current) => current ? { ...current, ...patch } : current);
 };

 const updateBlueprint = (patch: Partial<TemplateBlueprint>) => {
 setDraft((current) => current ? {
 ...current,
 blueprint: { ...current.blueprint, ...patch },
 } : current);
 };

 const updateOutcomeMetric = (patch: {
 name?: string;
 unit?: string;
 startValue?: number;
 targetValue?: number;
 direction?: 'increase' | 'decrease';
 }) => {
 if (!blueprint || !outcomeRule) return;
 const previousName = outcomeRule.metric_name ?? metric?.name ?? 'Metric';
 const nextName = patch.name ?? previousName;
 const nextStartValue = patch.startValue !== undefined && Number.isFinite(patch.startValue)
 ? patch.startValue
 : outcomeRule.start_value;
 const nextTargetValue = patch.targetValue !== undefined && Number.isFinite(patch.targetValue)
 ? patch.targetValue
 : outcomeRule.target_value;
 const nextOutcome: Extract<CompletionRule, { type: 'metric_target' }> = {
 ...outcomeRule,
 metric_name: nextName,
 start_value: nextStartValue,
 current_value: nextStartValue !== outcomeRule.start_value ? nextStartValue : outcomeRule.current_value,
 target_value: nextTargetValue,
 direction: patch.direction ?? outcomeRule.direction,
 };
 const completionRule: CompletionRule = blueprint.completion_rule?.type === 'hybrid'
 ? { ...blueprint.completion_rule, outcome: nextOutcome }
 : nextOutcome;
 const metrics = [...(blueprint.metrics ?? [])];
 const metricIndex = metrics.findIndex((item) => item.name.trim().toLocaleLowerCase() === previousName.trim().toLocaleLowerCase());
 const nextMetric = {
 ...(metricIndex >= 0 ? metrics[metricIndex] : { input_type: 'number' as const, show_on_today: true }),
 name: nextName,
 unit: patch.unit !== undefined ? patch.unit : metric?.unit,
 };
 if (metricIndex >= 0) metrics[metricIndex] = nextMetric;
 else metrics.push(nextMetric);
 updateBlueprint({ completion_rule: completionRule, metrics });
 };

 const setGoalCompletionMode = (mode: 'structural' | 'metric_target') => {
 if (mode === 'structural') {
 updateBlueprint({ completion_rule: { type: 'structural' }, metrics: [] });
 return;
 }
 const metricName = metric?.name || 'Progress';
 updateBlueprint({
 completion_rule: {
 type: 'metric_target',
 metric_name: metricName,
 start_value: 0,
 current_value: 0,
 target_value: 100,
 direction: 'increase',
 },
 metrics: [{
 name: metricName,
 unit: metric?.unit ?? '%',
 input_type: 'number',
 show_on_today: true,
 }],
 });
 };

 const updateSuccessCriteria = (value: string) => {
 setDraft((current) => current ? {
 ...current,
 success_criteria: value,
 blueprint: { ...current.blueprint, success_criteria: value },
 } : current);
 };

 const updateMilestone = (index: number, patch: Partial<TemplateBlueprintMilestone>) => {
 const current = milestones[index];
 if (!current) return;
 updateBlueprint({ milestones: updateAt(milestones, index, { ...current, ...patch }) });
 };

 const updateTask = (milestoneIndex: number, taskIndex: number, patch: Partial<TemplateBlueprintTask>) => {
 const milestone = milestones[milestoneIndex];
 const tasks = milestone?.tasks ?? [];
 const task = tasks[taskIndex];
 if (!milestone || !task) return;
 updateMilestone(milestoneIndex, { tasks: updateAt(tasks, taskIndex, { ...task, ...patch }) });
 };

 const removeTask = (milestoneIndex: number, taskIndex: number) => {
 const milestone = milestones[milestoneIndex];
 if (!milestone) return;
 updateMilestone(milestoneIndex, { tasks: (milestone.tasks ?? []).filter((_, index) => index !== taskIndex) });
 };

 const updateTaskSubtask = (milestoneIndex: number, taskIndex: number, subtaskIndex: number, title: string) => {
 const task = milestones[milestoneIndex]?.tasks?.[taskIndex];
 if (!task) return;
 const subtasks = task.subtasks ?? [];
 const subtask = subtasks[subtaskIndex];
 if (!subtask) return;
 updateTask(milestoneIndex, taskIndex, {
 subtasks: updateAt(subtasks, subtaskIndex, { ...subtask, title }),
 });
 };

 const updateTaskTodo = (
 milestoneIndex: number,
 taskIndex: number,
 todoIndex: number,
 patch: Partial<TemplateBlueprintTodo>,
 ) => {
 const task = milestones[milestoneIndex]?.tasks?.[taskIndex];
 if (!task) return;
 const todos = task.todos ?? [];
 const todo = todos[todoIndex];
 if (!todo) return;
 updateTask(milestoneIndex, taskIndex, {
 todos: updateAt(todos, todoIndex, { ...todo, ...patch }),
 });
 };

 const removeMilestone = (index: number) => {
 if (milestones.length <= 1) {
 setError('Keep at least one milestone in the plan.');
 return;
 }
 updateBlueprint({ milestones: milestones.filter((_, itemIndex) => itemIndex !== index) });
 };

 const regenerateMilestone = async (index: number) => {
 if (!draft || regeneratingMilestone !== null) return;
 setRegeneratingMilestone(index);
 setError(null);
 try {
 const result = await aiGoalPlansApi.refineMilestone({
 intent: intent.trim(),
 answers: resolvedAnswers,
 draft,
 milestone_index: index,
 locale: 'en',
 });
 updateMilestone(index, result.milestone);
 setAssumptions((current) => Array.from(new Set([...current, ...result.assumptions])).slice(0, 6));
 } catch (cause) {
 setError(cause instanceof Error ? cause.message : 'Could not regenerate the milestone');
 } finally {
 await refreshConfig();
 setRegeneratingMilestone(null);
 }
 };

 const updateRoutine = (routineIndex: number, patch: Partial<TemplateBlueprintTask>) => {
 const goalTasks = blueprint?.goal_tasks ?? [];
 let seen = -1;
 const next = goalTasks.map((task) => {
 if (task.kind !== 'routine') return task;
 seen += 1;
 if (seen !== routineIndex) return task;
 const title = patch.title ?? task.title;
 const todos = patch.todos ?? task.todos ?? [];
 return {
 ...task,
 ...patch,
 todos: todos.map((todo) => ({ ...todo, title })),
 };
 });
 updateBlueprint({ goal_tasks: next });
 };

 const removeRoutine = (routineIndex: number) => {
 let seen = -1;
 updateBlueprint({
 goal_tasks: (blueprint?.goal_tasks ?? []).filter((task) => {
 if (task.kind !== 'routine') return true;
 seen += 1;
 return seen !== routineIndex;
 }),
 });
 };

 const validateDraft = () => {
 if (!draft?.title.trim()) return 'Give the goal a title.';
 if (!draft.success_criteria.trim()) return 'Define how you will know the goal is done.';
 if (outcomeRule) {
 const start = Number(outcomeRule.start_value);
 const target = Number(outcomeRule.target_value);
 if (!outcomeRule.metric_name?.trim()) return 'Give the outcome metric a name.';
 if (!Number.isFinite(start) || !Number.isFinite(target)) return 'Enter valid metric values.';
 if (start === target) return 'The metric start and target must be different.';
 if (outcomeRule.direction === 'decrease' && start < target) return 'A decrease target must be below the starting value.';
 if (outcomeRule.direction !== 'decrease' && start > target) return 'An increase target must be above the starting value.';
 }
 if (!milestones.length) return 'Keep at least one milestone.';
 if (milestones.some((item) => !item.title.trim())) return 'Every milestone needs a title.';
 if (milestones.some((item) => !(item.tasks ?? []).some((task) => task.title.trim()))) {
 return 'Every milestone needs at least one task.';
 }
 return null;
 };

 const startOver = () => {
 clearAIGoalDraftState();
 setStage('brief');
 setIntent('');
 setQuestions([]);
 setAnswers({});
 setResolvedAnswers([]);
 setDraft(null);
 setAssumptions([]);
 setError(null);
 };

 const createGoal = async () => {
 if (!draft || creatingGoal) return;
 const validation = validateDraft();
 if (validation) {
 setError(validation);
 return;
 }
 setCreatingGoal(true);
 setError(null);
 try {
 const created = await templatesApi.instantiateBlueprint({
 title: draft.title.trim(),
 title_override: draft.title.trim(),
 description: draft.description.trim(),
 blueprint: draft.blueprint,
 });
 clearAIGoalDraftState();
 toast.success('AI plan created');
 router.push(`/goal/${created.id}/build`);
 } catch (cause) {
 setError(cause instanceof Error ? cause.message : 'Could not create the goal');
 } finally {
 setCreatingGoal(false);
 }
 };

 const saveAsTemplate = async () => {
 if (!draft || savingTemplate) return;
 const validation = validateDraft();
 if (validation) {
 setError(validation);
 return;
 }
 setSavingTemplate(true);
 setError(null);
 try {
 await templatesApi.create({
 title: draft.title.trim(),
 description: draft.description.trim(),
 tags: ['ai-planned'],
 blueprint: draft.blueprint,
 });
 toast.success('AI plan saved as a template');
 } catch (cause) {
 setError(cause instanceof Error ? cause.message : 'Could not save the template');
 } finally {
 setSavingTemplate(false);
 }
 };

 if (!config && !error) {
 return <div className={styles.loading}><span className={styles.spinner} /> Preparing AI planner…</div>;
 }

 if (config && !config.enabled) {
 return (
 <section className={styles.unavailable}>
 <div className={styles.aiMark}><Sparkles size={20} /></div>
 <h2>AI planning is not available yet</h2>
 <p>The normal goal builder still works. A workspace owner can enable AI planning on the server.</p>
 <button type="button" className={styles.secondaryButton} onClick={onBack}>
 <ArrowLeft size={16} /> Start without AI
 </button>
 </section>
 );
 }

 if (stage === 'brief') {
 return (
 <section className={styles.planner}>
 <button type="button" className={styles.backButton} onClick={onBack}><ArrowLeft size={15} /> Creation options</button>
 <div className={styles.aiMark}><Sparkles size={20} /></div>
 <span className={styles.kicker}>Plan with AI</span>
 <h2>Describe the change you want</h2>
 <p className={styles.lead}>Include anything that matters. AI will ask only when an answer would materially change the plan.</p>
 {allowanceLabel && <p className={`${styles.allowancePill} ${allowanceExhausted ? styles.allowanceEmpty : ''}`}><Gauge size={13} /> {allowanceLabel}</p>}
 <form className={styles.briefForm} onSubmit={submitBrief}>
 <textarea
 autoFocus
 value={intent}
 onChange={(event) => setIntent(event.target.value)}
 placeholder="For example: I want to lose 20 kg sustainably. I currently weigh 105 kg and can train three times a week."
 maxLength={2000}
 aria-label="Describe your goal"
 />
 <div className={styles.formFooter}>
 <span>{intent.length}/2000</span>
 <button type="submit" disabled={intent.trim().length < 5 || loading || allowanceExhausted}>
 {loading ? <span className={styles.spinner} /> : <><Sparkles size={16} /> Build my plan</>}
 </button>
 </div>
 </form>
 {error && <p className={styles.error}>{error}</p>}
 <p className={styles.privacyNote}>
 Your description is sent to the configured AI provider. TaskNest records request status and token counts, not your text.
 {config?.provider === 'gemini' && ' Google may use Gemini Free Tier submissions to improve its products.'}
 {' '}Review the plan before creating anything.
 </p>
 </section>
 );
 }

 if (stage === 'questions') {
 return (
 <section className={styles.planner}>
 <button type="button" className={styles.backButton} onClick={() => setStage('brief')}><ArrowLeft size={15} /> Edit description</button>
 <div className={styles.aiMark}><Sparkles size={20} /></div>
 <span className={styles.kicker}>A little context</span>
 <h2>{questions.length === 1 ? 'One detail will sharpen the plan' : 'A few details will sharpen the plan'}</h2>
 {allowanceLabel && <p className={`${styles.allowancePill} ${allowanceExhausted ? styles.allowanceEmpty : ''}`}><Gauge size={13} /> {allowanceLabel}</p>}
 <form className={styles.questionForm} onSubmit={submitAnswers}>
 {questions.map((question, index) => (
 <label key={question.id} className={styles.questionField}>
 <span><em>{String(index + 1).padStart(2, '0')}</em>{question.question}</span>
 {question.answer_type === 'choice' ? (
 <select
 value={answers[question.id] ?? ''}
 onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
 >
 <option value="">Choose one…</option>
 {question.options.map((option) => <option key={option} value={option}>{option}</option>)}
 </select>
 ) : (
 <input
 type={question.answer_type === 'number' || question.answer_type === 'date' ? question.answer_type : 'text'}
 value={answers[question.id] ?? ''}
 placeholder={question.placeholder}
 onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
 />
 )}
 </label>
 ))}
 <button type="submit" className={styles.primaryButton} disabled={loading || allowanceExhausted}>
 {loading ? <span className={styles.spinner} /> : <>Generate plan <ArrowRight size={16} /></>}
 </button>
 </form>
 {error && <p className={styles.error}>{error}</p>}
 </section>
 );
 }

 if (!draft) return null;

 return (
 <section className={`${styles.planner} ${styles.preview}`}>
 <header className={styles.previewHeader}>
 <div>
 <span className={styles.kicker}><Check size={14} /> Editable preview</span>
 <h2>Shape the plan before it becomes a goal</h2>
 <p>Nothing has been created yet. This draft is saved in this browser for seven days.</p>
 {allowanceLabel && <p className={`${styles.allowancePill} ${allowanceExhausted ? styles.allowanceEmpty : ''}`}><Gauge size={13} /> {allowanceLabel}</p>}
 </div>
 <div className={styles.previewHeaderActions}>
 <button type="button" className={styles.secondaryButton} onClick={() => setStage('brief')}>
 <ArrowLeft size={15} /> Edit brief
 </button>
 <button type="button" className={styles.secondaryButton} onClick={startOver}>
 <Trash2 size={15} /> Start over
 </button>
 </div>
 </header>

 <div className={styles.goalCard}>
 <div className={styles.cardIcon}><Target size={18} /></div>
 <div className={styles.goalFields}>
 <label>Goal title<input value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} maxLength={200} /></label>
 <label>Description<textarea value={draft.description} onChange={(event) => updateDraft({ description: event.target.value })} maxLength={1200} /></label>
 <label>Complete when…<textarea value={draft.success_criteria} onChange={(event) => updateSuccessCriteria(event.target.value)} maxLength={800} /></label>
 <label className={styles.smallField}>Time horizon<input type="number" min={7} max={3650} value={blueprint?.duration_days ?? 84} onChange={(event) => updateBlueprint({ duration_days: Number(event.target.value) || 84 })} /><span>days</span></label>
 </div>
 </div>

 <div className={styles.completionModeCard}>
 <div><span>Goal completion rule</span><strong>{outcomeRule ? 'Target reached' : 'Plan complete'}</strong></div>
 <select value={outcomeRule ? 'metric_target' : 'structural'} onChange={(event) => setGoalCompletionMode(event.target.value as 'structural' | 'metric_target')}>
 <option value="structural">Plan complete</option>
 <option value="metric_target">Target reached</option>
 </select>
 </div>

 {outcomeRule && (
 <div className={styles.metricCard}>
 <div className={styles.metricIntro}><Gauge size={18} /><span>Outcome metric</span></div>
 <div className={styles.editableMetricFields}>
 <label>Metric<input value={outcomeRule.metric_name ?? ''} onChange={(event) => updateOutcomeMetric({ name: event.target.value })} /></label>
 <label>Unit<input value={metric?.unit ?? ''} onChange={(event) => updateOutcomeMetric({ unit: event.target.value })} /></label>
 <label>Start<input type="number" value={outcomeRule.start_value ?? 0} onChange={(event) => updateOutcomeMetric({ startValue: event.target.valueAsNumber })} /></label>
 <label>Target<input type="number" value={outcomeRule.target_value ?? 0} onChange={(event) => updateOutcomeMetric({ targetValue: event.target.valueAsNumber })} /></label>
 <label>Direction<select value={outcomeRule.direction === 'decrease' ? 'decrease' : 'increase'} onChange={(event) => updateOutcomeMetric({ direction: event.target.value as 'increase' | 'decrease' })}><option value="increase">Increase</option><option value="decrease">Decrease</option></select></label>
 </div>
 <div className={styles.metricSummary}>
 <strong>{outcomeRule.metric_name}: {outcomeRule.start_value}{metric?.unit ? ` ${metric.unit}` : ''} → {outcomeRule.target_value}{metric?.unit ? ` ${metric.unit}` : ''}</strong>
 <small>Complete when {outcomeRule.metric_name} {outcomeRule.direction === 'decrease' ? '≤' : '≥'} {outcomeRule.target_value}{metric?.unit ? ` ${metric.unit}` : ''}.</small>
 </div>
 </div>
 )}

 <div className={styles.planSection}>
 <div className={styles.sectionHeading}><ListChecks size={18} /><div><span>Plan</span><h3>Milestones and tasks</h3></div></div>
 <div className={styles.milestoneList}>
 {milestones.map((milestone, milestoneIndex) => (
 <article key={`${milestoneIndex}-${milestone.title}`} className={styles.milestoneCard}>
 <div className={styles.milestoneNumber}>{String(milestoneIndex + 1).padStart(2, '0')}</div>
 <div className={styles.milestoneBody}>
 <div className={styles.inlineFields}>
 <label>Milestone<input value={milestone.title} onChange={(event) => updateMilestone(milestoneIndex, { title: event.target.value })} /></label>
 <label className={styles.dayField}>Due day<input type="number" min={1} max={blueprint?.duration_days ?? 3650} value={milestone.due_date_offset_days ?? 1} onChange={(event) => updateMilestone(milestoneIndex, { due_date_offset_days: Number(event.target.value) || 1 })} /></label>
 <button type="button" className={styles.refineButton} disabled={regeneratingMilestone !== null || allowanceExhausted} onClick={() => void regenerateMilestone(milestoneIndex)}>
 {regeneratingMilestone === milestoneIndex ? <span className={styles.spinner} /> : <><Sparkles size={14} /> Refine</>}
 </button>
 <button type="button" className={styles.iconButton} aria-label={`Remove ${milestone.title}`} onClick={() => removeMilestone(milestoneIndex)}><Trash2 size={15} /></button>
 </div>
 <label>Success criteria<input value={milestone.success_criteria ?? ''} onChange={(event) => updateMilestone(milestoneIndex, { success_criteria: event.target.value })} /></label>
 <div className={styles.taskList}>
 {(milestone.tasks ?? []).map((task, taskIndex) => (
 <div key={`${taskIndex}-${task.title}`} className={styles.taskBlock}>
 <div className={styles.taskRow}>
 <span>{taskIndex + 1}</span>
 <input value={task.title} onChange={(event) => updateTask(milestoneIndex, taskIndex, { title: event.target.value })} aria-label={`Task ${taskIndex + 1}`} />
 <button type="button" className={styles.iconButton} aria-label={`Remove ${task.title}`} onClick={() => removeTask(milestoneIndex, taskIndex)}><Trash2 size={14} /></button>
 </div>
 {((task.subtasks?.length ?? 0) > 0 || (task.todos?.length ?? 0) > 0) && (
 <div className={styles.taskBreakdown}>
 {(task.subtasks?.length ?? 0) > 0 && (
 <div className={styles.breakdownGroup}>
 <span>Steps</span>
 {task.subtasks?.map((subtask, subtaskIndex) => (
 <input
 key={`${subtaskIndex}-${subtask.title}`}
 value={subtask.title}
 onChange={(event) => updateTaskSubtask(milestoneIndex, taskIndex, subtaskIndex, event.target.value)}
 aria-label={`Subtask ${subtaskIndex + 1} for ${task.title}`}
 />
 ))}
 </div>
 )}
 {(task.todos?.length ?? 0) > 0 && (
 <div className={styles.breakdownGroup}>
 <span>Repeating actions</span>
 {task.todos?.map((todo, todoIndex) => (
 <div key={`${todoIndex}-${todo.title}`} className={styles.todoDraftRow}>
 <input
 value={todo.title}
 onChange={(event) => updateTaskTodo(milestoneIndex, taskIndex, todoIndex, { title: event.target.value })}
 aria-label={`Repeating action ${todoIndex + 1} for ${task.title}`}
 />
 <select
 value={todo.repeat_interval ?? 'weekly'}
 onChange={(event) => updateTaskTodo(milestoneIndex, taskIndex, todoIndex, { repeat_interval: event.target.value })}
 aria-label={`Repeat frequency for ${todo.title}`}
 >
 <option value="daily">Daily</option>
 <option value="weekly">Weekly</option>
 <option value="monthly">Monthly</option>
 </select>
 </div>
 ))}
 </div>
 )}
 </div>
 )}
 </div>
 ))}
 </div>
 </div>
 </article>
 ))}
 </div>
 </div>

 {routines.length > 0 && (
 <div className={styles.planSection}>
 <div className={styles.sectionHeading}><Repeat2 size={18} /><div><span>System</span><h3>Routines that support the goal</h3></div></div>
 <div className={styles.routineList}>
 {routines.map((routine, index) => (
 <div key={`${index}-${routine.title}`} className={styles.routineRow}>
 <input value={routine.title} onChange={(event) => updateRoutine(index, { title: event.target.value })} aria-label={`Routine ${index + 1}`} />
 <select
 value={routine.todos?.[0]?.repeat_interval ?? 'weekly'}
 onChange={(event) => updateRoutine(index, { todos: (routine.todos ?? []).map((todo) => ({ ...todo, repeat_interval: event.target.value })) })}
 >
 <option value="daily">Every day</option>
 <option value="weekly">Every week</option>
 <option value="monthly">Every month</option>
 </select>
 <button type="button" className={styles.iconButton} aria-label={`Remove ${routine.title}`} onClick={() => removeRoutine(index)}><Trash2 size={15} /></button>
 </div>
 ))}
 </div>
 </div>
 )}

 {assumptions.length > 0 && (
 <details className={styles.assumptions}>
 <summary>AI planning notes ({assumptions.length})</summary>
 <ul>{assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
 </details>
 )}

 {error && <p className={styles.error}>{error}</p>}
 <footer className={styles.previewActions}>
 <button type="button" className={styles.secondaryButton} disabled={loading || allowanceExhausted} onClick={() => void runGeneration()}>
 {loading ? <span className={styles.spinner} /> : <><RotateCcw size={15} /> Regenerate</>}
 </button>
 <button type="button" className={styles.secondaryButton} disabled={savingTemplate} onClick={() => void saveAsTemplate()}>
 {savingTemplate ? <span className={styles.spinner} /> : <><Save size={15} /> Save as template</>}
 </button>
 <button type="button" className={styles.primaryButton} disabled={creatingGoal} onClick={() => void createGoal()}>
 {creatingGoal ? <span className={styles.spinner} /> : <>Create goal <ArrowRight size={16} /></>}
 </button>
 </footer>
 </section>
 );
}
