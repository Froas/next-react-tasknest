"use client";
import React, { useState } from 'react';
import { Event, StatusType } from '@/lib/types';
import { eventsApi } from '@/lib/api';
import { useAppSession } from '../../app/clientwrapper';
import { useFormDraft } from '@/lib/useFormDraft';

interface EventFormProps {
 event?: Event;
 isEditMode?: boolean;
 onSuccess: (eventData: Partial<Event>) => Promise<void> | void;
 onCancel: () => void;
}

export const EventForm: React.FC<EventFormProps> = ({
 event,
 isEditMode,
 onSuccess,
 onCancel,
}) => {
 const session = useAppSession();
 const today = new Date().toISOString().split('T')[0];
 const now = new Date().toISOString().slice(0, 16);
 
 const draftKey = event?.id ? `event:edit:${event.id}` : 'event:new';
 const [formData, setFormData, clearDraft] = useFormDraft(draftKey, {
 title: event?.title || '',
 description: event?.description || '',
 status: event?.status || StatusType.OUTSTANDING,
 start_datetime: event?.start_datetime
 ? new Date(event.start_datetime).toISOString().slice(0, 16)
 : now,
 end_datetime: event?.end_datetime
 ? new Date(event.end_datetime).toISOString().slice(0, 16)
 : now,
 location: event?.location || '',
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
 const eventData = {
 ...formData,
 start_datetime: formData.start_datetime ? new Date(formData.start_datetime).toISOString() : undefined,
 end_datetime: formData.end_datetime ? new Date(formData.end_datetime).toISOString() : undefined
 };
 
 await onSuccess(eventData);
 clearDraft();
 onCancel();
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Failed to save event');
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

 <div>
 <label htmlFor="location" className="block text-sm font-medium text-foreground mb-1">
 Location
 </label>
 <input
 type="text"
 id="location"
 name="location"
 value={formData.location}
 onChange={handleChange}
 className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
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
 {Object.values(StatusType).map(status => (
 <option key={status} value={status}>
 {status.replace('_', ' ')}
 </option>
 ))}
 </select>
 </div>

 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
 <div>
 <label htmlFor="start_datetime" className="block text-sm font-medium text-foreground mb-1">
 Start Date & Time
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
 End Date & Time
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
 {isSubmitting ? 'Saving...' : isEditMode ? 'Update Event' : 'Create Event'}
 </button>
 </div>
 </form>
 );
};
