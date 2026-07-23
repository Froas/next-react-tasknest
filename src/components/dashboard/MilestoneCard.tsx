'use client';

import React, { useRef, useState } from 'react';
import { MilestoneItem as Milestone, TaskItem as Task, TodoItem as Todo, StatusType, PriorityType } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { toast } from '@/store/useToast';
import { formatDate } from '@/lib/utils';
import { calculateMilestoneProgress } from '@/lib/progress';
import { tasksApi, todosApi, subtasksApi, milestonesApi } from '@/lib/api';
import { TaskForm } from '@/components/dashboard/TaskForm';
import { ActionForm, ActionKind } from '@/components/dashboard/ActionForm';
import { Modal } from '@/components/ui/Modal';
import { InlineDate, InlineSelect, InlineText } from '@/components/ui/InlineEdit';
import { ChevronDown, ChevronRight, Plus, Calendar, Target, Trash2 } from 'lucide-react';
import TaskKanbanView from './TaskKanbanView';
import { useTheme } from '@/context/ThemeContext';

interface MilestoneCardProps {
 milestone: Milestone;
 goalId: string;
 onUpdate: (data: Partial<Milestone>) => void | Promise<void>;
 onDelete: () => void;
 onAddTask?: () => void;
}

const statusOptions = [
 StatusType.OUTSTANDING,
 StatusType.STARTED,
 StatusType.IN_PROGRESS,
 StatusType.FINISHED,
 StatusType.CLOSED,
 StatusType.ABORTED,
 StatusType.CANCELLED,
] as const;

