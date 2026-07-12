"use client";
import React, { useState } from 'react';
import { GoalItem as Goal, StatusType, PriorityType } from '@/lib/types';
import { goalsApi } from '@/lib/api';
import { useAppSession } from '../../app/clientwrapper';
import { useStore } from '@/store/useStore';

interface QuickGoalFormProps {
 onSuccess: (goal: Goal) => void;
 onCancel: () => void;
}

export const QuickGoalForm: React.FC<QuickGoalFormProps> = ({ onSuccess, onCancel }) => {
 const session = useAppSession();
 const addGoal = useStore((s) => s.addGoal);
 const today = new Date().toISOString().split('T')[0];
 const [formData, setFormData] = useState({
 title: '',
 description: '',
 status: StatusType.OUTSTANDING,
 priority: PriorityType.MEDIUM,
 end_datetime: today,
 });

 const [isSubmitting, setIsSubmitting] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setIsSubmitting(true);
 setError(null);

 try {
 const goalData = {
 ...formData,
 end_datetime: new Date(formData.end_datetime).toISOString(),
 };

 const goal = await goalsApi.create(goalData);
 addGoal(goal);
 onSuccess(goal);
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
 className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
 />
 </div>

 <div>
 <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
 Description
 </label>
 <textarea
 id="description"
 name="description"
 value={formData.description}
 onChange={handleChange}
 rows={3}
 className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
 />
 </div>

 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
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
 <div>
 <label htmlFor="end_datetime" className="block text-sm font-medium text-foreground mb-1">
 Due Date
 </label>
 <input
 id="end_datetime"
 name="end_datetime"
 type="date"
 required
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
 {isSubmitting ? 'Saving...' : 'Create Goal'}
 </button>
 </div>
 </form>
 );
};
