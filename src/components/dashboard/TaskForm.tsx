import React, { useState } from 'react';
import { TaskItem as Task, StatusType, PriorityType } from '@/lib/types';
import { tasksApi } from '@/lib/api';
import { toOptionalDateInput, toOptionalDateTimeInput } from '@/lib/utils';
import { USER_FACING_STATUSES, STATUS_LABELS } from '@/lib/sort';
import { useFormDraft } from '@/lib/useFormDraft';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';

const emptyToUndefined = (value?: string) => value?.trim() ? value : undefined;

interface TaskFormProps {
 goalId: string;
 milestoneId?: string;
 onSuccess: (task: Task, goalId: string, milestoneId?: string) => void;
 onCancel: () => void;
 initialData?: Partial<Task>;
}

export const TaskForm: React.FC<TaskFormProps> = ({
 goalId, // Keep goalId for context, even if passed back in onSuccess
 milestoneId,
 onSuccess,
 onCancel,
 initialData,
}) => {
 const draftKey = initialData?.id
 ? `task:edit:${initialData.id}`
 : `task:new:${initialData?.scope || (milestoneId ? 'milestone' : 'goal')}:${initialData?.kind || 'project'}:${milestoneId ?? goalId}`;
 const [formData, setFormData, clearDraft] = useFormDraft(draftKey, {
 title: initialData?.title || '',
 description: initialData?.description || '',
 success_criteria: initialData?.success_criteria || '',
 status: initialData?.status || StatusType.OUTSTANDING,
 priority: initialData?.priority || PriorityType.MEDIUM,
 kind: initialData?.kind || 'project',
 scope: initialData?.scope || (milestoneId ? 'milestone' : 'goal'),
 due_date: toOptionalDateInput(initialData?.due_date),
 scheduled_date: toOptionalDateTimeInput(initialData?.scheduled_date),
 start_datetime: toOptionalDateTimeInput(initialData?.start_datetime),
 end_datetime: toOptionalDateTimeInput(initialData?.end_datetime),
 });

 const [isSubmitting, setIsSubmitting] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const validate = (): string | null => {
 if (!formData.title.trim()) return 'Title is required';
 if (formData.title.length > 200) return 'Title must be under 200 characters';
 if (formData.scope === 'milestone' && !milestoneId) return 'Pick a milestone for milestone-scoped tasks';
 if (formData.start_datetime && formData.end_datetime) {
 if (new Date(formData.end_datetime) < new Date(formData.start_datetime)) {
 return 'End time cannot be before start time';
 }
 }
 if (!formData.start_datetime && formData.scheduled_date && formData.end_datetime) {
 if (new Date(formData.end_datetime) < new Date(formData.scheduled_date)) {
 return 'End time cannot be before scheduled time';
 }
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
 const taskData = {
 title: formData.title,
 description: formData.description,
 success_criteria: emptyToUndefined(formData.success_criteria),
 status: formData.status.toLowerCase(),
 priority: formData.priority,
 kind: formData.kind,
 scope: formData.scope,
 due_date: emptyToUndefined(formData.due_date),
 scheduled_date: emptyToUndefined(formData.scheduled_date),
 start_datetime: emptyToUndefined(formData.start_datetime),
 end_datetime: emptyToUndefined(formData.end_datetime),
 goal_id: goalId,
 milestone_id: formData.scope === 'milestone' ? milestoneId : undefined,
 todos: [],
 subtasks: []
 } as Omit<Task, 'id'>;

 let task: Task;
 if (initialData?.id) {
 task = await tasksApi.update({ ...taskData, id: initialData.id } as Partial<Task> & { id: string });
 } else {
 task = await tasksApi.create(taskData);
 }
 onSuccess(task, goalId, formData.scope === 'milestone' ? milestoneId : undefined);
 clearDraft();
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Failed to save task');
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleChange = (
 e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
 ) => {
 const { name, value } = e.target;
 setFormData(prev => ({
 ...prev,
 [name]: value,
 }));
 };

 return (
 <form onSubmit={handleSubmit} className="space-y-4">
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

 <div>
 <label htmlFor="title" className="block text-sm font-medium text-foreground mb-1">
 Title
 </label>
 <input
 type="text"
 id="title"
 name="title"
 value={formData.title}
 onChange={handleChange}
 required
 className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
 />
 </div>

 <div>
 <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
 Description
 </label>
 <MarkdownEditor
 id="description"
 name="description"
 value={formData.description}
 onChange={(next) => setFormData((prev) => ({ ...prev, description: next }))}
 rows={3}
 />
 </div>

 <div>
 <label htmlFor="success_criteria" className="block text-sm font-medium text-foreground mb-1">
 Success criteria
 </label>
 <textarea
 id="success_criteria"
 name="success_criteria"
 value={formData.success_criteria}
 onChange={handleChange}
 rows={2}
 placeholder="What makes this task complete?"
 className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
 />
 </div>

 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
 <div>
 <label htmlFor="status" className="block text-sm font-medium text-foreground mb-1">
 Status
 </label>
 <select
 id="status"
 name="status"
 value={formData.status}
 onChange={handleChange}
 className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
 >
 {USER_FACING_STATUSES.map((status) => (
 <option key={status} value={status}>
 {STATUS_LABELS[status]}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label htmlFor="priority" className="block text-sm font-medium text-foreground mb-1">
 Priority
 </label>
 <select
 id="priority"
 name="priority"
 value={formData.priority}
 onChange={handleChange}
 className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
 >
 {Object.values(PriorityType).map(priority => (
 <option key={priority} value={priority}>
 {priority}
 </option>
 ))}
 </select>
 </div>
 </div>

 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
 <div>
 <label htmlFor="scope" className="block text-sm font-medium text-foreground mb-1">
 Scope
 </label>
 <select
 id="scope"
 name="scope"
 value={formData.scope}
 onChange={handleChange}
 className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
 >
 <option value="goal">Goal-level routine / task</option>
 <option value="milestone" disabled={!milestoneId}>Milestone task</option>
 </select>
 </div>

 <div>
 <label htmlFor="kind" className="block text-sm font-medium text-foreground mb-1">
 Kind
 </label>
 <select
 id="kind"
 name="kind"
 value={formData.kind}
 onChange={handleChange}
 className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
 >
 <option value="project">Project</option>
 <option value="routine">Routine</option>
 <option value="challenge">Challenge</option>
 </select>
 </div>
 </div>

 <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
 <div>
 <label htmlFor="due_date" className="block text-sm font-medium text-foreground mb-1">
 Due Date
 </label>
 <input
 type="date"
 id="due_date"
 name="due_date"
 value={formData.due_date}
 onChange={handleChange}
 className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
 />
 </div>

 <div>
 <label htmlFor="scheduled_date" className="block text-sm font-medium text-foreground mb-1">
 Scheduled Time
 </label>
 <input
 type="datetime-local"
 id="scheduled_date"
 name="scheduled_date"
 value={formData.scheduled_date}
 onChange={handleChange}
 className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
 />
 </div>

 <div>
 <label htmlFor="start_datetime" className="block text-sm font-medium text-foreground mb-1">
 Start Time
 </label>
 <input
 type="datetime-local"
 id="start_datetime"
 name="start_datetime"
 value={formData.start_datetime}
 onChange={handleChange}
 className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
 />
 </div>

 <div>
 <label htmlFor="end_datetime" className="block text-sm font-medium text-foreground mb-1">
 End Time
 </label>
 <input
 type="datetime-local"
 id="end_datetime"
 name="end_datetime"
 value={formData.end_datetime}
 onChange={handleChange}
 className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
 />
 </div>
 </div>

 <div className="flex justify-end space-x-3 pt-4">
 <button
 type="button"
 onClick={onCancel}
 className="btn btn-secondary"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={isSubmitting}
 className="btn btn-primary disabled:opacity-50"
 >
 {isSubmitting ? 'Saving...' : initialData?.id ? 'Update Task' : 'Create Task'}
 </button>
 </div>
 </form>
 );
};
