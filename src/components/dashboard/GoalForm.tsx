import React, { useState } from 'react';
import { GoalItem as Goal, StatusType, PriorityType } from '@/lib/types';
import { goalsApi } from '@/lib/api';
import { useSession } from 'next-auth/react';

interface GoalFormProps {
  goal: Goal | null;
  isEditMode: boolean;
  onClose: () => void;
  onSubmit: (goalData: Partial<Goal>) => Promise<void>;
}

export const GoalForm: React.FC<GoalFormProps> = ({ goal, isEditMode, onClose, onSubmit }) => {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    title: goal?.title || '',
    description: goal?.description || '',
    status: goal?.status || StatusType.OUTSTANDING,
    priority: goal?.priority || PriorityType.MEDIUM,
    start_datetime: goal?.start_datetime ? new Date(goal.start_datetime).toISOString().split('T')[0] : '',
    end_datetime: goal?.end_datetime ? new Date(goal.end_datetime).toISOString().split('T')[0] : '',
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
        start_datetime: formData.start_datetime ? new Date(formData.start_datetime).toISOString() : undefined,
        end_datetime: formData.end_datetime ? new Date(formData.end_datetime).toISOString() : undefined,
        user_id: session?.user?.email || '',
      };

      await onSubmit(goalData);
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
        <div className="bg-red-50 text-red-800 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Title
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            {Object.values(StatusType).map(status => (
              <option key={status} value={status}>
                {status.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            {Object.values(PriorityType).map(priority => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="start_datetime" className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            id="start_datetime"
            name="start_datetime"
            value={formData.start_datetime}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>

        <div>
          <label htmlFor="end_datetime" className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            id="end_datetime"
            name="end_datetime"
            value={formData.end_datetime}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : isEditMode ? 'Update Goal' : 'Create Goal'}
        </button>
      </div>
    </form>
  );
}; 