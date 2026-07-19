'use client';

import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, Reorder, useDragControls, useReducedMotion } from 'framer-motion';
import {
 ArrowLeft,
 ArrowRight,
 CalendarDays,
 Check,
 ChevronDown,
 CircleDot,
 Flag,
 ListTodo,
 Plus,
 Repeat2,
 Sparkles,
 Target,
} from 'lucide-react';
import { CompletionRule, MilestoneItem, TaskItem, TodoItem } from '@/lib/types';
import { MetricDefinitionItem } from '@/lib/api';
import { GoalFlowActionMode, useGoalFlow } from '@/features/goal-flow/useGoalFlow';
import { GoalMeasurementDraft } from '@/features/goal-flow/goalMeasurement';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { CompletionRuleSetup, GoalFlowRecurringAction, GoalMeasureSetup } from './GoalMeasureSetup';
import { AIGoalPlanner } from './AIGoalPlanner';
import styles from './GoalCreationFlow.module.css';

const FLOATING_ENTITIES = ['goal', 'milestone', 'task', 'step', 'routine'];
const REPEAT_OPTIONS = [
 { value: 'daily', label: 'Every day' },
 { value: 'weekly', label: 'Every week' },
 { value: 'monthly', label: 'Every month' },
];

export function GoalCreationFlow({ goalId }: { goalId?: string }) {
 const router = useRouter();
 const reduceMotion = useReducedMotion();
 const milestoneInputRef = useRef<HTMLInputElement>(null);
 const [goalTitle, setGoalTitle] = useState('');
 const [creationMode, setCreationMode] = useState<'scratch' | 'ai'>('scratch');
 const {
 goal,
 milestones,
 routines,
 goalMetrics,
 creatingGoal,
 loadingGoal,
 reorderingMilestones,
 error,
 createGoal,
 saveGoalDetails,
 saveGoalMeasurement,
 saveMilestoneMeasurement,
 saveTaskMeasurement,
 createMilestone,
 reorderMilestones,
 updateMilestone,
 createTask,
 updateTask,
 createRoutine,
 createAction,
 } = useGoalFlow(goalId);
 const [orderedMilestones, setOrderedMilestones] = useState(milestones);
 const orderedMilestonesRef = useRef(milestones);

 useDocumentTitle(goal ? `Build ${goal.title}` : 'New goal');

 useEffect(() => {
 if (!goalId && window.location.hash === '#ai') setCreationMode('ai');
 }, [goalId]);

 useEffect(() => {
 if (!goal) return;
 const timer = window.setTimeout(() => milestoneInputRef.current?.focus(), reduceMotion ? 0 : 650);
 return () => window.clearTimeout(timer);
 }, [goal, reduceMotion]);

 useEffect(() => {
 setOrderedMilestones(milestones);
 orderedMilestonesRef.current = milestones;
 }, [milestones]);

 const commitMilestoneOrder = async (ordered = orderedMilestonesRef.current) => {
 try {
 await reorderMilestones(ordered);
 } catch {
 setOrderedMilestones(milestones);
 }
 };

 const moveMilestoneByKeyboard = (index: number, direction: -1 | 1) => {
 const nextIndex = index + direction;
 if (nextIndex < 0 || nextIndex >= orderedMilestones.length || reorderingMilestones) return;
 const next = [...orderedMilestones];
 const [moved] = next.splice(index, 1);
 next.splice(nextIndex, 0, moved);
 setOrderedMilestones(next);
 orderedMilestonesRef.current = next;
 void commitMilestoneOrder(next);
 };

 const titleEnergy = Math.min(1, goalTitle.trim().length / 28);
 const backgroundStyle = useMemo(
 () => ({ '--flow-energy': String(0.16 + titleEnergy * 0.36) }) as React.CSSProperties,
 [titleEnergy],
 );
 const recurringActions = useMemo(() => (
 [...routines, ...milestones.flatMap((milestone) => milestone.tasks)]
 .flatMap((task) => task.todos
 .filter((todo) => Boolean(todo.repeat_interval))
 .map((todo) => ({
 id: todo.id,
 title: todo.title,
 repeatInterval: todo.repeat_interval,
 routineTitle: task.title,
 })))
 ), [milestones, routines]);
 const milestoneTasks = useMemo(
 () => milestones.flatMap((milestone) => milestone.tasks),
 [milestones],
 );
 const subtaskCount = useMemo(
 () => milestoneTasks.reduce((sum, task) => sum + task.subtasks.length, 0),
 [milestoneTasks],
 );
 const repeatingActionCount = useMemo(
 () => milestoneTasks.reduce(
 (sum, task) => sum + task.todos.filter((todo) => Boolean(todo.repeat_interval)).length,
 0,
 ),
 [milestoneTasks],
 );
 const outcomeRule = goal?.completion_rule?.type === 'metric_target'
 ? goal.completion_rule
 : goal?.completion_rule?.type === 'hybrid'
 ? goal.completion_rule.outcome
 : undefined;
 const outcomeMetric = goalMetrics.find((metric) => (
 metric.id === outcomeRule?.metric_definition_id
 || (!metric.milestone_id && !metric.task_id
 && metric.name.trim().toLocaleLowerCase() === outcomeRule?.metric_name?.trim().toLocaleLowerCase())
 ));

 const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
 const rect = event.currentTarget.getBoundingClientRect();
 event.currentTarget.style.setProperty('--pointer-x', `${event.clientX - rect.left}px`);
 event.currentTarget.style.setProperty('--pointer-y', `${event.clientY - rect.top}px`);
 };

 const submitGoal = async (event: FormEvent) => {
 event.preventDefault();
 try {
 await createGoal(goalTitle);
 } catch {
 // The orchestration hook surfaces the error and toast.
 }
 };

 return (
 <div
 className={styles.page}
 style={backgroundStyle}
 onPointerMove={handlePointerMove}
 >
 <div className={styles.dotField} aria-hidden="true" />
 <div className={styles.pointerGlow} aria-hidden="true" />
 <FloatingEntities compact={Boolean(goal)} />

 <div className={styles.chrome}>
 <Link href="/goal" className={styles.backLink}>
 <ArrowLeft size={16} /> All goals
 </Link>
 {goal && (
 <button className={styles.quietButton} onClick={() => router.push(`/goal/${goal.id}`)}>
 Open full goal <ArrowRight size={15} />
 </button>
 )}
 </div>

 <main className={styles.content}>
 <AnimatePresence mode="wait">
 {loadingGoal ? (
 <motion.section
 key="loading"
 className={styles.loadingState}
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 >
 <span className={styles.spinner} />
 <strong>Loading goal builder…</strong>
 </motion.section>
 ) : !goal && goalId ? (
 <motion.section key="load-error" className={styles.loadingState} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
 <strong>Could not open this goal</strong>
 <p>{error ?? 'The goal may have been removed.'}</p>
 <Link href={`/goal/${goalId}`} className={styles.quietButton}>Back to goal</Link>
 </motion.section>
 ) : !goal ? (
 <motion.section
 key="idea"
 className={styles.hero}
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0, y: -64, scale: 0.96 }}
 transition={{ duration: reduceMotion ? 0 : 0.5 }}
 >
 {creationMode === 'ai' ? (
 <AIGoalPlanner onBack={() => setCreationMode('scratch')} />
 ) : (
 <>
 <div className={styles.eyebrow}><Sparkles size={14} /> New goal</div>
 <h1>What do you want to change?</h1>
 <p>Start with a name, ask AI to build the plan, or begin from a reusable template.</p>
 <form className={styles.goalForm} onSubmit={submitGoal}>
 <Target className={styles.goalIcon} size={22} aria-hidden="true" />
 <input
 autoFocus
 value={goalTitle}
 onChange={(event) => setGoalTitle(event.target.value)}
 placeholder="For example: run a half marathon"
 aria-label="Goal title"
 maxLength={200}
 />
 <button disabled={!goalTitle.trim() || creatingGoal} aria-label="Create goal">
 {creatingGoal ? <span className={styles.spinner} /> : <ArrowRight size={20} />}
 </button>
 </form>
 <div className={styles.inputMeta}>
 <span>Press Enter to create from scratch</span>
 <span>{goalTitle.length}/200</span>
 </div>
 <div className={styles.creationOptions} aria-label="Other ways to create a goal">
 <button type="button" className={styles.creationOption} onClick={() => setCreationMode('ai')}>
 <span className={styles.creationOptionIcon}><Sparkles size={17} /></span>
 <span><strong>Plan with AI</strong><small>Describe the outcome; review a complete draft</small></span>
 <ArrowRight size={16} />
 </button>
 <Link href="/templates" className={styles.creationOption}>
 <span className={styles.creationOptionIcon}><ListTodo size={17} /></span>
 <span><strong>Use a template</strong><small>Start from a plan you can reuse</small></span>
 <ArrowRight size={16} />
 </Link>
 </div>
 {error && <p className={styles.error}>{error}</p>}
 </>
 )}
 </motion.section>
 ) : (
 <motion.section
 key="roadmap"
 className={styles.roadmap}
 initial={{ opacity: 0, y: 80 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: reduceMotion ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] }}
 >
 <motion.div
 className={styles.goalNode}
 initial={{ scale: 0.9 }}
 animate={{ scale: 1 }}
 transition={{ duration: reduceMotion ? 0 : 0.45 }}
 >
 <div className={styles.nodeIndex}><Target size={18} /></div>
 <div className={styles.goalCopy}>
 <span className={styles.nodeLabel}>{goalId ? 'Goal builder' : 'Goal created'}</span>
 <h1>{goal.title}</h1>
 <p>{goalId ? 'Review and evolve the plan, system and completion rule.' : 'Now turn the intention into a small set of visible transitions.'}</p>
 </div>
 <EntityDetails
 label="Refine goal"
 successCriteria={goal.success_criteria}
 dueDate={goal.end_datetime}
 criteriaLabel="This goal is complete when…"
 onSave={saveGoalDetails}
 />
 </motion.div>

 <div className={styles.flowLine} aria-hidden="true" />

 <div className={styles.milestoneLane}>
 <div className={styles.sectionIntro}>
 <span className={styles.kicker}>Plan</span>
 <h2>Which milestones move this forward?</h2>
 <p>Keep them short. Add a date and success criteria only when they help.</p>
 </div>

 <Reorder.Group
 axis="y"
 values={orderedMilestones}
 onReorder={(next) => {
 setOrderedMilestones(next);
 orderedMilestonesRef.current = next;
 }}
 className={styles.nodes}
 as="div"
 >
 {orderedMilestones.map((milestone, index) => (
 <MilestoneNode
 key={milestone.id}
 milestone={milestone}
 index={index}
 onCreateTask={createTask}
 onUpdate={updateMilestone}
 onUpdateTask={updateTask}
 onSaveMilestoneMeasurement={saveMilestoneMeasurement}
 onSaveTaskMeasurement={saveTaskMeasurement}
 metrics={goalMetrics}
 dragDisabled={reorderingMilestones}
 onDragEnd={() => void commitMilestoneOrder()}
 onKeyboardMove={(direction) => moveMilestoneByKeyboard(index, direction)}
 onCreateAction={createAction}
 />
 ))}
 </Reorder.Group>

 <QuickAdd
 ref={milestoneInputRef}
 label={milestones.length ? 'Another milestone' : 'First milestone'}
 placeholder="For example: comfortably run 10 km"
 onCreate={createMilestone}
 />
 </div>

 <section className={styles.routineLane}>
 <div className={styles.routineIcon}><Repeat2 size={19} /></div>
 <div className={styles.sectionIntro}>
 <span className={styles.kicker}>System</span>
 <h2>What needs to repeat?</h2>
 <p>A routine supports the goal alongside the plan—it is not another level under a task.</p>
 </div>
 {routines.length > 0 && (
 <div className={styles.routineGrid}>
 {routines.map((routine) => (
 <TaskNode
 key={routine.id}
 task={routine}
 routineContainer
 onUpdate={updateTask}
 onSaveMeasurement={saveTaskMeasurement}
 metrics={goalMetrics}
 onCreateAction={createAction}
 />
 ))}
 </div>
 )}
 <QuickAdd
 label="Add routine"
 placeholder="For example: three runs each week"
 onCreate={createRoutine}
 subtle
 />
 </section>

 <GoalMeasureSetup
 completionRule={goal.completion_rule}
 initialMetricUnit={outcomeMetric?.unit ?? undefined}
 recurringActions={recurringActions}
 onSave={saveGoalMeasurement}
 />

 <div className={styles.finishBar}>
 <div>
 <strong>Your foundation is ready</strong>
 <span>
 {formatCount(milestones.length, 'milestone')} · {' '}
 {formatCount(milestoneTasks.length, 'task')} · {' '}
 {formatCount(subtaskCount, 'step')} · {' '}
 {formatCount(repeatingActionCount, 'repeating action')} · {' '}
 {formatCount(routines.length, 'routine')}
 </span>
 </div>
 <button onClick={() => router.push(`/goal/${goal.id}`)}>
 Open goal <ArrowRight size={17} />
 </button>
 </div>
 </motion.section>
 )}
 </AnimatePresence>
 </main>
 </div>
 );
}

