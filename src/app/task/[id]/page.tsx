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
import { ChevronLeft, Target, Flag, CheckCircle2, Circle, Trash2 } from 'lucide-react';

const TaskDetailPage: React.FC = () => {
 const params = useParams();
 const router = useRouter();
 const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params!.id[0] : '';

 // Locate the task across the entire tree to recover breadcrumb context.
 const ctx = useStore((s) => {
 for (const goal of s.goals) {
 for (const milestone of goal.milestones ?? []) {
 const task = milestone.tasks?.find((t) => t.id === id);
 if (task) return { task, goal, milestone };
 }
 }
 const flat = s.tasks.find((t) => t.id === id);
 if (flat) return { task: flat, goal: undefined, milestone: undefined };
 return { task: undefined, goal: undefined, milestone: undefined };
 });

 const { updateTaskInGoals, updateTodoInGoals, updateSubtaskInGoals, deleteTaskFromGoals } = useStore(
 useShallow((s) => ({
 updateTaskInGoals: s.updateTaskInGoals,
 updateTodoInGoals: s.updateTodoInGoals,
 updateSubtaskInGoals: s.updateSubtaskInGoals,
 deleteTaskFromGoals: s.deleteTaskFromGoals,
 }))
 );

 const [isLoading, setIsLoading] = useState(!ctx.task);
 const [confirmDelete, setConfirmDelete] = useState(false);
 const [isDeleting, setIsDeleting] = useState(false);
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
 updateSubtaskInGoals({ ...updated, end_datetime: updated.end_datetime ?? localStamp });
 } else {
 const updated = await todosApi.update(patch);
 updateTodoInGoals({ ...updated, end_datetime: updated.end_datetime ?? localStamp });
 }
 } catch (err) {
 console.error(err);
 toast.error(`Failed to update ${kind}`);
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
 <div className="min-h-screen bg-muted dark:bg-card flex items-center justify-center">
 <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
 </div>
 );
 }

 if (!task) {
 return (
 <div className="min-h-screen bg-muted dark:bg-card flex items-center justify-center px-4">
 <div className="max-w-md w-full text-center bg-card dark:bg-card rounded-xl border border-border dark:border-border p-8">
 <h1 className="text-2xl font-semibold text-foreground mb-3">Task not found</h1>
 <Link
 href="/task"
 className="inline-block px-4 py-2 rounded-lg bg-card dark:bg-card text-white hover:bg-card dark:hover:bg-muted"
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

 return (
 <div className="min-h-screen bg-muted dark:bg-card">
 <main className="container mx-auto px-6 py-8 max-w-3xl">
 <div className="flex items-center justify-between mb-6">
 <button
 onClick={() => router.back()}
 className="flex items-center text-sm text-foreground dark:text-muted-foreground/60 hover:text-foreground dark:hover:text-white"
 >
 <ChevronLeft className="w-4 h-4 mr-1" /> Back
 </button>
 <button
 onClick={() => setConfirmDelete(true)}
 className="flex items-center space-x-1 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
 >
 <Trash2 className="w-4 h-4" />
 <span>Delete</span>
 </button>
 </div>

 <div className="bg-card dark:bg-card rounded-xl border border-border dark:border-border p-6 mb-6">
 <div className="space-y-1 mb-4 text-xs">
 {goal && (
 <Link href={`/goal/${goal.id}`} className="flex items-center text-blue-600 dark:text-blue-400 hover:underline">
 <Target className="w-3 h-3 mr-1" />
 {goal.title}
 </Link>
 )}
 {milestone && (
 <Link href={`/milestone/${milestone.id}`} className="flex items-center text-purple-600 dark:text-purple-400 hover:underline">
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
 <CheckCircle2 className="w-6 h-6 text-green-500" />
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
 </div>
 </div>
 <div className="flex flex-wrap gap-3 text-xs text-muted-foreground dark:text-muted-foreground">
 <span>Status: {task.status}</span>
 <span>Priority: {task.priority}</span>
 {task.due_date && <span>Due: {formatDate(task.due_date)}</span>}
 </div>
 </div>

 {subtasks.length > 0 && (
 <Section title="Subtasks">
 {subtasks.map((s) => (
 <ChildRow
 key={s.id}
 title={s.title}
 description={s.description}
 done={s.status === StatusType.FINISHED}
 onToggle={() => toggleChild('subtask', s)}
 />
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
 <div className="bg-card dark:bg-card rounded-xl border border-border dark:border-border p-6 text-sm text-muted-foreground dark:text-muted-foreground text-center">
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
 <div className="bg-card dark:bg-card rounded-xl border border-border dark:border-border p-4 mb-4">
 <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground mb-3">
 {title}
 </h2>
 <ul className="space-y-2">{children}</ul>
 </div>
);

const ChildRow: React.FC<{ title: string; description?: string; done: boolean; onToggle: () => void }> = ({
 title,
 description,
 done,
 onToggle,
}) => (
 <li className="flex items-start space-x-3 px-3 py-2 rounded-lg hover:bg-muted dark:hover:bg-card/40">
 <button onClick={onToggle} aria-label={done ? 'Mark as outstanding' : 'Mark as finished'} className="mt-0.5 flex-shrink-0">
 {done ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-muted-foreground hover:text-foreground" />}
 </button>
 <div className="flex-1 min-w-0">
 <div className={`text-sm font-medium truncate ${done ? 'line-through text-muted-foreground dark:text-muted-foreground' : 'text-foreground'}`}>
 {title}
 </div>
 {description && (
 <div className={`text-xs truncate ${done ? 'text-muted-foreground dark:text-muted-foreground' : 'text-muted-foreground dark:text-muted-foreground'}`}>
 {description}
 </div>
 )}
 </div>
 </li>
);

export default withAuth(TaskDetailPage);
