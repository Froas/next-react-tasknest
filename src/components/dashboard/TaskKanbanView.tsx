'use client';

import React, { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
 TaskItem as Task,
 TodoItem as Todo,
 SubtaskItem as Subtask,
 StatusType,
 TaskKind,
} from '@/lib/types';
import { CheckCircle2, ChevronRight, Circle, Plus, Repeat2, X } from 'lucide-react';
import { STATUS_LABELS } from '@/lib/sort';
import { InlineSelect, InlineText } from '@/components/ui/InlineEdit';

interface TaskListViewProps {
 tasks: Task[];
 onTaskToggle: (taskId: string, currentStatus: StatusType) => void;
 onSubtaskToggle: (subtaskId: string, currentStatus: StatusType, parentTaskId: string) => void;
 onTodoToggle: (todoId: string, currentStatus: StatusType, parentTaskId: string) => void;
 onTaskUpdate: (taskId: string, data: Partial<Task>) => void | Promise<void>;
 onSubtaskUpdate: (subtaskId: string, data: Partial<Subtask>) => void | Promise<void>;
 onTodoUpdate: (todoId: string, data: Partial<Todo>) => void | Promise<void>;
 onAddTask: () => void;
 onQuickAddTask?: (title: string, kind: Extract<TaskKind, 'project' | 'challenge'>) => Promise<void> | void;
 onAddTodo: (task: Task) => void;
 onAddSubtask: (task: Task) => void;
 onReorderTask?: (draggedTaskId: string, beforeTaskId: string) => Promise<void> | void;
 isUpdating: boolean;
}

interface TaskCardProps {
 task: Task;
 onTaskToggle: TaskListViewProps['onTaskToggle'];
 onOpen: (task: Task) => void;
 onReorderDrop?: TaskListViewProps['onReorderTask'];
 isUpdating: boolean;
}

const typeTone = (type: 'todo' | 'subtask') =>
 type === 'todo' ? 'var(--tn-accent)' : 'var(--tn-accent-2, var(--tn-accent))';

const toneSurface = (tone: string, amount = 10): CSSProperties => ({
 background: `color-mix(in srgb, ${tone} ${amount}%, var(--tn-card))`,
 border: `1px solid color-mix(in srgb, ${tone} ${Math.max(amount + 14, 26)}%, transparent)`,
});

const statusTone = (status: StatusType) => {
 if (status === StatusType.FINISHED || status === StatusType.CLOSED) return 'var(--tn-good, #2f7d50)';
 if (status === StatusType.IN_PROGRESS) return 'var(--tn-warn, #c8932a)';
 if (status === StatusType.STARTED) return 'var(--tn-accent)';
 if (status === StatusType.ABORTED || status === StatusType.CANCELLED) return 'var(--tn-bad, #c25d63)';
 return 'var(--tn-fg-muted)';
};

const taskStatusOptions = [
 StatusType.OUTSTANDING,
 StatusType.STARTED,
 StatusType.IN_PROGRESS,
 StatusType.FINISHED,
 StatusType.CLOSED,
 StatusType.ABORTED,
 StatusType.CANCELLED,
] as const;

const repeatIntervalOptions = ['daily', 'weekly', 'monthly', 'yearly'] as const;

const challengeContext = (task: Task) => {
 if (task.kind !== 'challenge') return '';
 if (task.status === StatusType.FINISHED || task.status === StatusType.CLOSED) return 'Completed';
 const rule = task.completion_rule?.type === 'consistency'
 ? task.completion_rule
 : task.completion_rule?.type === 'hybrid'
 ? task.completion_rule.consistency
 : undefined;
 const stageTodo = task.todos?.find((todo) => todo.tracking_mode === 'staged' && todo.tracking_state === 'active')
 ?? [...(task.todos ?? [])]
 .filter((todo) => todo.tracking_mode === 'staged')
 .sort((a, b) => (b.stage_order ?? 1) - (a.stage_order ?? 1))[0];
 const parts: string[] = [];
 if (stageTodo) parts.push(`Stage ${stageTodo.stage_order ?? 1}`);
 if (rule?.required_done) parts.push(`${rule.current_done ?? 0}/${rule.required_done}`);
 return parts.join(' · ');
};

