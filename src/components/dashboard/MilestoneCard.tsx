'use client';

import React, { useRef, useState } from 'react';
import { MilestoneItem as Milestone, TaskItem as Task, TodoItem as Todo, StatusType, PriorityType } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { toast } from '@/store/useToast';
import { useTodoStreaks } from '@/store/useTodoStreaks';
import { formatDate } from '@/lib/utils';
import { calculateMilestoneProgress } from '@/lib/progress';
import { tasksApi, todosApi, subtasksApi, milestonesApi } from '@/lib/api';
import { TaskForm } from '@/components/dashboard/TaskForm';
import { ActionForm, ActionKind } from '@/components/dashboard/ActionForm';
import { ChevronDown, ChevronRight, Plus, Calendar, Target, Trash2 } from 'lucide-react';
import TaskKanbanView from './TaskKanbanView';
import { useTheme } from '@/context/ThemeContext';

interface MilestoneCardProps {
 milestone: Milestone;
 goalId: string;
 onUpdate: (data: Partial<Milestone>) => void;
 onDelete: () => void;
 onAddTask?: () => void;
}

export default function MilestoneCard({ milestone, goalId, onUpdate, onDelete, onAddTask }: MilestoneCardProps) {
 const { theme } = useTheme();

 // Store integration — read latest milestone straight from the goal so the
 // card re-renders when nested entities are mutated elsewhere.
 const milestoneFromStore = useStore((state) => {
 const goal = state.goals.find((g) => g.id === goalId);
 return goal?.milestones?.find((m) => m.id === milestone.id);
 });
 const {
 addTodoToTaskInMilestoneInGoal,
 addSubtaskToTaskInMilestoneInGoal,
 addTaskToMilestoneInGoal,
 updateTaskInGoals,
 updateTodoInGoals,
 updateSubtaskInGoals,
 updateMilestoneInGoals,
 deleteTaskFromGoals,
 moveTaskToMilestone,
 reorderTasksInMilestone,
 } = useStore(
 useShallow((s) => ({
 addTodoToTaskInMilestoneInGoal: s.addTodoToTaskInMilestoneInGoal,
 addSubtaskToTaskInMilestoneInGoal: s.addSubtaskToTaskInMilestoneInGoal,
 addTaskToMilestoneInGoal: s.addTaskToMilestoneInGoal,
 updateTaskInGoals: s.updateTaskInGoals,
 updateTodoInGoals: s.updateTodoInGoals,
 updateSubtaskInGoals: s.updateSubtaskInGoals,
 updateMilestoneInGoals: s.updateMilestoneInGoals,
 deleteTaskFromGoals: s.deleteTaskFromGoals,
 moveTaskToMilestone: s.moveTaskToMilestone,
 reorderTasksInMilestone: s.reorderTasksInMilestone,
 }))
 );

 // UI State
 const [isExpanded, setIsExpanded] = useState(false);
 const [isCreatingTask, setIsCreatingTask] = useState(false);
 const [actionTarget, setActionTarget] = useState<{ task: Task; kind: ActionKind } | null>(null);
 const [isDropTarget, setIsDropTarget] = useState(false);
 // Loading States
 const [isUpdating, setIsUpdating] = useState(false);
 const [isLoading, setIsLoading] = useState(false);

 // Per-item toggle versioning — guards against rapid successive toggles
 // where in-flight responses could land out of order and clobber state.
 const toggleVersionsRef = useRef<Map<string, number>>(new Map());

 const currentMilestone: Milestone = milestoneFromStore ?? milestone;
 const tasks: Task[] = currentMilestone.tasks || [];

 const handleTaskFormSuccess = (newTask: Task, taskGoalId: string, taskMilestoneId: string) => {
 try {
 addTaskToMilestoneInGoal(newTask, taskMilestoneId, taskGoalId);
 setIsCreatingTask(false);
 } catch (error) {
 console.error('Error optimistically adding task from MilestoneCard:', error);
 toast.error('Failed to add task to milestone');
 }
 };

 const handleDropTask = async (e: React.DragEvent) => {
 e.preventDefault();
 setIsDropTarget(false);
 const taskId = e.dataTransfer.getData('application/x-tasknest-task-id');
 if (!taskId) return;
 const fromMilestoneId = e.dataTransfer.getData('application/x-tasknest-from-milestone-id');
 if (fromMilestoneId === currentMilestone.id) return;
 // Optimistic move; revert on API failure.
 moveTaskToMilestone(taskId, currentMilestone.id);
 try {
 const updated = await tasksApi.update({ id: taskId, milestone_id: currentMilestone.id });
 updateTaskInGoals(updated);
 toast.success('Task moved');
 } catch (err) {
 console.error('Failed to move task:', err);
 toast.error('Failed to move task — reverting');
 if (fromMilestoneId) moveTaskToMilestone(taskId, fromMilestoneId);
 }
 };

 const handleReorderTask = (draggedId: string, beforeId: string) => {
 const ids = tasks.map((t) => t.id);
 const fromIdx = ids.indexOf(draggedId);
 const toIdx = ids.indexOf(beforeId);
 if (fromIdx < 0 || toIdx < 0) return;
 const next = [...ids];
 next.splice(fromIdx, 1);
 next.splice(toIdx, 0, draggedId);
 if (next.join(',') === ids.join(',')) return;
 reorderTasksInMilestone(currentMilestone.id, next);
 };

 const handleQuickAddTask = async (title: string) => {
 try {
 const created = await tasksApi.create({
 title,
 description: '',
 status: StatusType.OUTSTANDING,
 priority: PriorityType.MEDIUM,
 milestone_id: currentMilestone.id,
 todos: [],
 subtasks: [],
 });
 addTaskToMilestoneInGoal(created, currentMilestone.id, goalId);
 toast.success('Task added');
 } catch (err) {
 console.error('Failed to quick-add task:', err);
 toast.error('Failed to add task');
 }
 };

 const handleActionSuccess = (
 item: import('@/lib/types').SubtaskItem | Todo,
 kind: ActionKind,
 actionGoalId: string,
 actionMilestoneId: string,
 actionTaskId: string,
 ) => {
 try {
 if (kind === 'todo') {
 addTodoToTaskInMilestoneInGoal(item as Todo, actionTaskId, actionMilestoneId, actionGoalId);
 } else {
 addSubtaskToTaskInMilestoneInGoal(item as import('@/lib/types').SubtaskItem, actionTaskId, actionMilestoneId, actionGoalId);
 }
 setActionTarget(null);
 } catch (error) {
 console.error('Error optimistically adding action:', error);
 toast.error(`Failed to add ${kind}`);
 }
 };

 const handleTaskUpdate = async (taskId: string, taskData: Partial<Task>) => {
 try {
 const updatedTask = await tasksApi.update({
 id: taskId,
 ...taskData
 });
 updateTaskInGoals(updatedTask);
 } catch (error) {
 console.error('Error updating task:', error);
 toast.error('Failed to update task');
 }
 };

 const handleTaskDelete = async (taskId: string) => {
 try {
 await tasksApi.delete(taskId);
 deleteTaskFromGoals(taskId);
 } catch (error) {
 console.error('Error deleting task:', error);
 toast.error('Failed to delete task');
 }
 };

 const handleExpand = async () => {
 if (!isExpanded) {
 setIsLoading(true);
 try {
 const fullMilestone = await milestonesApi.getById(milestone.id, true, true, true);
 updateMilestoneInGoals(fullMilestone);
 } catch (error) {
 console.error('Failed to load milestone details:', error);
 toast.error('Failed to load milestone details');
 } finally {
 setIsLoading(false);
 }
 }
 setIsExpanded(!isExpanded);
 };

 const handleTaskToggle = async (
 itemId: string,
 type: 'task' | 'subtask' | 'todo',
 currentStatus: StatusType,
 parentTaskId?: string
 ) => {
 const versions = toggleVersionsRef.current;
 const myVersion = (versions.get(itemId) ?? 0) + 1;
 versions.set(itemId, myVersion);
 const isLatest = () => versions.get(itemId) === myVersion;

 setIsUpdating(true);
 try {
 const newStatus = currentStatus === StatusType.FINISHED ? StatusType.OUTSTANDING : StatusType.FINISHED;
 const endDatetimePatch = newStatus === StatusType.FINISHED ? { end_datetime: new Date().toISOString() } : {};

 // Defensive: backend may strip `end_datetime` from PATCH responses,
 // which would break Activity heatmap / streak calculations. Force the
 // client to keep the timestamp we just sent.
 const localStamp = endDatetimePatch.end_datetime;
 switch (type) {
 case 'task': {
 // Single round-trip: merge the PATCH response with existing nested
 // subtasks/todos so we don't refetch the whole task tree.
 const patched = await tasksApi.update({ id: itemId, status: newStatus, ...endDatetimePatch });
 const existing = tasks.find((t) => t.id === itemId);
 if (isLatest()) {
 updateTaskInGoals({
 ...patched,
 end_datetime: patched.end_datetime ?? localStamp,
 subtasks: existing?.subtasks ?? patched.subtasks ?? [],
 todos: existing?.todos ?? patched.todos ?? [],
 });
 }
 break;
 }
 case 'subtask': {
 const updatedSubtask = await subtasksApi.update({ id: itemId, status: newStatus, ...endDatetimePatch });
 if (isLatest()) {
 updateSubtaskInGoals({ ...updatedSubtask, end_datetime: updatedSubtask.end_datetime ?? localStamp });
 }
 break;
 }
 case 'todo': {
 const updatedTodo = await todosApi.update({ id: itemId, status: newStatus, ...endDatetimePatch });
 if (isLatest()) {
 updateTodoInGoals({ ...updatedTodo, end_datetime: updatedTodo.end_datetime ?? localStamp });
 // Streak tracking: completed = log today, un-completed = pop last.
 if (newStatus === StatusType.FINISHED) {
 useTodoStreaks.getState().recordCompletion(itemId);
 } else {
 useTodoStreaks.getState().removeLastCompletion(itemId);
 }
 }
 break;
 }
 }
 } catch (error) {
 console.error('Failed to update task status:', error);
 if (isLatest()) toast.error('Failed to update status');
 } finally {
 if (isLatest()) setIsUpdating(false);
 }
 };

 const getStatusColor = (status: StatusType) => {
 switch (status) {
 case StatusType.OUTSTANDING:
 return 'bg-muted dark:bg-card text-foreground dark:text-muted-foreground/60 border-border dark:border-border';
 case StatusType.IN_PROGRESS:
 return 'bg-blue-50 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700';
 case StatusType.FINISHED:
 return 'bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700';
 case StatusType.CANCELLED:
 return 'bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700';
 default:
 return 'bg-muted dark:bg-card text-foreground dark:text-muted-foreground/60 border-border dark:border-border';
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
 return 'bg-muted dark:bg-card text-foreground dark:text-muted-foreground/60 border-border dark:border-border';
 }
 };

 const progress = calculateMilestoneProgress(currentMilestone);

 return (
 <div
 className={`bg-card dark:bg-card border rounded-lg shadow-sm hover:shadow-md transition-shadow ${
 isDropTarget ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900' : 'border-border dark:border-border'
 }`}
 onDragOver={(e) => {
 if (e.dataTransfer.types.includes('application/x-tasknest-task-id')) {
 e.preventDefault();
 e.dataTransfer.dropEffect = 'move';
 setIsDropTarget(true);
 }
 }}
 onDragLeave={() => setIsDropTarget(false)}
 onDrop={handleDropTask}
 >
 {/* Milestone Header */}
 <div className="p-6 border-b border-border dark:border-border">
 <div className="flex items-start justify-between">
 <div className="flex items-start space-x-3 flex-1">
 <div className="flex-shrink-0 mt-1">
 <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
 </div>
 <div className="flex-1 min-w-0">
 <h3 className="text-lg font-semibold text-foreground mb-1">{currentMilestone.title}</h3>
 {currentMilestone.description && (
 <p className="text-sm text-foreground dark:text-muted-foreground/60 mb-3">{currentMilestone.description}</p>
 )}
 
 {/* Progress Bar */}
 <div className="mb-3">
 <div className="flex justify-between items-center mb-1">
 <span className="text-xs font-medium text-foreground dark:text-muted-foreground/60">Progress</span>
 <span className="text-xs text-muted-foreground dark:text-muted-foreground">{Math.round(progress)}%</span>
 </div>
 <div className="w-full bg-muted dark:bg-card rounded-full h-2 overflow-hidden">
 <div
 className="bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-400 h-2 rounded-full transition-all duration-300 relative"
 style={{ width: `${progress}%` }}
 >
 {/* Animated shine effect */}
 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent animate-pulse"></div>
 </div>
 </div>
 </div>

 {/* Metadata */}
 <div className="flex items-center space-x-4 text-xs text-muted-foreground dark:text-muted-foreground">
 {currentMilestone.due_date && (
 <div className="flex items-center space-x-1">
 <Calendar className="w-3 h-3" />
 <span>Due {formatDate(currentMilestone.due_date)}</span>
 </div>
 )}
 <div className="flex items-center space-x-1">
 <span>{tasks.length} tasks</span>
 </div>
 </div>
 </div>
 </div>
 
 <div className="flex items-center space-x-2 flex-shrink-0">
 <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(currentMilestone.status)}`}>
 {currentMilestone.status}
 </span>
 <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(currentMilestone.priority)}`}>
 {currentMilestone.priority}
 </span>
 </div>
 </div>

 {/* Action Buttons */}
 <div className="flex items-center justify-between mt-4">
 <button
 onClick={handleExpand}
 className="flex items-center space-x-2 text-sm text-foreground dark:text-muted-foreground/60 hover:text-foreground dark:hover:text-white transition-colors"
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
 <div className="text-center py-8 text-muted-foreground dark:text-muted-foreground">
 <div className="animate-spin w-6 h-6 border-2 border-border dark:border-border border-t-blue-600 dark:border-t-blue-400 rounded-full mx-auto mb-2"></div>
 Loading tasks...
 </div>
 ) : (
 <TaskKanbanView
 tasks={tasks}
 onTaskToggle={(taskId, status) => handleTaskToggle(taskId, 'task', status)}
 onSubtaskToggle={(subtaskId, status, parentTaskId) => parentTaskId && handleTaskToggle(subtaskId, 'subtask', status, parentTaskId)}
 onTodoToggle={(todoId, status, parentTaskId) => parentTaskId && handleTaskToggle(todoId, 'todo', status, parentTaskId)}
 onAddTask={() => setIsCreatingTask(true)}
 onQuickAddTask={handleQuickAddTask}
 onReorderTask={handleReorderTask}
 onAddTodo={(task) => setActionTarget({ task, kind: 'todo' })}
 onAddSubtask={(task) => setActionTarget({ task, kind: 'subtask' })}
 isUpdating={isUpdating}
 />
 )}
 </div>
 )}

 {/* Modal Forms */}
 {isCreatingTask && (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
 <div className="bg-card dark:bg-card rounded-lg p-6 max-w-md w-full mx-4">
 <h3 className="text-lg font-semibold mb-4 text-foreground">Create New Task</h3>
 <TaskForm
 goalId={goalId}
 milestoneId={currentMilestone.id}
 onSuccess={handleTaskFormSuccess}
 onCancel={() => setIsCreatingTask(false)}
 />
 </div>
 </div>
 )}

 {actionTarget && (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
 <div className="bg-card dark:bg-card rounded-lg p-6 max-w-md w-full mx-4">
 <h3 className="text-lg font-semibold mb-4 text-foreground">
 Add Action to"{actionTarget.task.title}"
 </h3>
 <ActionForm
 goalId={goalId}
 milestoneId={currentMilestone.id}
 taskId={actionTarget.task.id}
 defaultKind={actionTarget.kind}
 onSuccess={handleActionSuccess}
 onCancel={() => setActionTarget(null)}
 />
 </div>
 </div>
 )}
 </div>
 );
}
