'use client';

import React, { useState, useEffect } from 'react';
import { MilestoneItem as Milestone, TaskItem as Task, TodoItem as Todo, StatusType, PriorityType } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { formatDate } from '@/lib/utils';
import { tasksApi, todosApi, subtasksApi, milestonesApi } from '@/lib/api';
import { callGeminiAPI } from '@/lib/geminiApi';
import { TaskForm } from '@/components/dashboard/TaskForm';
import { TodoForm } from '@/components/dashboard/TodoForm';
import { SubtaskForm } from '@/components/dashboard/SubtaskForm';

interface GeneratedTasks {
  dailyTasks: string[];
  oneTimeTodos: string[];
}

interface MilestoneCardProps {
  milestone: Milestone;
  goalId: string;
  onUpdate: (data: Partial<Milestone>) => void;
  onDelete: () => void;
  onSelectMilestone?: (milestoneId: string) => void;
  onAddTask?: () => void;
  onMilestoneUpdate?: (data: Partial<Milestone>) => Promise<void>;
  onMilestoneDelete?: () => Promise<void>;
}

export default function MilestoneCard({ milestone, goalId, onUpdate, onDelete, onSelectMilestone, onAddTask }: MilestoneCardProps) {
  // Store integration
  const { addTask, updateTask, deleteTask } = useStore();

  // UI State
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isCreatingTodo, setIsCreatingTodo] = useState(false);
  const [isCreatingSubtask, setIsCreatingSubtask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Task Generation State
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTasks | null>(null);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  
  // Loading States
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Milestone State
  const [currentMilestone, setCurrentMilestone] = useState<Milestone>(milestone);

  // Initialize tasks and todos with empty arrays if undefined
  const tasks = currentMilestone.tasks || [];
  const todos = currentMilestone.todos || [];

  useEffect(() => {
    setCurrentMilestone(milestone);
  }, [milestone]);

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

  const handleCreateTodo = async (todoData: Partial<Todo>) => {
    if (!selectedTask) return;
    try {
      const todoToCreate: Omit<Todo, 'id'> = {
        title: todoData.title!,
        description: todoData.description!,
        status: todoData.status || StatusType.OUTSTANDING,
        priority: todoData.priority || PriorityType.MEDIUM,
        task_id: selectedTask.id,
        due_date: todoData.due_date,
        next_due_date: todoData.next_due_date,
        repeat_interval: todoData.repeat_interval,
        start_datetime: todoData.start_datetime,
        end_datetime: todoData.end_datetime
      };
      const createdTodo = await todosApi.create(todoToCreate);
      const updatedTask = await tasksApi.get(selectedTask.id, true, true);
      updateTask(updatedTask);
      setIsCreatingTodo(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Error creating todo:', error);
    }
  };

  const handleCreateSubtask = async (subtaskData: Partial<Task>) => {
    if (!selectedTask) return;
    try {
      const subtaskToCreate: Omit<Task, 'id'> = {
        title: subtaskData.title!,
        description: subtaskData.description!,
        status: subtaskData.status || StatusType.OUTSTANDING,
        priority: subtaskData.priority || PriorityType.MEDIUM,
        milestone_id: selectedTask.milestone_id,
        parent_id: selectedTask.id,
        todos: [],
        subtasks: [],
        start_datetime: subtaskData.start_datetime,
        end_datetime: subtaskData.end_datetime,
        due_date: subtaskData.due_date
      };
      const createdSubtask = await tasksApi.create(subtaskToCreate);
      const updatedTask = await tasksApi.get(selectedTask.id, true, true);
      updateTask(updatedTask);
      setIsCreatingSubtask(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Error creating subtask:', error);
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

  const handleExpand = async () => {
    if (!isExpanded) {
      setIsLoading(true);
      try {
        const fullMilestone = await milestonesApi.getById(milestone.id, true, true, true);
        setCurrentMilestone(fullMilestone);
        onUpdate(fullMilestone);
      } catch (error) {
        console.error('Failed to load milestone details:', error);
      } finally {
        setIsLoading(false);
      }
    }
    setIsExpanded(!isExpanded);
  };

  const handleSuggestTasks = async () => {
    setIsGeneratingTasks(true);
    setGeneratedTasks(null);

    const prompt = `Generate a list of daily tasks and one-time todos for a milestone named "${milestone.title}". Provide the output as a JSON object with two arrays: "dailyTasks" and "oneTimeTodos".`;
    const schema = {
      type: "OBJECT",
      properties: {
        dailyTasks: {
          type: "ARRAY",
          items: { type: "STRING" }
        },
        oneTimeTodos: {
          type: "ARRAY",
          items: { type: "STRING" }
        }
      },
      propertyOrdering: ["dailyTasks", "oneTimeTodos"]
    };

    const result = await callGeminiAPI<GeneratedTasks>(prompt, schema);
    if (result) {
      setGeneratedTasks(result);
    }
    setIsGeneratingTasks(false);
  };

  const handleTaskToggle = async (itemId: string, type: 'task' | 'subtask' | 'todo', currentStatus: StatusType) => {
    setIsUpdating(true);
    try {
      const newStatus = currentStatus === StatusType.FINISHED ? StatusType.OUTSTANDING : StatusType.FINISHED;

      switch (type) {
        case 'task':
          await tasksApi.update({ 
            id: itemId, 
            status: newStatus,
            ...(newStatus === StatusType.FINISHED && { end_datetime: new Date().toISOString() })
          });
          break;
        case 'subtask':
          await subtasksApi.update({ 
            id: itemId, 
            status: newStatus,
            ...(newStatus === StatusType.FINISHED && { end_datetime: new Date().toISOString() })
          });
          break;
        case 'todo':
          await todosApi.update({ 
            id: itemId, 
            status: newStatus,
            ...(newStatus === StatusType.FINISHED && { end_datetime: new Date().toISOString() })
          });
          break;
      }

      // Update the task in the store
      const updatedTask = await tasksApi.get(itemId, true, true);
      updateTask(updatedTask);
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setIsUpdating(false);
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
    const totalItems = tasks.length + todos.length;
    if (totalItems === 0) return 0;
    
    const completedTasks = tasks.filter(t => t.status === StatusType.FINISHED).length;
    const completedTodos = todos.filter(t => t.status === StatusType.FINISHED).length;
    return ((completedTasks + completedTodos) / totalItems) * 100;
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
          onClick={handleExpand}
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
          {isLoading ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-800"></div>
            </div>
          ) : (
            <>
              {tasks.map((task) => (
                <div key={task.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center space-x-3 mb-2">
                    <input
                      type="checkbox"
                      checked={task.status === StatusType.FINISHED}
                      onChange={() => handleTaskToggle(task.id, 'task', task.status)}
                      disabled={isUpdating}
                      className="h-4 w-4 rounded border-gray-300 cursor-pointer accent-gray-900"
                    />
                    <span className={`flex-1 font-medium ${task.status === StatusType.FINISHED ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                      {task.title}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedTask(task);
                          setIsCreatingTodo(true);
                        }}
                        className="text-blue-500 hover:text-blue-600"
                      >
                        Add Todo
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTask(task);
                          setIsCreatingSubtask(true);
                        }}
                        className="text-blue-500 hover:text-blue-600"
                      >
                        Add Subtask
                      </button>
                    </div>
                  </div>

                  {task.subtasks && task.subtasks.length > 0 && (
                    <div className="ml-6 mb-2 space-y-1 border-l-2 border-gray-200 pl-3">
                      {task.subtasks.map((subtask) => (
                        <div key={subtask.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={subtask.status === StatusType.FINISHED}
                            onChange={() => handleTaskToggle(subtask.id, 'subtask', subtask.status)}
                            disabled={isUpdating}
                            className="h-3 w-3 rounded border-gray-300 cursor-pointer accent-gray-900"
                          />
                          <span className={`text-sm ${subtask.status === StatusType.FINISHED ? 'line-through text-gray-500' : 'text-gray-600'}`}>
                            {subtask.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {task.todos && task.todos.length > 0 && (
                    <div className="ml-6 space-y-1 border-l-2 border-gray-200 pl-3">
                      {task.todos.map((todo) => (
                        <div key={todo.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={todo.status === StatusType.FINISHED}
                            onChange={() => handleTaskToggle(todo.id, 'todo', todo.status)}
                            disabled={isUpdating}
                            className="h-3 w-3 rounded border-gray-300 cursor-pointer accent-gray-900"
                          />
                          <span className={`text-sm ${todo.status === StatusType.FINISHED ? 'line-through text-gray-500' : 'text-gray-600'}`}>
                            {todo.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {tasks.length === 0 && todos.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No tasks or todos yet. Add some to track your progress!
                </div>
              )}

              <div className="flex justify-between items-center pt-4">
                <button
                  onClick={handleSuggestTasks}
                  disabled={isGeneratingTasks}
                  className="text-sm text-gray-600 hover:text-gray-800 flex items-center space-x-1"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    ></path>
                  </svg>
                  <span>{isGeneratingTasks ? 'Generating...' : 'Suggest Tasks'}</span>
                </button>
              </div>

              {generatedTasks && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-800 mb-2">Suggested Tasks</h5>
                  {generatedTasks.dailyTasks.length > 0 && (
                    <>
                      <p className="text-sm font-medium text-gray-600 mb-1">Daily Tasks:</p>
                      <ul className="list-disc list-inside text-sm text-gray-800 mb-2">
                        {generatedTasks.dailyTasks.map((task, index) => (
                          <li key={`gen-daily-${index}`}>{task}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {generatedTasks.oneTimeTodos.length > 0 && (
                    <>
                      <p className="text-sm font-medium text-gray-600 mb-1">One-time Todos:</p>
                      <ul className="list-disc list-inside text-sm text-gray-800">
                        {generatedTasks.oneTimeTodos.map((todo, index) => (
                          <li key={`gen-todo-${index}`}>{todo}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Modal Forms */}
      {isCreatingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Create New Task</h3>
            <TaskForm
              goalId={goalId}
              milestoneId={milestone.id}
              onSuccess={handleCreateTask}
              onCancel={() => setIsCreatingTask(false)}
            />
          </div>
        </div>
      )}

      {isCreatingTodo && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Create New Todo</h3>
            <TodoForm
              taskId={selectedTask.id}
              onSuccess={handleCreateTodo}
              onCancel={() => {
                setIsCreatingTodo(false);
                setSelectedTask(null);
              }}
            />
          </div>
        </div>
      )}

      {isCreatingSubtask && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Create New Subtask</h3>
            <SubtaskForm
              taskId={selectedTask.id}
              onSuccess={handleCreateSubtask}
              onCancel={() => {
                setIsCreatingSubtask(false);
                setSelectedTask(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}