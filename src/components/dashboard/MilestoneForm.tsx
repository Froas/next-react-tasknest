import React, { useState } from 'react';
import { MilestoneItem as Milestone, StatusType, PriorityType } from '@/lib/types';
import { milestonesApi } from '@/lib/api';

interface MilestoneFormProps {
  goalId: string;
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
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    status: initialData?.status || StatusType.OUTSTANDING,
    due_date: initialData?.due_date ? new Date(initialData.due_date).toISOString().split('T')[0] : today,
    end_datetime: initialData?.end_datetime ? new Date(initialData.end_datetime).toISOString().split('T')[0]  : today,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const milestoneData = {
        title: formData.title,
        description: formData.description || '',
        status: formData.status as StatusType,
        priority: PriorityType.MEDIUM,
        due_date: formData.due_date,
        end_datetime: formData.end_datetime || `${formData.due_date}T18:00:00`,
        goal_id: goalId,
        position: 0
      };

      onSuccess(milestoneData);
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
              <option key={status} value={status.toLowerCase()}>
                {status.replace('_', ' ')}
              </option>
            ))}
          </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        

        <div>
          <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
            Due Date
          </label>
          <input
            type="date"
            id="due_date"
            name="due_date"
            value={formData.due_date}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>

        <div>
          <label htmlFor="end_datetime" className="block text-sm font-medium text-gray-700 mb-1">
            End Time
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
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : initialData?.id ? 'Update Milestone' : 'Create Milestone'}
        </button>
      </div>
    </form>
  );
}; 