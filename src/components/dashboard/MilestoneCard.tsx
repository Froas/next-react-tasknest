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
import { ChevronDown, ChevronRight, Plus, Calendar, Target, CheckCircle2, Circle, Clock, AlertCircle, Trash2, MoreHorizontal } from 'lucide-react';
import TaskKanbanView from './TaskKanbanView';
import { useTheme } from '@/context/ThemeContext';

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
  const { theme } = useTheme();
  
  // Store integration
  const {
    addTask,
    updateTask,
    deleteTask,
    addTodoToTaskInMilestoneInGoal,
    addSubtaskToTaskInMilestoneInGoal,
    addTaskToMilestoneInGoal
  } = useStore();

  // UI State
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isCreatingTodo, setIsCreatingTodo] = useState(false);
  const [isCreatingSubtask, setIsCreatingSubtask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  
  // Task Generation State
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTasks | null>(null);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  
  // Loading States
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Milestone State
  const [currentMilestone, setCurrentMilestone] = useState<Milestone>(milestone);

  // Ensure tasks and todos are always defined arrays
  const tasks: Task[] = currentMilestone.tasks || [];
  const todos: Todo[] = currentMilestone.todos || [];

  useEffect(() => {
    setCurrentMilestone(milestone);
  }, [milestone]);

  const handleTaskFormSuccess = (newTask: Task, taskGoalId: string, taskMilestoneId: string) => {
    try {
      addTaskToMilestoneInGoal(newTask, taskMilestoneId, taskGoalId);
      setIsCreatingTask(false);
    } catch (error) {
      console.error('Error optimistically adding task from MilestoneCard:', error);
    }
  };

  const handleCreateTodo = (newTodo: Todo, newTodoGoalId: string, newTodoMilestoneId: string, newTodoTaskId: string) => {
    if (!selectedTask || selectedTask.id !== newTodoTaskId) {
      console.error("Selected task mismatch or not found for creating todo");
      return;
    }
    try {
      addTodoToTaskInMilestoneInGoal(newTodo, newTodoTaskId, newTodoMilestoneId, newTodoGoalId);
      setIsCreatingTodo(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Error optimistically adding todo:', error);
    }
  };

  const handleCreateSubtask = (newSubtask: import('@/lib/types').SubtaskItem, newSubtaskGoalId: string, newSubtaskMilestoneId: string, newSubtaskParentTaskId: string) => {
    if (!selectedTask || selectedTask.id !== newSubtaskParentTaskId) {
      console.error("Selected task mismatch or not found for creating subtask");
      return;
    }
    try {
      addSubtaskToTaskInMilestoneInGoal(newSubtask, newSubtaskParentTaskId, newSubtaskMilestoneId, newSubtaskGoalId);
      setIsCreatingSubtask(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Error optimistically adding subtask:', error);
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

  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  // Fix: Accept parentTaskId for subtask/todo toggling, fetch and update parent task after toggle
  const handleTaskToggle = async (
    itemId: string,
    type: 'task' | 'subtask' | 'todo',
    currentStatus: StatusType,
    parentTaskId?: string
  ) => {
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
          // After updating, fetch the updated task
          {
            const updatedTask = await tasksApi.get(itemId, true, true);
            updateTask(updatedTask);
          }
          break;
        case 'subtask':
          await subtasksApi.update({
            id: itemId,
            status: newStatus,
            ...(newStatus === StatusType.FINISHED && { end_datetime: new Date().toISOString() })
          });
          if (parentTaskId) {
            const updatedTask = await tasksApi.get(parentTaskId, true, true);
            updateTask(updatedTask);
          }
          break;
        case 'todo':
          await todosApi.update({
            id: itemId,
            status: newStatus,
            ...(newStatus === StatusType.FINISHED && { end_datetime: new Date().toISOString() })
          });
          if (parentTaskId) {
            const updatedTask = await tasksApi.get(parentTaskId, true, true);
            updateTask(updatedTask);
          }
          break;
      }

      // Update the milestone state locally to reflect changes immediately

      setCurrentMilestone(prevMilestone => {
        const updatedTasks = prevMilestone.tasks.map(task => {
          if (task.id === itemId) {
            return { ...task, status: newStatus };
          }
          return {
            ...task,
            subtasks: task.subtasks.map(subtask =>
              subtask.id === itemId ? { ...subtask, status: newStatus } : subtask
            ),
            todos: task.todos.map(todo =>
              todo.id === itemId ? { ...todo, status: newStatus } : todo
            )
          };
        });
        return { ...prevMilestone, tasks: updatedTasks };
      });
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusIcon = (status: StatusType, isCompleted: boolean) => {
    if (isCompleted) {
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
    switch (status) {
      case StatusType.IN_PROGRESS:
        return <Clock className="w-4 h-4 text-blue-500" />;
      case StatusType.CANCELLED:
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: StatusType) => {
    switch (status) {
      case StatusType.OUTSTANDING:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600';
      case StatusType.IN_PROGRESS:
        return 'bg-blue-50 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700';
      case StatusType.FINISHED:
        return 'bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700';
      case StatusType.CANCELLED:
        return 'bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600';
    }
  };

  const getPriorityColor = (priority: PriorityType) => {
    switch (priority) {
      case PriorityType.HIGH:
        return 'bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700';
      case PriorityType.MEDIUM:
        return 'bg-yellow-50 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700';
      case PriorityType.LOW:
        return 'bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700';
      default:
        return 'bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600';
    }
  };

  const calculateProgress = () => {
    let totalItems = 0;
    let completedItems = 0;

    tasks.forEach(task => {
      totalItems += 1;
      if (task.status === StatusType.FINISHED) completedItems += 1;
      
      if (task.subtasks) {
        totalItems += task.subtasks.length;
        completedItems += task.subtasks.filter(s => s.status === StatusType.FINISHED).length;
      }
      
      if (task.todos) {
        totalItems += task.todos.length;
        completedItems += task.todos.filter(t => t.status === StatusType.FINISHED).length;
      }
    });

    // If no tasks exist, milestone should be 100% complete
    return totalItems === 0 ? 100 : (completedItems / totalItems) * 100;
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      {/* Milestone Header */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="flex-shrink-0 mt-1">
              <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{milestone.title}</h3>
              {milestone.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{milestone.description}</p>
              )}
              
              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Progress</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{Math.round(calculateProgress())}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-400 h-2 rounded-full transition-all duration-300 relative"
                    style={{ width: `${calculateProgress()}%` }}
                  >
                    {/* Animated shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                {milestone.due_date && (
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>Due {formatDate(milestone.due_date)}</span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <span>{tasks.length} tasks</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 flex-shrink-0">
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(milestone.status)}`}>
              {milestone.status}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(milestone.priority)}`}>
              {milestone.priority}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={handleExpand}
            className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span>{isExpanded ? 'Hide Tasks' : 'Show Tasks'} ({tasks.length})</span>
          </button>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsCreatingTask(true)}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add Task</span>
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900 rounded-md transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tasks Section */}
      {isExpanded && (
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <div className="animate-spin w-6 h-6 border-2 border-gray-300 dark:border-gray-600 border-t-blue-600 dark:border-t-blue-400 rounded-full mx-auto mb-2"></div>
              Loading tasks...
            </div>
          ) : (
            <TaskKanbanView
              tasks={tasks}
              onTaskToggle={(taskId, status) => handleTaskToggle(taskId, 'task', status)}
              onSubtaskToggle={(subtaskId, status, parentTaskId) => parentTaskId && handleTaskToggle(subtaskId, 'subtask', status, parentTaskId)}
              onTodoToggle={(todoId, status, parentTaskId) => parentTaskId && handleTaskToggle(todoId, 'todo', status, parentTaskId)}
              onAddTask={() => setIsCreatingTask(true)}
              onAddTodo={(task) => {
                setSelectedTask(task);
                setIsCreatingTodo(true);
              }}
              onAddSubtask={(task) => {
                setSelectedTask(task);
                setIsCreatingSubtask(true);
              }}
              isUpdating={isUpdating}
            />
          )}
        </div>
      )}

      {/* Modal Forms */}
      {isCreatingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Create New Task</h3>
            <TaskForm
              goalId={goalId}
              milestoneId={milestone.id}
              onSuccess={handleTaskFormSuccess}
              onCancel={() => setIsCreatingTask(false)}
            />
          </div>
        </div>
      )}

      {isCreatingTodo && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Create New Todo</h3>
            <TodoForm
              goalId={goalId}
              milestoneId={milestone.id}
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
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Create New Subtask</h3>
            <SubtaskForm
              goalId={goalId}
              milestoneId={milestone.id}
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


function getPriorityColor(priority: PriorityType) {
  switch (priority) {
    case PriorityType.HIGH:
      return 'bg-red-50 text-red-800 border-red-200';
    case PriorityType.MEDIUM:
      return 'bg-yellow-50 text-yellow-800 border-yellow-200';
    case PriorityType.LOW:
      return 'bg-green-50 text-green-800 border-green-200';
    default:
      return 'bg-gray-50 text-gray-800 border-gray-200';
  }
}