function formatCount(count: number, noun: string) {
 return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function FloatingEntities({ compact }: { compact: boolean }) {
 return (
 <div className={`${styles.entities} ${compact ? styles.entitiesCompact : ''}`} aria-hidden="true">
 {FLOATING_ENTITIES.map((entity, index) => (
 <span key={entity} style={{ '--entity-index': index } as React.CSSProperties}>{entity}</span>
 ))}
 </div>
 );
}

const QuickAdd = React.forwardRef<HTMLInputElement, {
 label: string;
 placeholder: string;
 onCreate: (title: string) => Promise<void>;
 subtle?: boolean;
}>(({ label, placeholder, onCreate, subtle = false }, ref) => {
 const [value, setValue] = useState('');
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const submit = async (event: FormEvent) => {
 event.preventDefault();
 const title = value.trim();
 if (!title || busy) return;
 setBusy(true);
 setError(null);
 try {
 await onCreate(title);
 setValue('');
 } catch (cause) {
 setError(cause instanceof Error ? cause.message : 'Could not add item');
 } finally {
 setBusy(false);
 }
 };

 return (
 <form className={`${styles.quickAdd} ${subtle ? styles.quickAddSubtle : ''}`} onSubmit={submit}>
 <span className={styles.addDot}><Plus size={16} /></span>
 <div>
 <label>{label}</label>
 <input
 ref={ref}
 value={value}
 onChange={(event) => setValue(event.target.value)}
 placeholder={placeholder}
 maxLength={200}
 />
 {error && <small className={styles.error}>{error}</small>}
 </div>
 <button disabled={!value.trim() || busy}>{busy ? '…' : 'Add'}</button>
 </form>
 );
});
QuickAdd.displayName = 'QuickAdd';

function MilestoneNode({
 milestone,
 index,
 onCreateTask,
 onUpdate,
 onUpdateTask,
 onSaveMilestoneMeasurement,
 onSaveTaskMeasurement,
 metrics,
 dragDisabled,
 onDragEnd,
 onKeyboardMove,
 onCreateAction,
}: {
 milestone: MilestoneItem;
 index: number;
 onCreateTask: (milestone: MilestoneItem, title: string) => Promise<void>;
 onUpdate: (milestone: MilestoneItem, patch: Pick<MilestoneItem, 'success_criteria' | 'due_date'>) => Promise<void>;
 onUpdateTask: (task: TaskItem, patch: Pick<TaskItem, 'success_criteria' | 'due_date'>) => Promise<void>;
 onSaveMilestoneMeasurement: (milestone: MilestoneItem, draft: GoalMeasurementDraft) => Promise<void>;
 onSaveTaskMeasurement: (task: TaskItem, draft: GoalMeasurementDraft) => Promise<void>;
 metrics: MetricDefinitionItem[];
 dragDisabled: boolean;
 onDragEnd: () => void;
 onKeyboardMove: (direction: -1 | 1) => void;
 onCreateAction: (task: TaskItem, title: string, mode: GoalFlowActionMode, repeatInterval: string) => Promise<void>;
}) {
 const dragControls = useDragControls();
 const recurringActions = recurringActionsForTasks(milestone.tasks);
 const metric = metricForRule(metrics, milestone.completion_rule, 'milestone', milestone.id);
 return (
 <Reorder.Item
 as="article"
 value={milestone}
 dragListener={false}
 dragControls={dragControls}
 onDragEnd={onDragEnd}
 className={styles.milestoneNode}
 initial={{ opacity: 0, y: 24 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.38 }}
 >
 <div className={styles.milestoneRail}>
 <button
 type="button"
 className={styles.milestoneMarker}
 disabled={dragDisabled}
 aria-label={`Reorder milestone ${milestone.title}. Use arrow keys or drag.`}
 title="Drag milestone to reorder"
 onPointerDown={(event) => {
 if (!dragDisabled) dragControls.start(event);
 }}
 onKeyDown={(event) => {
 if (event.key === 'ArrowUp') {
 event.preventDefault();
 onKeyboardMove(-1);
 }
 if (event.key === 'ArrowDown') {
 event.preventDefault();
 onKeyboardMove(1);
 }
 }}
 >
 {String(index + 1).padStart(2, '0')}
 </button>
 </div>
 <div className={styles.milestoneBody}>
 <div className={styles.milestoneHeader}>
 <div>
 <span className={styles.nodeLabel}>Milestone {index + 1}</span>
 <h3>{milestone.title}</h3>
 {milestone.description && <p>{milestone.description}</p>}
 </div>
 <EntityDetails
 label="Details"
 successCriteria={milestone.success_criteria}
 dueDate={milestone.due_date}
 criteriaLabel="This milestone is complete when…"
 onSave={(successCriteria, dueDate) => onUpdate(milestone, { success_criteria: successCriteria, due_date: dueDate })}
 />
 </div>

 <EntityRuleEditor
 scope="milestone"
 completionRule={milestone.completion_rule}
 initialMetricUnit={metric?.unit ?? undefined}
 recurringActions={recurringActions}
 onSave={(draft) => onSaveMilestoneMeasurement(milestone, draft)}
 />

 {milestone.tasks.length > 0 && (
 <div className={styles.taskList}>
 {milestone.tasks.map((task) => (
 <TaskNode
 key={task.id}
 task={task}
 onUpdate={onUpdateTask}
 onSaveMeasurement={onSaveTaskMeasurement}
 metrics={metrics}
 onCreateAction={onCreateAction}
 />
 ))}
 </div>
 )}

 <QuickAdd
 label="Add task"
 placeholder="A concrete piece of work for this milestone"
 onCreate={(title) => onCreateTask(milestone, title)}
 subtle
 />
 </div>
 </Reorder.Item>
 );
}

function TaskNode({
 task,
 routineContainer = false,
 onUpdate,
 onSaveMeasurement,
 metrics,
 onCreateAction,
}: {
 task: TaskItem;
 routineContainer?: boolean;
 onUpdate: (task: TaskItem, patch: Pick<TaskItem, 'success_criteria' | 'due_date'>) => Promise<void>;
 onSaveMeasurement: (task: TaskItem, draft: GoalMeasurementDraft) => Promise<void>;
 metrics: MetricDefinitionItem[];
 onCreateAction: (task: TaskItem, title: string, mode: GoalFlowActionMode, repeatInterval: string) => Promise<void>;
}) {
 const [draft, setDraft] = useState('');
 const [mode, setMode] = useState<GoalFlowActionMode>(routineContainer ? 'routine' : 'once');
 const [repeat, setRepeat] = useState('daily');
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const actions = [...task.subtasks.map((item) => ({ ...item, mode: 'once' as const })), ...task.todos.map((item) => ({ ...item, mode: 'routine' as const }))];
 const recurringActions = recurringActionsForTasks([task]);
 const metric = metricForRule(metrics, task.completion_rule, 'task', task.id);

 const submit = async (event: FormEvent) => {
 event.preventDefault();
 const title = draft.trim();
 if (!title || busy) return;
 setBusy(true);
 setError(null);
 try {
 await onCreateAction(task, title, mode, repeat);
 setDraft('');
 } catch (cause) {
 setError(cause instanceof Error ? cause.message : 'Could not add action');
 } finally {
 setBusy(false);
 }
 };

 return (
 <article className={`${styles.taskNode} ${routineContainer ? styles.routineNode : ''}`}>
 <div className={styles.taskHeader}>
 <span className={styles.taskGlyph}>{routineContainer ? <Repeat2 size={15} /> : <Flag size={15} />}</span>
 <div>
 <span className={styles.nodeLabel}>{routineContainer ? 'Routine' : 'Task'}</span>
 <h4>{task.title}</h4>
 {task.description && <p>{task.description}</p>}
 </div>

 {!routineContainer && (
 <EntityRuleEditor
 scope="task"
 completionRule={task.completion_rule}
 initialMetricUnit={metric?.unit ?? undefined}
 recurringActions={recurringActions}
 onSave={(measurement) => onSaveMeasurement(task, measurement)}
 />
 )}
 <EntityDetails
 label="Details"
 successCriteria={task.success_criteria}
 dueDate={task.due_date}
 criteriaLabel={routineContainer ? 'This routine is working when…' : 'This task is complete when…'}
 onSave={(successCriteria, dueDate) => onUpdate(task, { success_criteria: successCriteria, due_date: dueDate })}
 compact
 />
 </div>

 {actions.length > 0 && (
 <ul className={styles.actionList}>
 {actions.map((action) => (
 <li key={`${action.mode}-${action.id}`}>
 {action.mode === 'routine' ? <Repeat2 size={13} /> : <Check size={13} />}
 <span>{action.title}</span>
 {action.mode === 'routine' && <small>{(action as TodoItem).repeat_interval}</small>}
 </li>
 ))}
 </ul>
 )}

 <form className={styles.actionComposer} onSubmit={submit}>
 {!routineContainer && (
 <div className={styles.modeSwitch}>
 <button type="button" className={mode === 'once' ? styles.activeMode : ''} onClick={() => setMode('once')}>
 <ListTodo size={13} /> One-time
 </button>
 <button type="button" className={mode === 'routine' ? styles.activeMode : ''} onClick={() => setMode('routine')}>
 <Repeat2 size={13} /> Repeat
 </button>
 </div>
 )}
 <div className={styles.actionInputRow}>
 <input
 value={draft}
 onChange={(event) => setDraft(event.target.value)}
 placeholder={mode === 'routine' ? 'What should repeat?' : 'Next step…'}
 />
 {mode === 'routine' && (
 <select value={repeat} onChange={(event) => setRepeat(event.target.value)} aria-label="Repeat frequency">
 {REPEAT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
 </select>
 )}
 <button disabled={!draft.trim() || busy} aria-label="Add action"><Plus size={16} /></button>
 </div>
 {error && <small className={styles.error}>{error}</small>}
 </form>
 </article>
 );
}

function recurringActionsForTasks(tasks: TaskItem[]): GoalFlowRecurringAction[] {
 return tasks.flatMap((task) => (task.todos ?? [])
 .filter((todo) => Boolean(todo.repeat_interval))
 .map((todo) => ({
 id: todo.id,
 title: todo.title,
 repeatInterval: todo.repeat_interval,
 routineTitle: task.title,
 })));
}

function metricForRule(
 metrics: MetricDefinitionItem[],
 rule: CompletionRule | null | undefined,
 scope: 'milestone' | 'task',
 entityId: string,
) {
 const outcome = rule?.type === 'metric_target' ? rule : rule?.type === 'hybrid' ? rule.outcome : undefined;
 return metrics.find((metric) => metric.id === outcome?.metric_definition_id)
 ?? metrics.find((metric) => (
 (scope === 'milestone' ? metric.milestone_id === entityId : metric.task_id === entityId)
 && metric.name.trim().toLocaleLowerCase() === outcome?.metric_name?.trim().toLocaleLowerCase()
 ));
}

function EntityRuleEditor({
 scope,
 completionRule,
 initialMetricUnit,
 recurringActions,
 onSave,
}: {
 scope: 'milestone' | 'task';
 completionRule?: CompletionRule | null;
 initialMetricUnit?: string;
 recurringActions: GoalFlowRecurringAction[];
 onSave: (draft: GoalMeasurementDraft) => Promise<void>;
}) {
 const [open, setOpen] = useState(false);
 const ruleLabel = completionRule?.type === 'metric_target'
 ? 'Target reached'
 : completionRule?.type === 'consistency'
 ? 'Consistency'
 : completionRule?.type === 'hybrid'
 ? 'Hybrid'
 : 'Plan complete';

 return (
 <div className={styles.entityRule}>
 <button type="button" className={styles.entityRuleToggle} onClick={() => setOpen((value) => !value)} aria-expanded={open}>
 <span>Completion · {ruleLabel}</span>
 <ChevronDown size={14} className={open ? styles.chevronOpen : ''} />
 </button>
 <AnimatePresence>
 {open && (
 <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
 <CompletionRuleSetup
 scope={scope}
 compact
 completionRule={completionRule}
 initialMetricUnit={initialMetricUnit}
 recurringActions={recurringActions}
 onSave={onSave}
 />
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
}

function EntityDetails({
 label,
 successCriteria,
 dueDate,
 criteriaLabel,
 onSave,
 compact = false,
}: {
 label: string;
 successCriteria?: string;
 dueDate?: string;
 criteriaLabel: string;
 onSave: (successCriteria: string, dueDate?: string) => Promise<void>;
 compact?: boolean;
}) {
 const [open, setOpen] = useState(false);
 const [draftSuccessCriteria, setDraftSuccessCriteria] = useState(successCriteria ?? '');
 const [draftDueDate, setDraftDueDate] = useState(dueDate ? dueDate.slice(0, 10) : '');
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const save = async () => {
 setBusy(true);
 setError(null);
 try {
 await onSave(draftSuccessCriteria.trim(), draftDueDate || undefined);
 setOpen(false);
 } catch (cause) {
 setError(cause instanceof Error ? cause.message : 'Could not save details');
 } finally {
 setBusy(false);
 }
 };

 return (
 <div className={`${styles.details} ${compact ? styles.detailsCompact : ''}`}>
 <button type="button" className={styles.detailsToggle} onClick={() => setOpen((value) => !value)} aria-expanded={open}>
 {label} <ChevronDown size={14} className={open ? styles.chevronOpen : ''} />
 </button>
 <AnimatePresence>
 {open && (
 <motion.div
 className={styles.detailsPanel}
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 exit={{ opacity: 0, height: 0 }}
 >
 <label>
 <span><CircleDot size={13} /> {criteriaLabel}</span>
 <textarea value={draftSuccessCriteria} onChange={(event) => setDraftSuccessCriteria(event.target.value)} rows={2} />
 </label>
 <label>
 <span><CalendarDays size={13} /> Deadline, if it is genuinely useful</span>
 <input type="date" value={draftDueDate} onChange={(event) => setDraftDueDate(event.target.value)} />
 </label>
 {error && <small className={styles.error}>{error}</small>}
 <button type="button" className={styles.saveDetails} onClick={save} disabled={busy}>
 {busy ? 'Saving…' : 'Save'}
 </button>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
}
