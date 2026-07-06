import React, { useState } from 'react';
import { MilestoneItem as Milestone, StatusType, PriorityType } from '@/lib/types';
import { milestonesApi } from '@/lib/api';
import { toDateInput } from '@/lib/utils';
import { USER_FACING_STATUSES, STATUS_LABELS } from '@/lib/sort';
import { useFormDraft } from '@/lib/useFormDraft';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';

interface MilestoneFormProps {
 goalId?: string;
 onSuccess: (milestone: Omit<Milestone, 'id' | 'tasks' | 'todos'>) => void;
 onCancel: () => void;
 initialData?: Partial<Milestone>;
}

export const MilestoneForm: React.FC<MilestoneFormProps> = ({
 goalId,
 onSuccess,
 onCancel,
 initialData,
}) => {
 const draftKey = initialData?.id
 ? `milestone:edit:${initialData.id}`
 : `milestone:new:${goalId ?? 'unscoped'}`;
 const [formData, setFormData, clearDraft] = useFormDraft(draftKey, {
 title: initialData?.title || '',
 description: initialData?.description || '',
 status: initialData?.status || StatusType.OUTSTANDING,
 due_date: toDateInput(initialData?.due_date),
 end_datetime: toDateInput(initialData?.end_datetime),
 priority: initialData?.priority || PriorityType.MEDIUM,
 });

 const [isSubmitting, setIsSubmitting] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const validate = (): string | null => {
 if (!formData.title.trim()) return 'Title is required';
 if (formData.title.length > 200) return 'Title must be under 200 characters';
 if (formData.due_date && formData.end_datetime) {
 if (new Date(formData.end_datetime) < new Date(formData.due_date)) {
 return 'End date cannot be before due date';
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
 const milestoneData = {
 title: formData.title,
 description: formData.description || '',
 status: formData.status as StatusType,
 priority: formData.priority,
 due_date: formData.due_date,
 end_datetime: formData.end_datetime || `${formData.due_date}T18:00:00`,
 goal_id: goalId,
 position: 0
 };

 onSuccess(milestoneData);
 clearDraft();
 } catch (err) {
 console.error('Milestone creation error:', err);
 setError(err instanceof Error ? err.message : 'Failed to save milestone');
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
 <div className="bg-red-50 text-red-800 p-3 rounded-lg text-sm">
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
 <div className="grid grid-cols-2 gap-4">
 

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
 <label htmlFor="end_datetime" className="block text-sm font-medium text-foreground mb-1">
 End Time
 </label>
 <input
 type="date"
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
 className="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-lg hover:bg-muted focus:outline-none focus:ring-2 focus:ring-gray-400"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={isSubmitting}
 className="px-4 py-2 text-sm font-medium text-white bg-card rounded-lg hover:bg-card focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
 >
 {isSubmitting ? 'Saving...' : initialData?.id ? 'Update Milestone' : 'Create Milestone'}
 </button>
 </div>
 </form>
 );
}; 