const priorityOptions = [
 PriorityType.LOW,
 PriorityType.MEDIUM,
 PriorityType.HIGH,
] as const;

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
 fetchGoals,
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
 fetchGoals: s.fetchGoals,
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

 const handleTaskFormSuccess = (newTask: Task, taskGoalId: string, taskMilestoneId?: string) => {
 try {
 if (!taskMilestoneId || newTask.scope === 'goal') updateTaskInGoals({ ...newTask, goal_id: newTask.goal_id ?? taskGoalId, scope: 'goal' });
 else addTaskToMilestoneInGoal(newTask, taskMilestoneId, taskGoalId);
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

 const handleReorderTask = async (draggedId: string, beforeId: string) => {
 const ids = tasks.map((t) => t.id);
 const fromIdx = ids.indexOf(draggedId);
 const toIdx = ids.indexOf(beforeId);
 if (fromIdx < 0 || toIdx < 0) return;
 const next = [...ids];
 next.splice(fromIdx, 1);
 next.splice(toIdx, 0, draggedId);
 if (next.join(',') === ids.join(',')) return;
 reorderTasksInMilestone(currentMilestone.id, next);
 try {
 await tasksApi.reorder(next);
 } catch (err) {
 console.error('Failed to reorder tasks:', err);
 toast.error('Failed to reorder tasks — reverting');
 reorderTasksInMilestone(currentMilestone.id, ids);
 }
 };

 const handleQuickAddTask = async (title: string, kind: 'project' | 'challenge') => {
 try {
 const created = await tasksApi.create({
 title,
 description: '',
 status: kind === 'challenge' ? StatusType.STARTED : StatusType.OUTSTANDING,
 priority: PriorityType.MEDIUM,
 kind,
 scope: 'milestone',
 goal_id: goalId,
 milestone_id: currentMilestone.id,
 todos: [],
 subtasks: [],
 completion_rule: kind === 'challenge' ? {
 type: 'consistency',
 label: title,
 required_done: 7,
 window_days: 7,
 } : { type: 'structural' },
 });
 addTaskToMilestoneInGoal(created, currentMilestone.id, goalId);
 toast.success(kind === 'challenge' ? 'Challenge added' : 'Task added');
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
 throw error;
 }
 };

 const handleSubtaskUpdate = async (subtaskId: string, subtaskData: Partial<import('@/lib/types').SubtaskItem>) => {
 try {
 const updatedSubtask = await subtasksApi.update({ id: subtaskId, ...subtaskData });
 updateSubtaskInGoals(updatedSubtask);
 } catch (error) {
 console.error('Error updating subtask:', error);
 toast.error('Failed to update step');
 throw error;
 }
 };

 const handleTodoUpdate = async (todoId: string, todoData: Partial<Todo>) => {
 try {
 const updatedTodo = await todosApi.update({ id: todoId, ...todoData });
 updateTodoInGoals(updatedTodo);
 } catch (error) {
 console.error('Error updating todo:', error);
 toast.error('Failed to update repeating action');
 throw error;
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
 }
 break;
 }
 }
 await fetchGoals({ force: true, silent: true });
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
 return 'status-outstanding';
 case StatusType.IN_PROGRESS:
 return 'status-in-progress';
 case StatusType.FINISHED:
 return 'status-finished';
 case StatusType.CANCELLED:
 return 'status-outstanding';
 default:
 return '';
 }
 };

 const getPriorityColor = (priority: PriorityType) => {
 switch (priority) {
 case PriorityType.HIGH:
 return 'priority-high';
 case PriorityType.MEDIUM:
 return 'priority-medium';
 case PriorityType.LOW:
 return 'priority-low';
 default:
 return '';
 }
 };

 const progress = calculateMilestoneProgress(currentMilestone);
 const renderStatusPill = (status: StatusType) => (
 <span className={`pill ${getStatusColor(status)}`}>{status}</span>
 );
 const renderPriorityPill = (priority: PriorityType) => (
 <span className={`pill ${getPriorityColor(priority)}`}>{priority}</span>
 );
 const renderDueDate = (value?: string | null) => (
 <span className="inline-flex items-center gap-1">
 <Calendar className="w-3 h-3" />
 <span>{value ? `Due ${formatDate(value)}` : 'Add due date'}</span>
 </span>
 );

 return (
 <div
 className="bg-card dark:bg-card border rounded-lg shadow-sm hover:shadow-md transition-shadow min-w-0"
 style={{
 borderColor: isDropTarget ? 'var(--tn-accent)' : undefined,
 boxShadow: isDropTarget ? '0 0 0 2px color-mix(in srgb, var(--tn-accent) 22%, transparent)' : undefined,
 }}
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
 <div className="p-4 sm:p-6 border-b border-border dark:border-border">
 <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
 <div className="flex items-start gap-3 flex-1 min-w-0">
 <div className="flex-shrink-0 mt-1">
 <Target className="w-5 h-5" style={{ color: 'var(--tn-accent)' }} />
 </div>
 <div className="flex-1 min-w-0">
 <InlineText
 value={currentMilestone.title}
 required
 ariaLabel="Edit milestone title"
 className="-mx-2 px-2 py-1 mb-1"
 editClassName="text-lg font-semibold text-foreground"
 renderValue={(title) => <h3 className="text-lg font-semibold text-foreground mb-1 break-words">{title}</h3>}
 onSave={(title) => onUpdate({ title })}
 />
 <InlineText
 value={currentMilestone.description ?? ''}
 placeholder="Add a description..."
 multiline
 ariaLabel="Edit milestone description"
 className="-mx-2 px-2 py-1 mb-3"
 editClassName="text-sm text-foreground dark:text-muted-foreground/60"
 renderValue={(description) => (
 <p className="text-sm text-foreground dark:text-muted-foreground/60 mb-3 break-words">{description}</p>
 )}
 onSave={(description) => onUpdate({ description })}
 />
 <div
 className="mb-3 rounded-xl border px-3 py-2.5"
 style={{
 background: 'color-mix(in srgb, var(--tn-accent) 5%, var(--tn-card))',
 borderColor: 'color-mix(in srgb, var(--tn-accent) 16%, transparent)',
 }}
 >
 <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--tn-accent)' }}>
 Success criteria
 </div>
 <InlineText
 value={currentMilestone.success_criteria ?? ''}
 placeholder="Define what makes this milestone complete…"
 multiline
 ariaLabel="Edit milestone success criteria"
 className="-mx-1 px-1 py-0.5"
 editClassName="text-sm text-foreground"
 renderValue={(criteria) => <p className="text-sm text-foreground break-words">{criteria}</p>}
 onSave={(success_criteria) => onUpdate({ success_criteria })}
 />
 </div>
 
 {/* Progress Bar */}
 <div className="mb-3">
 <div className="flex justify-between items-center mb-1">
 <span className="text-xs font-medium text-foreground dark:text-muted-foreground/60">Structural</span>
 <span className="text-xs text-muted-foreground dark:text-muted-foreground">{Math.round(progress)}%</span>
 </div>
 <div className="w-full rounded-full h-2.5 overflow-hidden" style={{ background: 'var(--tn-bar-bg, rgba(0,0,0,.08))', border: 'var(--tn-line)' }}>
 <div
 className="h-full rounded-full transition-all duration-300 relative"
 style={{ width: `${progress}%`, background: 'var(--tn-accent)' }}
 >
 {/* Animated shine effect */}
 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent animate-pulse"></div>
 </div>
 </div>
 </div>

 {/* Metadata */}
 <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground dark:text-muted-foreground">
 <InlineDate
 value={currentMilestone.due_date}
 ariaLabel="Edit milestone due date"
 renderValue={renderDueDate}
 onSave={(due_date) => onUpdate({ due_date })}
 />
 <div className="flex items-center gap-1">
 <span>{tasks.length} tasks</span>
 </div>
 </div>
 </div>
 </div>
 
 <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
 <InlineSelect
 value={currentMilestone.status}
 options={statusOptions}
 ariaLabel="Edit milestone status"
 renderValue={renderStatusPill}
 onSave={(status) => onUpdate({ status })}
 />
 <InlineSelect
 value={currentMilestone.priority}
 options={priorityOptions}
 ariaLabel="Edit milestone priority"
 renderValue={renderPriorityPill}
 onSave={(priority) => onUpdate({ priority })}
 />
 </div>
 </div>

 {/* Action Buttons */}
 <div className="flex flex-col gap-3 mt-4 sm:flex-row sm:items-center sm:justify-between">
 <button
 onClick={handleExpand}
 className="flex items-center gap-2 text-sm text-foreground dark:text-muted-foreground/60 hover:text-foreground dark:hover:text-white transition-colors"
 >
 {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
 <span>{isExpanded ? 'Hide Tasks' : 'Show Tasks'} ({tasks.length})</span>
 </button>
 
 <div className="flex flex-wrap items-center gap-2">
 <button
 onClick={() => setIsCreatingTask(true)}
 className="btn btn-primary flex-1 sm:flex-none justify-center"
 >
 <Plus className="w-3 h-3" />
 <span>Add Task</span>
 </button>
 <button
 onClick={onDelete}
 className="btn btn-icon btn-danger-ghost"
 title="Delete milestone"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </div>
 </div>

 {/* Tasks Section */}
 {isExpanded && (
 <div className="p-4 sm:p-6">
 {isLoading ? (
 <div className="text-center py-8 text-muted-foreground dark:text-muted-foreground">
 <div className="animate-spin w-6 h-6 border-2 rounded-full mx-auto mb-2" style={{ borderColor: 'var(--tn-border, rgba(0,0,0,.12))', borderTopColor: 'var(--tn-accent)' }}></div>
 Loading tasks...
 </div>
 ) : (
 <TaskKanbanView
 tasks={tasks}
 onTaskToggle={(taskId, status) => handleTaskToggle(taskId, 'task', status)}
 onSubtaskToggle={(subtaskId, status, parentTaskId) => parentTaskId && handleTaskToggle(subtaskId, 'subtask', status, parentTaskId)}
 onTodoToggle={(todoId, status, parentTaskId) => parentTaskId && handleTaskToggle(todoId, 'todo', status, parentTaskId)}
 onTaskUpdate={handleTaskUpdate}
 onSubtaskUpdate={handleSubtaskUpdate}
 onTodoUpdate={handleTodoUpdate}
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
 <Modal
 open={isCreatingTask}
 title="Create New Task"
 onClose={() => setIsCreatingTask(false)}
 maxWidth="md"
 >
 <TaskForm
 goalId={goalId}
 milestoneId={currentMilestone.id}
 onSuccess={handleTaskFormSuccess}
 onCancel={() => setIsCreatingTask(false)}
 />
 </Modal>

 <Modal
 open={!!actionTarget}
 title={`Add Action to "${actionTarget?.task.title ?? ''}"`}
 onClose={() => setActionTarget(null)}
 maxWidth="2xl"
 >
 {actionTarget && (
 <ActionForm
 goalId={goalId}
 milestoneId={currentMilestone.id}
 taskId={actionTarget.task.id}
 taskKind={actionTarget.task.kind}
 defaultKind={actionTarget.kind}
 onSuccess={handleActionSuccess}
 onCancel={() => setActionTarget(null)}
 />
 )}
 </Modal>
 </div>
 );
}
