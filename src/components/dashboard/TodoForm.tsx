import React, { useState } from 'react';
import { TodoItem as Todo, StatusType, PriorityType } from '@/lib/types';
import { todosApi } from '@/lib/api';

interface TodoFormProps {
  taskId: string;
  onSuccess: (todo: Todo) => void;
  onCancel: () => void;
  initialData?: Partial<Todo>;
}

export const TodoForm: React.FC<TodoFormProps> = ({
  taskId,
  onSuccess,
  onCancel,
  initialData,
}) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    status: initialData?.status || StatusType.OUTSTANDING,
    priority: initialData?.priority || PriorityType.MEDIUM,
    due_date: initialData?.due_date ? new Date(initialData.due_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    start_datetime: initialData?.start_datetime ? new Date(initialData.start_datetime).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    end_datetime: initialData?.end_datetime ? new Date(initialData.end_datetime).toISOString().slice(0, 16) : (() => {
      const endDate = new Date();
      endDate.setHours(endDate.getHours() + 1);
      return endDate.toISOString().slice(0, 16);
    })(),
    repeat_interval: initialData?.repeat_interval || '',
    next_due_date: initialData?.next_due_date ? new Date(initialData.next_due_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const todoData = {
        title: formData.title,
        description: formData.description,
        status: formData.status.toLowerCase(),
        priority: formData.priority,
        due_date: formData.due_date,
        start_datetime: formData.start_datetime,
        end_datetime: formData.end_datetime,
        repeat_interval: formData.repeat_interval,
        next_due_date: formData.next_due_date,
        task_id: taskId
      } as Omit<Todo, 'id'>;

      let todo: Todo;
      if (initialData?.id) {
        todo = await todosApi.update({ ...todoData, id: initialData.id } as Partial<Todo> & { id: string });
      } else {
        todo = await todosApi.create(todoData);
      }
      onSuccess(todo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save todo');
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
              <option key={status} value={status.toLowerCase()}>
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

      <div className="grid grid-cols-3 gap-4">
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
          <label htmlFor="start_datetime" className="block text-sm font-medium text-gray-700 mb-1">
            Start Time
          </label>
          <input
            type="datetime-local"
            id="start_datetime"
            name="start_datetime"
            value={formData.start_datetime}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>

        <div>
          <label htmlFor="end_datetime" className="block text-sm font-medium text-gray-700 mb-1">
            End Time
          </label>
          <input
            type="datetime-local"
            id="end_datetime"
            name="end_datetime"
            value={formData.end_datetime}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="repeat_interval" className="block text-sm font-medium text-gray-700 mb-1">
            Repeat Interval
          </label>
          <select
            id="repeat_interval"
            name="repeat_interval"
            value={formData.repeat_interval}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <option value="">No repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        <div>
          <label htmlFor="next_due_date" className="block text-sm font-medium text-gray-700 mb-1">
            Next Due Date
          </label>
          <input
            type="date"
            id="next_due_date"
            name="next_due_date"
            value={formData.next_due_date}
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
          {isSubmitting ? 'Saving...' : initialData?.id ? 'Update Todo' : 'Create Todo'}
        </button>
      </div>
    </form>
  );
};