const definitionContext = (todo: Todo) => {
 if (todo.tracking_mode === 'staged') {
 return `Stage ${todo.stage_order ?? 1}${todo.tracking_state ? ` · ${todo.tracking_state}` : ''}`;
 }
 if (todo.tracking_mode === 'bounded') return 'Until challenge target';
 return todo.repeat_interval || 'daily';
};

const DefinitionRow: React.FC<{
 todo: Todo;
 onUpdate: TaskListViewProps['onTodoUpdate'];
}> = ({ todo, onUpdate }) => (
 <div className="flex items-start gap-2 py-3" style={{ borderBottom: 'var(--tn-line)' }}>
 <Repeat2 className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: typeTone('todo') }} />
 <div className="min-w-0 flex-1">
 <InlineText
 value={todo.title}
 required
 ariaLabel={`Edit ${todo.title} title`}
 className="-mx-1 px-1 text-xs font-medium text-foreground"
 editClassName="text-xs font-medium text-foreground"
 onSave={(title) => onUpdate(todo.id, { title })}
 />
 <InlineText
 value={todo.description ?? ''}
 placeholder="Add description…"
 multiline
 ariaLabel={`Edit ${todo.title} description`}
 className="-mx-1 mt-0.5 px-1 text-xs text-muted-foreground"
 editClassName="text-xs text-foreground"
 onSave={(description) => onUpdate(todo.id, { description })}
 />
 </div>
 {todo.tracking_mode === 'staged' || todo.tracking_mode === 'bounded' ? (
 <span className="shrink-0 text-[10px] capitalize text-muted-foreground">{definitionContext(todo)}</span>
 ) : (
 <InlineSelect
 value={todo.repeat_interval || 'daily'}
 options={repeatIntervalOptions}
 ariaLabel={`Edit ${todo.title} repeat interval`}
 className="shrink-0 rounded-full px-2 py-1 text-[10px] capitalize text-muted-foreground"
 selectClassName="text-xs capitalize"
 renderValue={(repeatInterval) => <span className="capitalize">{repeatInterval}</span>}
 onSave={(repeat_interval) => onUpdate(todo.id, { repeat_interval })}
 />
 )}
 </div>
);

