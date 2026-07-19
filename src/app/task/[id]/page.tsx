'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { withAuth } from '@/hoc/withAuth';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { tasksApi, todosApi, subtasksApi } from '@/lib/api';
import { StatusType, TaskItem as Task, SubtaskItem as Subtask, TodoItem as Todo } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { toast } from '@/store/useToast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { Markdown } from '@/components/ui/Markdown';
import { ChevronDown, ChevronLeft, ChevronRight, Target, Flag, CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { calculateTaskProgressLanes } from '@/lib/progress';
import { CompletionRulePanel } from '@/components/dashboard/GoalCompletionRulePanel';
import { ProgressLanes } from '@/components/dashboard/ProgressLanes';

const TaskDetailPage: React.FC = () => {
 const params = useParams();
 const router = useRouter();
 const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params!.id[0] : '';

 // Locate the task across the entire tree to recover breadcrumb context.
 const ctx = useStore(useShallow((s) => {
 for (const goal of s.goals) {
 const goalTask = goal.tasks?.find((task) => task.id === id);
 if (goalTask) return { task: goalTask, goal, milestone: undefined };
 for (const milestone of goal.milestones ?? []) {
 const task = milestone.tasks?.find((t) => t.id === id);
 if (task) return { task, goal, milestone };
 }
 }
 const flat = s.tasks.find((t) => t.id === id);
 if (flat) return { task: flat, goal: undefined, milestone: undefined };
 return { task: undefined, goal: undefined, milestone: undefined };
 }));

 const { updateTaskInGoals, updateTodoInGoals, updateSubtaskInGoals, deleteTaskFromGoals, fetchGoals } = useStore(
 useShallow((s) => ({
 updateTaskInGoals: s.updateTaskInGoals,
 updateTodoInGoals: s.updateTodoInGoals,
 updateSubtaskInGoals: s.updateSubtaskInGoals,
 deleteTaskFromGoals: s.deleteTaskFromGoals,
 fetchGoals: s.fetchGoals,
 }))
 );

 const [isLoading, setIsLoading] = useState(!ctx.task);
 const [confirmDelete, setConfirmDelete] = useState(false);
 const [isDeleting, setIsDeleting] = useState(false);
 const [expandedSubtaskId, setExpandedSubtaskId] = useState<string | null>(null);
 const [loadingSubtaskId, setLoadingSubtaskId] = useState<string | null>(null);
 const [subtaskDetails, setSubtaskDetails] = useState<Record<string, Subtask>>({});
 useDocumentTitle(ctx.task?.title);

 useEffect(() => {
 if (!id || ctx.task) {
 setIsLoading(false);
 return;
 }
 let cancelled = false;
 const load = async () => {
 try {
 const fresh = await tasksApi.get(id, true, true);
 if (!cancelled) updateTaskInGoals(fresh);
 } catch (err) {
 console.error('Failed to load task:', err);
 } finally {
 if (!cancelled) setIsLoading(false);
 }
 };
 load();
 return () => {
 cancelled = true;
 };
 }, [id, ctx.task, updateTaskInGoals]);

 const task = ctx.task;
 const goal = ctx.goal;
 const milestone = ctx.milestone;

 const toggleTask = async () => {
 if (!task) return;
 const newStatus = task.status === StatusType.FINISHED ? StatusType.OUTSTANDING : StatusType.FINISHED;
 const localStamp = newStatus === StatusType.FINISHED ? new Date().toISOString() : undefined;
 try {
 const updated = await tasksApi.update({
 id: task.id,
 status: newStatus,
 ...(localStamp ? { end_datetime: localStamp } : {}),
 });
 updateTaskInGoals({
 ...updated,
 end_datetime: updated.end_datetime ?? localStamp,
 subtasks: task.subtasks ?? updated.subtasks ?? [],
 todos: task.todos ?? updated.todos ?? [],
 });
 void fetchGoals({ force: true, silent: true });
 } catch (err) {
 console.error(err);
 toast.error('Failed to update task');
 }
 };

 const toggleChild = async (kind: 'subtask' | 'todo', child: Subtask | Todo) => {
 const newStatus = child.status === StatusType.FINISHED ? StatusType.OUTSTANDING : StatusType.FINISHED;
 const localStamp = newStatus === StatusType.FINISHED ? new Date().toISOString() : undefined;
 const patch = {
 id: child.id,
 status: newStatus,
 ...(localStamp ? { end_datetime: localStamp } : {}),
 };
 try {
 if (kind === 'subtask') {
 const updated = await subtasksApi.update(patch);
 const resolved = { ...updated, end_datetime: updated.end_datetime ?? localStamp };
 updateSubtaskInGoals(resolved);
 setSubtaskDetails((current) => current[child.id] ? { ...current, [child.id]: resolved } : current);
 } else {
 const updated = await todosApi.update(patch);
 updateTodoInGoals({ ...updated, end_datetime: updated.end_datetime ?? localStamp });
 }
 void fetchGoals({ force: true, silent: true });
 } catch (err) {
 console.error(err);
 toast.error(`Failed to update ${kind}`);
 }
 };

 const toggleSubtaskDetails = async (subtask: Subtask) => {
 if (expandedSubtaskId === subtask.id) {
 setExpandedSubtaskId(null);
 return;
 }
 setExpandedSubtaskId(subtask.id);
 if (subtaskDetails[subtask.id]) return;

 setLoadingSubtaskId(subtask.id);
 try {
 const fresh = await subtasksApi.getById(subtask.id);
 setSubtaskDetails((current) => ({ ...current, [subtask.id]: fresh }));
 } catch (error) {
 console.error('Failed to load subtask details:', error);
 toast.error('Failed to load subtask details');
 } finally {
 setLoadingSubtaskId((current) => current === subtask.id ? null : current);
 }
 };

 const performDelete = async () => {
 if (!task) return;
 setIsDeleting(true);
 try {
 await tasksApi.delete(task.id);
 deleteTaskFromGoals(task.id);
 toast.success('Task deleted');
 router.push(milestone ? `/milestone/${milestone.id}` : goal ? `/goal/${goal.id}` : '/task');
 } catch (err) {
 console.error(err);
 toast.error('Failed to delete task');
 } finally {
 setIsDeleting(false);
 setConfirmDelete(false);
 }
 };

 if (isLoading) {
 return (
 <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tn-bg)' }}>
 <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: 'var(--tn-accent)' }} />
 </div>
 );
 }

 if (!task) {
 return (
 <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--tn-bg)' }}>
 <div className="card max-w-md w-full text-center" style={{ padding: 32 }}>
 <h1 className="text-2xl font-semibold text-foreground mb-3">Task not found</h1>
 <Link
 href="/task"
 className="btn btn-primary"
 >
 Back to tasks
 </Link>
 </div>
 </div>
 );
 }

 const isDone = task.status === StatusType.FINISHED;
 const subtasks = (task.subtasks ?? []) as unknown as Subtask[];
 const todos = task.todos ?? [];
 const progressLanes = calculateTaskProgressLanes(task);

 return (
 <div className="min-h-screen" style={{ background: 'var(--tn-bg)' }}>
 <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
 <div className="flex items-center justify-between mb-6">
 <button
 onClick={() => router.back()}
 className="btn btn-ghost"
 >
 <ChevronLeft className="w-4 h-4 mr-1" /> Back
 </button>
 <button
 onClick={() => setConfirmDelete(true)}
 className="btn"
 style={{ background: 'var(--tn-bad, #c25d63)', color: '#fff' }}
 >
 <Trash2 className="w-4 h-4" />
 <span>Delete</span>
 </button>
 </div>

 <div className="card mb-6">
 <div className="space-y-1 mb-4 text-xs">
 {goal && (
 <Link href={`/goal/${goal.id}`} className="flex items-center hover:underline" style={{ color: 'var(--tn-accent)' }}>
 <Target className="w-3 h-3 mr-1" />
 {goal.title}
 </Link>
 )}
 {milestone && (
 <Link href={`/milestone/${milestone.id}`} className="flex items-center hover:underline" style={{ color: 'var(--tn-plum, #8a6594)' }}>
 <Flag className="w-3 h-3 mr-1" />
 {milestone.title}
 </Link>
 )}
 </div>
 <div className="flex items-start space-x-3 mb-3">
 <button
 onClick={toggleTask}
 aria-label={isDone ? 'Mark as outstanding' : 'Mark as finished'}
 className="mt-1 flex-shrink-0 focus:outline-none"
 >
 {isDone ? (
 <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--tn-good, #2f7d50)' }} />
 ) : (
 <Circle className="w-6 h-6 text-muted-foreground hover:text-foreground" />
 )}
 </button>
 <div className="flex-1">
 <h1 className={`text-2xl font-bold mb-1 ${isDone ? 'line-through text-muted-foreground dark:text-muted-foreground' : 'text-foreground'}`}>
 {task.title}
 </h1>
 {task.description && (
 <Markdown
 source={task.description}
 className={isDone ? 'text-muted-foreground dark:text-muted-foreground' : 'text-foreground dark:text-muted-foreground/60'}
 />
 )}
 {task.success_criteria && (
 <div
 className="mt-4 rounded-xl border px-3 py-2.5"
 style={{
 background: 'color-mix(in srgb, var(--tn-accent) 6%, var(--tn-card))',
 borderColor: 'color-mix(in srgb, var(--tn-accent) 18%, transparent)',
 }}
 >
 <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--tn-accent)' }}>Success criteria</div>
 <p className="text-sm text-foreground">{task.success_criteria}</p>
 </div>
 )}
 </div>
 </div>
 <div className="flex flex-wrap gap-3 text-xs text-muted-foreground dark:text-muted-foreground">
 <span>Status: {task.status}</span>
 <span>Priority: {task.priority}</span>
 {task.due_date && <span>Due: {formatDate(task.due_date)}</span>}
 </div>
 </div>

 <ProgressLanes lanes={progressLanes} className="mb-6" />
 <CompletionRulePanel
 entity={task}
 entityType="task"
 onSaved={(entity) => {
 updateTaskInGoals(entity as Task);
 void fetchGoals({ force: true, silent: true });
 }}
 />

 {subtasks.length > 0 && (
 <Section title="Subtasks">
 {subtasks.map((s) => (
 <ChildRow
 key={s.id}
 title={s.title}
 description={s.description}
 done={s.status === StatusType.FINISHED}
 onToggle={() => toggleChild('subtask', s)}
 onOpen={() => void toggleSubtaskDetails(s)}
 expanded={expandedSubtaskId === s.id}
 >
 <SubtaskDetails
 subtask={subtaskDetails[s.id] ?? s}
 loading={loadingSubtaskId === s.id}
 />
 </ChildRow>
 ))}
 </Section>
 )}

 {todos.length > 0 && (
 <Section title="Todos">
 {todos.map((t) => (
 <ChildRow
 key={t.id}
 title={t.title}
 description={t.description}
 done={t.status === StatusType.FINISHED}
 onToggle={() => toggleChild('todo', t)}
 />
 ))}
 </Section>
 )}

 {subtasks.length === 0 && todos.length === 0 && (
 <div className="card text-sm text-center" style={{ color: 'var(--tn-fg-muted)' }}>
 No subtasks or todos yet. Add them from the parent milestone.
 </div>
 )}

 <ConfirmDialog
 open={confirmDelete}
 title="Delete task"
 description="Linked subtasks and todos will be removed. This cannot be undone."
 destructive
 confirmLabel="Delete"
 busy={isDeleting}
 onConfirm={performDelete}
 onCancel={() => !isDeleting && setConfirmDelete(false)}
 />
 </main>
 </div>
 );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
 <div className="card mb-4" style={{ padding: 16 }}>
 <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground mb-3">
 {title}
 </h2>
 <ul className="space-y-2">{children}</ul>
 </div>
);

