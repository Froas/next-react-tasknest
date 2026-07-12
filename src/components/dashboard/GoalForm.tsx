"use client";
import React, { useState } from 'react';
import { GoalItem as Goal, StatusType, PriorityType } from '@/lib/types';
import { goalsApi } from '@/lib/api';
import { useAppSession } from '../../app/clientwrapper';
import { toDateInput } from '@/lib/utils';
import { USER_FACING_STATUSES, STATUS_LABELS } from '@/lib/sort';
import { useFormDraft } from '@/lib/useFormDraft';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';

interface GoalFormProps {
 goal?: Goal;
 isEditMode?: boolean;
 onSuccess: (goalData: Partial<Goal>) => Promise<void> | void;
 onCancel: () => void;
}

export const GoalForm: React.FC<GoalFormProps> = ({
 goal,
 isEditMode,
 onSuccess,
 onCancel,
}) => {
 const session = useAppSession();
 // Draft scope: editing a known goal vs creating new gets a separate key,
 // so editing one goal doesn't clobber a half-written new-goal draft.
 const draftKey = goal?.id ? `goal:edit:${goal.id}` : 'goal:new';
 const [formData, setFormData, clearDraft] = useFormDraft(draftKey, {
 title: goal?.title || '',
 description: goal?.description || '',
 status: goal?.status || StatusType.OUTSTANDING,
 priority: goal?.priority || PriorityType.MEDIUM,
 start_datetime: toDateInput(goal?.start_datetime),
 end_datetime: toDateInput(goal?.end_datetime),
 });

 const [isSubmitting, setIsSubmitting] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const validate = (): string | null => {
 if (!formData.title.trim()) return 'Title is required';
 if (formData.title.length > 200) return 'Title must be under 200 characters';
 if (!formData.end_datetime) return 'Due date is required';
 if (formData.start_datetime && formData.end_datetime) {
 if (new Date(formData.end_datetime) < new Date(formData.start_datetime)) {
 return 'Due date cannot be before start date';
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
 const goalData = {
 ...formData,
 start_datetime: formData.start_datetime ? new Date(formData.start_datetime).toISOString() : undefined,
 end_datetime: formData.end_datetime ? new Date(formData.end_datetime).toISOString() : undefined,
 };
 await onSuccess(goalData);
 clearDraft();
 onCancel();
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Failed to save goal');
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
 const { name, value } = e.target;
 setFormData(prev => ({ ...prev, [name]: value }));
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
 className="w-full px-3 py-2 border border-border bg-card text-foreground placeholder:text-muted-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
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
 rows={4}
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
 className="w-full px-3 py-2 border border-border bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
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
 className="w-full px-3 py-2 border border-border bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
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
 <label htmlFor="start_datetime" className="block text-sm font-medium text-foreground mb-1">
 Start Date
 </label>
 <input
 type="date"
 id="start_datetime"
 name="start_datetime"
 value={formData.start_datetime}
 onChange={handleChange}
 className="w-full px-3 py-2 border border-border bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
 />
 </div>

 <div>
 <label htmlFor="end_datetime" className="block text-sm font-medium text-foreground mb-1">
 End Date
 </label>
 <input
 type="date"
 id="end_datetime"
 name="end_datetime"
 value={formData.end_datetime}
 onChange={handleChange}
 className="w-full px-3 py-2 border border-border bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
 />
 </div>
 </div>

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
 {isSubmitting ? 'Saving...' : isEditMode ? 'Update Goal' : 'Create Goal'}
 </button>
 </div>
 </form>
 );
};