const StepRow: React.FC<{
 step: Subtask;
 parentTaskId: string;
 onToggle: TaskListViewProps['onSubtaskToggle'];
 onUpdate: TaskListViewProps['onSubtaskUpdate'];
 isUpdating: boolean;
}> = ({ step, parentTaskId, onToggle, onUpdate, isUpdating }) => {
 const done = step.status === StatusType.FINISHED;
 return (
 <div className="flex items-start gap-2 py-3" style={{ borderBottom: 'var(--tn-line)' }}>
 <button
 type="button"
 onClick={() => onToggle(step.id, step.status, parentTaskId)}
 disabled={isUpdating}
 className="mt-0.5 shrink-0 rounded"
 aria-label={done ? `Reopen ${step.title}` : `Complete ${step.title}`}
 >
 {done
 ? <CheckCircle2 className="h-3.5 w-3.5" style={{ color: 'var(--tn-good, #2f7d50)' }} />
 : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
 </button>
 <div className="min-w-0 flex-1">
 <InlineText
 value={step.title}
 required
 ariaLabel={`Edit ${step.title} title`}
 className={`-mx-1 px-1 text-xs font-medium ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}
 editClassName="text-xs font-medium text-foreground"
 onSave={(title) => onUpdate(step.id, { title })}
 />
 <InlineText
 value={step.description ?? ''}
 placeholder="Add description…"
 multiline
 ariaLabel={`Edit ${step.title} description`}
 className="-mx-1 mt-0.5 px-1 text-xs text-muted-foreground"
 editClassName="text-xs text-foreground"
 onSave={(description) => onUpdate(step.id, { description })}
 />
 </div>
 </div>
 );
};

const TaskCard: React.FC<TaskCardProps> = ({
 task,
 onTaskToggle,
 onOpen,
 onReorderDrop,
 isUpdating,
}) => {
 const [dragging, setDragging] = useState(false);
 const [dropTarget, setDropTarget] = useState(false);
 const done = task.status === StatusType.FINISHED || task.status === StatusType.CLOSED;
 const todos = task.todos ?? [];
 const subtasks = task.subtasks ?? [];
 const completedSteps = subtasks.filter((item) => item.status === StatusType.FINISHED).length;
 const challengeDetail = challengeContext(task);

 return (
 <article
 draggable
 onClick={() => onOpen(task)}
 onDragStart={(event) => {
 event.dataTransfer.effectAllowed = 'move';
 event.dataTransfer.setData('application/x-tasknest-task-id', task.id);
 event.dataTransfer.setData('application/x-tasknest-from-milestone-id', task.milestone_id ?? '');
 setDragging(true);
 }}
 onDragEnd={() => {
 setDragging(false);
 setDropTarget(false);
 }}
 onDragOver={(event) => {
 if (!onReorderDrop || !event.dataTransfer.types.includes('application/x-tasknest-task-id')) return;
 const sourceMilestone = event.dataTransfer.getData('application/x-tasknest-from-milestone-id');
 if (sourceMilestone && sourceMilestone !== (task.milestone_id ?? '')) return;
 event.preventDefault();
 event.stopPropagation();
 event.dataTransfer.dropEffect = 'move';
 setDropTarget(true);
 }}
 onDragLeave={() => setDropTarget(false)}
 onDrop={(event) => {
 if (!onReorderDrop) return;
 const draggedId = event.dataTransfer.getData('application/x-tasknest-task-id');
 if (!draggedId || draggedId === task.id) {
 setDropTarget(false);
 return;
 }
 const sourceMilestone = event.dataTransfer.getData('application/x-tasknest-from-milestone-id');
 if (sourceMilestone && sourceMilestone !== (task.milestone_id ?? '')) return;
 event.preventDefault();
 event.stopPropagation();
 setDropTarget(false);
 void onReorderDrop(draggedId, task.id);
 }}
 className={`flex min-h-44 cursor-grab flex-col overflow-hidden rounded-xl active:cursor-grabbing ${dragging ? 'opacity-50' : ''}`}
 style={{
 background: 'var(--tn-card)',
 border: dropTarget ? '2px solid var(--tn-accent)' : 'var(--tn-card-border, var(--tn-line))',
 boxShadow: dropTarget ? '0 0 0 2px color-mix(in srgb, var(--tn-accent) 22%, transparent)' : 'var(--tn-shadow)',
 }}
 >
 <div className="flex flex-1 items-start gap-3 p-4">
 <button
 type="button"
 onClick={(event) => {
 event.stopPropagation();
 onTaskToggle(task.id, task.status);
 }}
 disabled={isUpdating}
 className="mt-0.5 shrink-0 rounded"
 aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
 >
 {done
 ? <CheckCircle2 className="h-5 w-5" style={{ color: 'var(--tn-good, #2f7d50)' }} />
 : <Circle className="h-5 w-5 text-muted-foreground hover:text-foreground" />}
 </button>

 <div className="min-w-0 flex-1">
 <div className="flex flex-wrap items-center gap-2">
 {task.kind === 'challenge' && (
 <span
 className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
 style={{ ...toneSurface('var(--tn-accent)', 10), color: 'var(--tn-accent)' }}
 >
 <Repeat2 className="h-3 w-3" /> Challenge
 </span>
 )}
 <h4 className={`text-sm font-semibold ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.title}</h4>
 </div>
 {task.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>}
 <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
 <span style={{ color: statusTone(task.status) }}>{STATUS_LABELS[task.status]}</span>
 {task.kind === 'challenge' && <span>{todos.length} repeating action{todos.length === 1 ? '' : 's'}</span>}
 <span>{completedSteps}/{subtasks.length} {task.kind === 'challenge' ? 'setup' : 'steps'}</span>
 </div>
 </div>

 <div className="shrink-0 pl-2">
 <button
 type="button"
 onClick={(event) => {
 event.stopPropagation();
 onOpen(task);
 }}
 className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
 aria-label={`Open ${task.title} details`}
 >
 <ChevronRight className="h-4 w-4" />
 </button>
 </div>
 </div>

 <button
 type="button"
 onClick={(event) => {
 event.stopPropagation();
 onOpen(task);
 }}
 className="flex items-center justify-between gap-3 border-t px-4 py-2.5 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
 style={{ borderTop: 'var(--tn-line)', background: 'color-mix(in srgb, var(--tn-hover) 48%, var(--tn-card))' }}
 >
 <span>{challengeDetail || (subtasks.length > 0 ? `${completedSteps}/${subtasks.length} steps` : 'View details')}</span>
 <span className="font-medium" style={{ color: 'var(--tn-accent)' }}>Details</span>
 </button>
 </article>
 );
};

interface TaskDetailsDrawerProps {
 task: Task | null;
 onClose: () => void;
 onTaskToggle: TaskListViewProps['onTaskToggle'];
 onSubtaskToggle: TaskListViewProps['onSubtaskToggle'];
 onTaskUpdate: TaskListViewProps['onTaskUpdate'];
 onSubtaskUpdate: TaskListViewProps['onSubtaskUpdate'];
 onTodoUpdate: TaskListViewProps['onTodoUpdate'];
 onAddTodo: TaskListViewProps['onAddTodo'];
 onAddSubtask: TaskListViewProps['onAddSubtask'];
 isUpdating: boolean;
}

const TaskDetailsDrawer: React.FC<TaskDetailsDrawerProps> = ({
 task,
 onClose,
 onTaskToggle,
 onSubtaskToggle,
 onTaskUpdate,
 onSubtaskUpdate,
 onTodoUpdate,
 onAddTodo,
 onAddSubtask,
 isUpdating,
}) => {
 const [mounted, setMounted] = useState(false);

 useEffect(() => setMounted(true), []);
 useEffect(() => {
 if (!task) return;
 const previousOverflow = document.body.style.overflow;
 const handleKeyDown = (event: KeyboardEvent) => {
 if (event.defaultPrevented) return;
 if (event.key === 'Escape') onClose();
 };
 document.body.style.overflow = 'hidden';
 window.addEventListener('keydown', handleKeyDown);
 return () => {
 document.body.style.overflow = previousOverflow;
 window.removeEventListener('keydown', handleKeyDown);
 };
 }, [onClose, task]);

 if (!mounted || !task) return null;

 const done = task.status === StatusType.FINISHED || task.status === StatusType.CLOSED;
 const todos = task.todos ?? [];
 const subtasks = task.subtasks ?? [];
 const completedSteps = subtasks.filter((item) => item.status === StatusType.FINISHED).length;
 const challengeDetail = challengeContext(task);

 return createPortal(
 <div className="fixed inset-0 z-50">
 <button
 type="button"
 className="absolute inset-0 h-full w-full cursor-default"
 style={{ background: 'color-mix(in srgb, var(--tn-fg) 28%, transparent)' }}
 onClick={onClose}
 aria-label="Close task details"
 />
 <aside
 role="dialog"
 aria-modal="true"
 aria-labelledby={`task-drawer-${task.id}`}
 className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col"
 style={{
 background: 'var(--tn-card)',
 borderLeft: 'var(--tn-line)',
 boxShadow: 'var(--tn-shadow-lg, var(--tn-shadow))',
 }}
 >
 <header className="flex items-start gap-3 border-b p-5" style={{ borderBottom: 'var(--tn-line)' }}>
 <button
 type="button"
 onClick={() => onTaskToggle(task.id, task.status)}
 disabled={isUpdating}
 className="mt-0.5 shrink-0 rounded"
 aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
 >
 {done
 ? <CheckCircle2 className="h-5 w-5" style={{ color: 'var(--tn-good, #2f7d50)' }} />
 : <Circle className="h-5 w-5 text-muted-foreground" />}
 </button>
 <div className="min-w-0 flex-1">
 <div className="mb-1 flex flex-wrap items-center gap-2">
 {task.kind === 'challenge' && (
 <span
 className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
 style={{ ...toneSurface('var(--tn-accent)', 10), color: 'var(--tn-accent)' }}
 >
 <Repeat2 className="h-3 w-3" /> Challenge
 </span>
 )}
 <InlineSelect
 value={task.status}
 options={taskStatusOptions}
 ariaLabel="Edit task status"
 className="rounded-full px-1.5 py-0.5 text-xs"
 selectClassName="text-xs"
 renderValue={(status) => <span style={{ color: statusTone(status) }}>{STATUS_LABELS[status]}</span>}
 onSave={(status) => onTaskUpdate(task.id, { status })}
 />
 </div>
 <InlineText
 value={task.title}
 required
 ariaLabel="Edit task title"
 className="-mx-2 px-2 py-0.5"
 editClassName="text-lg font-semibold text-foreground"
 renderValue={(title) => (
 <h3 id={`task-drawer-${task.id}`} className={`text-lg font-semibold ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
 {title}
 </h3>
 )}
 onSave={(title) => onTaskUpdate(task.id, { title })}
 />
 <InlineText
 value={task.description ?? ''}
 placeholder="Add a description…"
 multiline
 ariaLabel="Edit task description"
 className="-mx-2 mt-1 px-2 py-0.5 text-sm text-muted-foreground"
 editClassName="text-sm text-foreground"
 onSave={(description) => onTaskUpdate(task.id, { description })}
 />
 </div>
 <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
 <X className="h-4 w-4" />
 </button>
 </header>

 <div className="flex-1 overflow-y-auto p-5">
 <div className="mb-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
 {challengeDetail && <span className="font-semibold text-foreground">{challengeDetail}</span>}
 {task.kind === 'challenge' && <span>{todos.length} repeating action{todos.length === 1 ? '' : 's'}</span>}
 <span>{completedSteps}/{subtasks.length} {task.kind === 'challenge' ? 'setup' : 'steps'}</span>
 </div>

 <div className="space-y-6">
 {task.kind === 'challenge' && (
 <section>
 <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Repeating actions</h4>
 {todos.length > 0
 ? <div>{todos.map((todo) => <DefinitionRow key={todo.id} todo={todo} onUpdate={onTodoUpdate} />)}</div>
 : <p className="text-sm text-muted-foreground">No repeating actions yet.</p>}
 </section>
 )}

 <section>
 <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
 {task.kind === 'challenge' ? 'Setup steps' : 'Steps'}
 </h4>
 {subtasks.length > 0
 ? (
 <div className="space-y-2">
 {subtasks.map((step) => (
 <StepRow
 key={step.id}
 step={step}
 parentTaskId={task.id}
 onToggle={onSubtaskToggle}
 onUpdate={onSubtaskUpdate}
 isUpdating={isUpdating}
 />
 ))}
 </div>
 )
 : <p className="text-sm text-muted-foreground">No {task.kind === 'challenge' ? 'setup steps' : 'steps'} yet.</p>}
 </section>
 </div>
 </div>

 <footer className="flex flex-wrap items-center gap-2 border-t p-4" style={{ borderTop: 'var(--tn-line)', background: 'color-mix(in srgb, var(--tn-hover) 44%, var(--tn-card))' }}>
 {task.kind === 'challenge' && (
 <button
 type="button"
 onClick={() => { onClose(); onAddTodo(task); }}
 className="btn btn-secondary text-xs"
 style={{ color: typeTone('todo') }}
 >
 <Repeat2 className="h-3.5 w-3.5" /> Add repeating action
 </button>
 )}
 <button
 type="button"
 onClick={() => { onClose(); onAddSubtask(task); }}
 className="btn btn-secondary text-xs"
 style={{ color: typeTone('subtask') }}
 >
 <Plus className="h-3.5 w-3.5" /> Add {task.kind === 'challenge' ? 'setup step' : 'step'}
 </button>
 </footer>
 </aside>
 </div>,
 document.body,
 );
};

type TypeFilter = 'all' | 'project' | 'challenge';
type StatusFilter = 'all' | 'open' | 'done';

const TaskListView: React.FC<TaskListViewProps> = ({
 tasks,
 onTaskToggle,
 onSubtaskToggle,
 onTaskUpdate,
 onSubtaskUpdate,
 onTodoUpdate,
 onAddTask,
 onQuickAddTask,
 onAddTodo,
 onAddSubtask,
 onReorderTask,
 isUpdating,
}) => {
 const [quickDraft, setQuickDraft] = useState('');
 const [quickKind, setQuickKind] = useState<Extract<TaskKind, 'project' | 'challenge'>>('project');
 const [quickBusy, setQuickBusy] = useState(false);
 const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
 const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
 const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

 const typeCounts = useMemo(() => ({
 all: tasks.length,
 project: tasks.filter((task) => task.kind !== 'challenge').length,
 challenge: tasks.filter((task) => task.kind === 'challenge').length,
 }), [tasks]);

 const visibleTasks = useMemo(() => tasks.filter((task) => {
 if (typeFilter === 'project' && task.kind === 'challenge') return false;
 if (typeFilter === 'challenge' && task.kind !== 'challenge') return false;
 const done = task.status === StatusType.FINISHED || task.status === StatusType.CLOSED;
 if (statusFilter === 'open' && done) return false;
 if (statusFilter === 'done' && !done) return false;
 return true;
 }), [statusFilter, tasks, typeFilter]);

 const selectedTask = useMemo(
 () => tasks.find((task) => task.id === selectedTaskId) ?? null,
 [selectedTaskId, tasks],
 );

 const submitQuick = async (event: React.FormEvent) => {
 event.preventDefault();
 const title = quickDraft.trim();
 if (!title || !onQuickAddTask) return;
 setQuickBusy(true);
 try {
 await onQuickAddTask(title, quickKind);
 setQuickDraft('');
 } finally {
 setQuickBusy(false);
 }
 };

 const typeOptions: Array<{ value: TypeFilter; label: string }> = [
 { value: 'all', label: 'All' },
 { value: 'project', label: 'Tasks' },
 { value: 'challenge', label: 'Challenges' },
 ];

 return (
 <div className="w-full">
 <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
 <div className="flex flex-wrap items-center gap-2">
 <h4 className="mr-1 text-sm font-semibold text-foreground">Tasks</h4>
 {typeOptions.map((option) => (
 <button
 key={option.value}
 type="button"
 onClick={() => setTypeFilter(option.value)}
 className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
 style={typeFilter === option.value
 ? {
 background: 'color-mix(in srgb, var(--tn-accent) 14%, var(--tn-card))',
 border: 'var(--tn-line)',
 boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--tn-accent) 42%, transparent)',
 color: 'var(--tn-accent)',
 }
 : { background: 'var(--tn-card)', border: 'var(--tn-line)', color: 'var(--tn-fg-muted)' }}
 >
 {option.label} <span className="ml-1 opacity-70">{typeCounts[option.value]}</span>
 </button>
 ))}
 <select
 value={statusFilter}
 onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
 className="filter-input h-8 min-h-8 w-auto py-1 text-xs"
 aria-label="Filter tasks by status"
 >
 <option value="all">All statuses</option>
 <option value="open">Open</option>
 <option value="done">Completed</option>
 </select>
 </div>

 <div className="flex min-w-0 flex-1 items-center gap-2 xl:max-w-xl xl:justify-end">
 {onQuickAddTask && (
 <form onSubmit={submitQuick} className="flex min-w-0 flex-1 items-center gap-1">
 <select
 value={quickKind}
 onChange={(event) => setQuickKind(event.target.value as typeof quickKind)}
 className="filter-input h-10 min-h-10 w-auto text-xs"
 aria-label="Quick add task type"
 >
 <option value="project">Task</option>
 <option value="challenge">Challenge</option>
 </select>
 <input
 value={quickDraft}
 onChange={(event) => setQuickDraft(event.target.value)}
 placeholder={quickKind === 'challenge' ? 'Quick add challenge…' : 'Quick add task…'}
 disabled={quickBusy}
 className="filter-input min-w-0 flex-1 disabled:opacity-50"
 />
 <button
 type="submit"
 disabled={!quickDraft.trim() || quickBusy}
 className="btn px-3 disabled:opacity-50"
 style={{
 background: 'color-mix(in srgb, var(--tn-accent) 12%, var(--tn-card))',
 border: '1px solid color-mix(in srgb, var(--tn-accent) 30%, transparent)',
 color: 'var(--tn-accent)',
 }}
 aria-label="Quick add"
 >
 ↵
 </button>
 </form>
 )}
 <button
 type="button"
 onClick={onAddTask}
 className="btn shrink-0"
 style={{ background: 'var(--tn-accent)', borderColor: 'var(--tn-accent)', color: 'var(--tn-on-accent)' }}
 >
 <Plus className="h-3.5 w-3.5" /> Full form
 </button>
 </div>
 </div>

 {visibleTasks.length > 0 ? (
 <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
 {visibleTasks.map((task) => (
 <TaskCard
 key={task.id}
 task={task}
 onTaskToggle={onTaskToggle}
 onOpen={(item) => setSelectedTaskId(item.id)}
 onReorderDrop={onReorderTask}
 isUpdating={isUpdating}
 />
 ))}
 </div>
 ) : tasks.length > 0 ? (
 <div
 className="rounded-xl px-4 py-8 text-center text-sm text-muted-foreground"
 style={{ border: '1px dashed color-mix(in srgb, var(--tn-fg-muted) 30%, transparent)' }}
 >
 No tasks match these filters.
 </div>
 ) : (
 <div className="rounded-xl border-2 border-dashed py-12 text-center" style={{ background: 'var(--tn-surface-2, var(--tn-hover))', borderColor: 'color-mix(in srgb, var(--tn-fg-muted) 26%, transparent)' }}>
 <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'var(--tn-chip)' }}>
 <Plus className="h-5 w-5 text-muted-foreground" />
 </div>
 <p className="mb-2 text-sm text-muted-foreground">No tasks yet</p>
 <button type="button" onClick={onAddTask} className="text-xs font-medium" style={{ color: 'var(--tn-accent)' }}>Add your first task</button>
 </div>
 )}

 <TaskDetailsDrawer
 task={selectedTask}
 onClose={() => setSelectedTaskId(null)}
 onTaskToggle={onTaskToggle}
 onSubtaskToggle={onSubtaskToggle}
 onTaskUpdate={onTaskUpdate}
 onSubtaskUpdate={onSubtaskUpdate}
 onTodoUpdate={onTodoUpdate}
 onAddTodo={onAddTodo}
 onAddSubtask={onAddSubtask}
 isUpdating={isUpdating}
 />
 </div>
 );
};

export default TaskListView;
