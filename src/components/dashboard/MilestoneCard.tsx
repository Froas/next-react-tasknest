'use client';

import { useState } from 'react';
import { MilestoneItem as Milestone, TaskItem as Task, TodoItem as Todo, StatusType, PriorityType } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { formatDate } from '@/lib/utils';
import { tasksApi } from '@/lib/api';

interface MilestoneCardProps {
  milestone: Milestone;
  onUpdate: (data: Partial<Milestone>) => void;
  onDelete: () => void;
  onSelectMilestone?: (milestoneId: string) => void;
  onAddTask?: () => void;
  onMilestoneUpdate?: (data: Partial<Milestone>) => Promise<void>;
  onMilestoneDelete?: () => Promise<void>;
}

export default function MilestoneCard({ milestone, onUpdate, onDelete }: MilestoneCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const { addTask, updateTask, deleteTask } = useStore();

  const handleCreateTask = async (taskData: Partial<Task>) => {
    try {
      const { title, description, status, priority, due_date } = taskData;
      if (!title || !description || !status || !priority) {
        throw new Error('Missing required fields');
      }
      const newTask = await tasksApi.create({
        title,
        description,
        status,
        priority,
        due_date,
        milestone_id: milestone.id,
        todos: [],
        subtasks: []
      });
      addTask(newTask);
      setIsCreatingTask(false);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleTaskUpdate = async (taskId: string, taskData: Partial<Task>) => {
    try {
      const updatedTask = await tasksApi.update({
        id: taskId,
        ...taskData
      });
      updateTask(updatedTask);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    try {
      await tasksApi.delete(taskId);
      deleteTask(taskId);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const getStatusColor = (status: StatusType) => {
    switch (status) {
      case StatusType.OUTSTANDING:
        return 'bg-gray-100 text-gray-800';
      case StatusType.IN_PROGRESS:
        return 'bg-blue-100 text-blue-800';
      case StatusType.FINISHED:
        return 'bg-green-100 text-green-800';
      case StatusType.CANCELLED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: PriorityType) => {
    switch (priority) {
      case PriorityType.HIGH:
        return 'bg-red-100 text-red-800';
      case PriorityType.MEDIUM:
        return 'bg-yellow-100 text-yellow-800';
      case PriorityType.LOW:
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateProgress = () => {
    if (!milestone.tasks || milestone.tasks.length === 0) return 0;
    const completedTasks = milestone.tasks.filter(
      task => task.status === StatusType.FINISHED
    ).length;
    return (completedTasks / milestone.tasks.length) * 100;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{milestone.title}</h3>
          {milestone.description && (
            <p className="text-gray-600 text-sm mt-1">{milestone.description}</p>
          )}
        </div>
        <div className="flex space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(milestone.status)}`}>
            {milestone.status}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(milestone.priority)}`}>
            {milestone.priority}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Progress</span>
          <span>{Math.round(calculateProgress())}%</span>
        </div>
        <div className="bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${calculateProgress()}%` }}
          />
        </div>
      </div>

      {milestone.due_date && (
        <div className="mt-4 text-sm text-gray-500">
          Due: {formatDate(milestone.due_date)}
        </div>
      )}

      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-500 hover:text-blue-600 text-sm font-medium"
        >
          {isExpanded ? 'Hide Tasks' : 'Show Tasks'}
        </button>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsCreatingTask(true)}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add Task
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1 text-sm text-red-500 hover:text-red-600"
          >
            Delete
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {milestone.tasks?.map((task) => (
            <div
              key={task.id}
              className="bg-gray-50 rounded-lg p-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-900">{task.title}</h4>
                  {task.description && (
                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
              </div>
              {task.due_date && (
                <div className="mt-2 text-sm text-gray-500">
                  Due: {formatDate(task.due_date)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isCreatingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Create New Task</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleCreateTask({
                title: formData.get('title') as string,
                description: formData.get('description') as string,
                status: formData.get('status') as StatusType,
                priority: formData.get('priority') as PriorityType,
                due_date: formData.get('due_date') as string,
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    id="title"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    name="description"
                    id="description"
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    name="status"
                    id="status"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value={StatusType.OUTSTANDING}>Not Started</option>
                    <option value={StatusType.IN_PROGRESS}>In Progress</option>
                    <option value={StatusType.FINISHED}>Finished</option>
                    <option value={StatusType.CANCELLED}>Cancelled</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                    Priority
                  </label>
                  <select
                    name="priority"
                    id="priority"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value={PriorityType.LOW}>Low</option>
                    <option value={PriorityType.MEDIUM}>Medium</option>
                    <option value={PriorityType.HIGH}>High</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">
                    Due Date
                  </label>
                  <input
                    type="date"
                    name="due_date"
                    id="due_date"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setIsCreatingTask(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}