const ChildRow: React.FC<{
 title: string;
 description?: string;
 done: boolean;
 onToggle: () => void;
 onOpen?: () => void;
 expanded?: boolean;
 children?: React.ReactNode;
}> = ({ title, description, done, onToggle, onOpen, expanded = false, children }) => (
 <li
 className="rounded-xl px-3 py-2"
 style={{ transition: 'background .15s', background: expanded ? 'var(--tn-hover)' : 'transparent' }}
 >
 <div className="flex items-start gap-3">
 <button
 type="button"
 onClick={onToggle}
 aria-label={done ? 'Mark as outstanding' : 'Mark as finished'}
 className="mt-0.5 flex-shrink-0"
 >
 {done
 ? <CheckCircle2 className="h-5 w-5" style={{ color: 'var(--tn-good, #2f7d50)' }} />
 : <Circle className="h-5 w-5 text-muted-foreground hover:text-foreground" />}
 </button>

 {onOpen ? (
 <button
 type="button"
 onClick={onOpen}
 aria-expanded={expanded}
 className="flex min-w-0 flex-1 items-start gap-3 text-left"
 >
 <div className="min-w-0 flex-1">
 <div className={`truncate text-sm font-medium ${done ? 'line-through text-muted-foreground dark:text-muted-foreground' : 'text-foreground'}`}>
 {title}
 </div>
 {description && <div className="truncate text-xs text-muted-foreground">{description}</div>}
 </div>
 {expanded
 ? <ChevronDown className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
 : <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />}
 </button>
 ) : (
 <div className="min-w-0 flex-1">
 <div className={`truncate text-sm font-medium ${done ? 'line-through text-muted-foreground dark:text-muted-foreground' : 'text-foreground'}`}>
 {title}
 </div>
 {description && <div className="truncate text-xs text-muted-foreground">{description}</div>}
 </div>
 )}
 </div>
 {expanded && children}
 </li>
);

