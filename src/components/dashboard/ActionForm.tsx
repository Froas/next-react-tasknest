import React, { useState } from 'react';
import { SubtaskItem as Subtask, TodoItem as Todo, StatusType, PriorityType, TaskKind } from '@/lib/types';
import { subtasksApi, todosApi } from '@/lib/api';
import { toDateInput, toDateTimeInput } from '@/lib/utils';
import { USER_FACING_STATUSES, STATUS_LABELS } from '@/lib/sort';
import { useFormDraft } from '@/lib/useFormDraft';

//"Action" is the unified UX for both Subtasks (one-time) and Todos
// (recurring). Both share title/description/status/priority/dates; the
// difference is whether the user wants the action to repeat — that's a
// single checkbox now. Internally we still call the right API to honour
// the backend split.

export type ActionKind = 'subtask' | 'todo';

interface ActionFormProps {
 goalId: string;
 milestoneId: string;
 taskId: string;
 taskKind?: TaskKind;
 defaultKind?: ActionKind;
 initialData?: Partial<Subtask | Todo>;
 onSuccess: (item: Subtask | Todo, kind: ActionKind, goalId: string, milestoneId: string, taskId: string) => void;
 onCancel: () => void;
}

const REPEAT_OPTIONS = [
 { value: '', label: 'No repeat' },
 { value: 'daily', label: 'Daily' },
 { value: 'weekly', label: 'Weekly' },
 { value: 'monthly', label: 'Monthly' },
 { value: 'yearly', label: 'Yearly' },
];

