import React, { useState } from 'react';
import { TaskItem as Task, TodoItem as Todo, StatusType, PriorityType, SubtaskItem as Subtask } from '@/lib/types';
import { tasksApi, todosApi } from '@/lib/api';

interface TaskTodoFormProps {
  goalId: string;
  milestoneId: string;
  taskId?: string;
  type: 'task' | 'todo';
  onSuccess: (item: Task | Todo) => void;
  onCancel: () => void;
  initialData?: Partial<Task | Todo>;
}

export const TaskTodoForm: React.FC<TaskTodoFormProps> = ({
  goalId,
  milestoneId,
  taskId,
  type,
  onSuccess,
  onCancel,
  initialData,
}) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    status: initialData?.status || StatusType.OUTSTANDING,
    priority: initialData?.priority || PriorityType.MEDIUM,
    due_date: initialData?.due_date ? new Date(initialData.due_date).toISOString().split('T')[0] : '',
    is_completed: initialData?.is_completed || false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const itemData = type === 'task' 
        ? {
            ...formData,
            due_date: formData.due_date ? new Date(formData.due_date).toISOString() : undefined,
            milestone_id: milestoneId,
            todos: [] as Todo[],
            subtasks: [] as Subtask[]
          } as Omit<Task, 'id'>
        : {
            ...formData,
            due_date: formData.due_date ? new Date(formData.due_date).toISOString() : undefined,
            task_id: taskId
          } as Omit<Todo, 'id'>;

      let item: Task | Todo;
      if (initialData?.id) {
        if (type === 'task') {
          item = await tasksApi.update({ ...itemData, id: initialData.id } as Partial<Task> & { id: string });
        } else {
          item = await todosApi.update({ ...itemData, id: initialData.id } as Partial<Todo> & { id: string });
        }
      } else {
        if (type === 'task') {
          item = await tasksApi.create(itemData as Omit<Task, 'id'>);
        } else {
          item = await todosApi.create(itemData as Omit<Todo, 'id'>);
        }
      }
      onSuccess(item);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to save ${type}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
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
              <option key={status} value={status}>
                {status.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

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
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="is_completed"
          name="is_completed"
          checked={formData.is_completed}
          onChange={handleChange}
          className="h-4 w-4 text-gray-800 focus:ring-gray-400 border-gray-300 rounded"
        />
        <label htmlFor="is_completed" className="ml-2 block text-sm text-gray-700">
          Mark as completed
        </label>
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
          {isSubmitting ? 'Saving...' : initialData?.id ? `Update ${type}` : `Create ${type}`}
        </button>
      </div>
    </form>
  );
}; 