const SubtaskDetails: React.FC<{ subtask: Subtask; loading: boolean }> = ({ subtask, loading }) => (
 <div
 className="ml-8 mt-3 rounded-xl border p-4"
 style={{ border: 'var(--tn-line)', background: 'var(--tn-card)' }}
 >
 {loading ? (
 <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
 <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
 Loading subtask…
 </div>
 ) : (
 <>
 <div className="mb-3 flex flex-wrap items-center gap-2">
 <span
 className="rounded-full px-2.5 py-1 text-xs font-medium"
 style={{ background: 'var(--tn-chip)', color: 'var(--tn-fg-muted)' }}
 >
 Subtask
 </span>
 <span className="text-xs capitalize text-muted-foreground">{subtask.status}</span>
 </div>

 {subtask.description ? (
 <Markdown source={subtask.description} className="mb-4 text-sm text-foreground" />
 ) : (
 <p className="mb-4 text-sm text-muted-foreground">No description.</p>
 )}

 <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
 <EntityDetail label="Priority" value={subtask.priority} />
 <EntityDetail label="Due" value={subtask.due_date ? formatDate(subtask.due_date) : '—'} />
 <EntityDetail label="Started" value={subtask.start_datetime ? formatDate(subtask.start_datetime) : '—'} />
 <EntityDetail label="Completed" value={subtask.end_datetime ? formatDate(subtask.end_datetime) : '—'} />
 </dl>
 </>
 )}
 </div>
);

const EntityDetail: React.FC<{ label: string; value: string }> = ({ label, value }) => (
 <div className="min-w-0">
 <dt className="mb-1 uppercase tracking-wide text-muted-foreground">{label}</dt>
 <dd className="truncate font-medium capitalize text-foreground" title={value}>{value}</dd>
 </div>
);

export default withAuth(TaskDetailPage);