export const ActionForm: React.FC<ActionFormProps> = ({
 goalId,
 milestoneId,
 taskId,
 taskKind = 'project',
 defaultKind = 'subtask',
 initialData,
 onSuccess,
 onCancel,
}) => {
 const initialRepeat = (initialData as Partial<Todo> | undefined)?.repeat_interval ?? '';
 const [kind, setKind] = useState<ActionKind>(
 defaultKind === 'todo' || initialRepeat ? 'todo' : 'subtask'
 );

 const defaultEndIso = (() => {
 const d = new Date();
 d.setHours(d.getHours() + 1);
 return d.toISOString();
 })();

 const draftKey = initialData?.id
 ? `action:edit:${initialData.id}`
 : `action:new:${taskId}`;
 const [formData, setFormData, clearDraft] = useFormDraft(draftKey, {
 title: initialData?.title || '',
 description: initialData?.description || '',
 status: initialData?.status || StatusType.OUTSTANDING,
 priority: initialData?.priority || PriorityType.MEDIUM,
 due_date: toDateInput(initialData?.due_date),
 start_datetime: toDateTimeInput(initialData?.start_datetime),
 end_datetime: toDateTimeInput(initialData?.end_datetime ?? defaultEndIso),
 repeat_interval: initialRepeat,
 next_due_date: toDateInput((initialData as Partial<Todo> | undefined)?.next_due_date),
 tracking_mode: (initialData as Partial<Todo> | undefined)?.tracking_mode
 ?? (taskKind === 'routine' ? 'ongoing' : taskKind === 'challenge' ? 'bounded' : ''),
 tracking_state: (initialData as Partial<Todo> | undefined)?.tracking_state ?? '',
 routine_series_key: (initialData as Partial<Todo> | undefined)?.routine_series_key ?? '',
 stage_order: String((initialData as Partial<Todo> | undefined)?.stage_order ?? 1),
 });

 const [isSubmitting, setIsSubmitting] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const validate = (): string | null => {
 if (!formData.title.trim()) return 'Title is required';
 if (formData.title.length > 200) return 'Title must be under 200 characters';
 if (formData.start_datetime && formData.end_datetime) {
 if (new Date(formData.end_datetime) < new Date(formData.start_datetime)) {
 return 'End time cannot be before start time';
 }
 }
 if (kind === 'todo' && !formData.repeat_interval) {
 return 'Pick a repeat interval for recurring actions';
 }
 if (kind === 'todo' && formData.tracking_mode === 'staged' && !formData.routine_series_key.trim()) {
 return 'Give this progression a name';
 }
 return null;
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 const validationError = validate();
 if (validationError) {
 setError(validationError);
 return;
 }
 setIsSubmitting(true);
 setError(null);

 try {
 if (kind === 'todo') {
 const todoPayload = {
 title: formData.title,
 description: formData.description,
 status: formData.status,
 priority: formData.priority,
 due_date: formData.due_date,
 start_datetime: formData.start_datetime,
 end_datetime: formData.end_datetime,
 repeat_interval: formData.repeat_interval,
 next_due_date: formData.next_due_date,
 tracking_mode: formData.tracking_mode || undefined,
 tracking_state: formData.tracking_state || undefined,
 routine_series_key: formData.tracking_mode === 'staged' ? formData.routine_series_key : undefined,
 stage_order: formData.tracking_mode === 'staged' ? Math.max(1, Number(formData.stage_order) || 1) : 1,
 task_id: taskId,
 } as Omit<Todo, 'id'>;
 const todo = initialData?.id
 ? await todosApi.update({ ...todoPayload, id: initialData.id } as Partial<Todo> & { id: string })
 : await todosApi.create(todoPayload);
 onSuccess(todo, 'todo', goalId, milestoneId, taskId);
 clearDraft();
 } else {
 const subtaskPayload = {
 title: formData.title,
 description: formData.description,
 status: formData.status,
 priority: formData.priority,
 due_date: formData.due_date,
 start_datetime: formData.start_datetime,
 end_datetime: formData.end_datetime,
 task_id: taskId,
 } as Omit<Subtask, 'id'>;
 const subtask = initialData?.id
 ? await subtasksApi.update({ ...subtaskPayload, id: initialData.id })
 : await subtasksApi.create(subtaskPayload);
 onSuccess(subtask, 'subtask', goalId, milestoneId, taskId);
 clearDraft();
 }
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Failed to save action');
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleChange = (
 e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
 ) => {
 const { name, value } = e.target;
 setFormData((prev) => ({ ...prev, [name]: value }));
 };

 return (
 <form onSubmit={handleSubmit} className="min-w-0 space-y-3 sm:space-y-4">
 {error && (
 <div
 className="p-3 rounded-lg text-sm"
 style={{
 background: 'color-mix(in srgb, var(--tn-bad, #c25d63) 12%, var(--tn-card))',
 color: 'var(--tn-bad, #c25d63)',
 }}
 >
 {error}
 </div>
 )}

 <div className="grid grid-cols-1 gap-1 rounded-lg p-1 sm:grid-cols-2" style={{ background: 'var(--tn-surface-2, var(--tn-hover))' }}>
 <button
 type="button"
 onClick={() => setKind('subtask')}
 className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
 kind === 'subtask'
 ? 'bg-card text-foreground shadow-sm'
 : 'text-foreground hover:text-foreground'
 }`}
 >
 One-time (Subtask)
 </button>
 <button
 type="button"
 onClick={() => setKind('todo')}
 className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
 kind === 'todo'
 ? 'bg-card text-foreground shadow-sm'
 : 'text-foreground hover:text-foreground'
 }`}
 >
 Recurring (Todo)
 </button>
 </div>

 <div>
 <label htmlFor="title" className="block text-sm font-medium text-foreground dark:text-muted-foreground/60 mb-1">
 Title
 </label>
 <input
 type="text"
 id="title"
 name="title"
 value={formData.title}
 onChange={handleChange}
 required
 className="w-full px-3 py-2 border border-border dark:border-border bg-card dark:bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
 />
 </div>

 <div>
 <label htmlFor="description" className="block text-sm font-medium text-foreground dark:text-muted-foreground/60 mb-1">
 Description
 </label>
 <textarea
 id="description"
 name="description"
 value={formData.description}
 onChange={handleChange}
 rows={3}
 className="w-full px-3 py-2 border border-border dark:border-border bg-card dark:bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
 />
 </div>

 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
 <div>
 <label htmlFor="status" className="block text-sm font-medium text-foreground dark:text-muted-foreground/60 mb-1">
 Status
 </label>
 <select
 id="status"
 name="status"
 value={formData.status}
 onChange={handleChange}
 className="w-full px-3 py-2 border border-border dark:border-border bg-card dark:bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
 >
 {USER_FACING_STATUSES.map((status) => (
 <option key={status} value={status}>
 {STATUS_LABELS[status]}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label htmlFor="priority" className="block text-sm font-medium text-foreground dark:text-muted-foreground/60 mb-1">
 Priority
 </label>
 <select
 id="priority"
 name="priority"
 value={formData.priority}
 onChange={handleChange}
 className="w-full px-3 py-2 border border-border dark:border-border bg-card dark:bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
 >
 {Object.values(PriorityType).map((priority) => (
 <option key={priority} value={priority}>
 {priority}
 </option>
 ))}
 </select>
 </div>
 </div>

 <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
 <div>
 <label htmlFor="due_date" className="block text-sm font-medium text-foreground dark:text-muted-foreground/60 mb-1">
 Due Date
 </label>
 <input
 type="date"
 id="due_date"
 name="due_date"
 value={formData.due_date}
 onChange={handleChange}
 className="w-full px-3 py-2 border border-border dark:border-border bg-card dark:bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
 />
 </div>
 <div>
 <label htmlFor="start_datetime" className="block text-sm font-medium text-foreground dark:text-muted-foreground/60 mb-1">
 Start Time
 </label>
 <input
 type="datetime-local"
 id="start_datetime"
 name="start_datetime"
 value={formData.start_datetime}
 onChange={handleChange}
 className="w-full px-3 py-2 border border-border dark:border-border bg-card dark:bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
 />
 </div>
 <div>
 <label htmlFor="end_datetime" className="block text-sm font-medium text-foreground dark:text-muted-foreground/60 mb-1">
 End Time
 </label>
 <input
 type="datetime-local"
 id="end_datetime"
 name="end_datetime"
 value={formData.end_datetime}
 onChange={handleChange}
 className="w-full px-3 py-2 border border-border dark:border-border bg-card dark:bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
 />
 </div>
 </div>

 {kind === 'todo' && (
 <div className="space-y-3">
 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
 <div>
 <label htmlFor="repeat_interval" className="block text-sm font-medium text-foreground dark:text-muted-foreground/60 mb-1">
 Repeat
 </label>
 <select
 id="repeat_interval"
 name="repeat_interval"
 value={formData.repeat_interval}
 onChange={handleChange}
 className="w-full px-3 py-2 border border-border dark:border-border bg-card dark:bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
 >
 {REPEAT_OPTIONS.map((opt) => (
 <option key={opt.value} value={opt.value}>
 {opt.label}
 </option>
 ))}
 </select>
 </div>
 <div>
 <label htmlFor="next_due_date" className="block text-sm font-medium text-foreground dark:text-muted-foreground/60 mb-1">
 Next Due Date
 </label>
 <input
 type="date"
 id="next_due_date"
 name="next_due_date"
 value={formData.next_due_date}
 onChange={handleChange}
 className="w-full px-3 py-2 border border-border dark:border-border bg-card dark:bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
 />
 </div>
 {taskKind === 'challenge' && (
 <div className="rounded-xl border p-3" style={{ border: 'var(--tn-line)', background: 'var(--tn-hover)' }}>
 <div>
 <label htmlFor="tracking_mode" className="mb-1 block text-sm font-medium text-foreground">Tracking</label>
 <select id="tracking_mode" name="tracking_mode" value={formData.tracking_mode} onChange={handleChange} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground">
 <option value="bounded">Until challenge target</option>
 <option value="staged">Evolves to a next level</option>
 </select>
 </div>
 {formData.tracking_mode === 'staged' && (
 <div className="mt-3 grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
 <div>
 <label htmlFor="routine_series_key" className="mb-1 block text-sm font-medium text-foreground">Progression name</label>
 <input id="routine_series_key" name="routine_series_key" value={formData.routine_series_key} onChange={handleChange} placeholder="e.g. Bedtime progression" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground" />
 </div>
 <div>
 <label htmlFor="stage_order" className="mb-1 block text-sm font-medium text-foreground">Stage</label>
 <input id="stage_order" name="stage_order" type="number" min="1" value={formData.stage_order} onChange={handleChange} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground" />
 </div>
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 )}

 <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:justify-end sm:gap-3">
 <button
 type="button"
 onClick={onCancel}
 className="btn btn-secondary w-full sm:w-auto justify-center"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={isSubmitting}
 className="btn btn-primary w-full sm:w-auto justify-center disabled:opacity-50"
 >
 {isSubmitting
 ? 'Saving...'
 : initialData?.id
 ? `Update ${kind === 'todo' ? 'Todo' : 'Subtask'}`
 : `Create ${kind === 'todo' ? 'Todo' : 'Subtask'}`}
 </button>
 </div>
 </form>
 );
};
