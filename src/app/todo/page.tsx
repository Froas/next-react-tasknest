'use client';

import React, { type CSSProperties, useState, useEffect } from 'react';
import Link from 'next/link';
import { withAuth } from '@/hoc/withAuth';
import { TodoItem, TaskItem, SubtaskItem, StatusType, PriorityType } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { goalsApi, todosApi, subtasksApi } from '@/lib/api';
import { toast } from '@/store/useToast';
import { useTodoStreaks, getStreak } from '@/store/useTodoStreaks';
import { StreakHeatmap } from '@/components/dashboard/StreakHeatmap';
import { usePersistentState } from '@/lib/usePersistentState';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { CheckSquare, CheckCircle2, Circle, List, Target, Plus, Check, Calendar, GripVertical } from 'lucide-react';
import { MissedRoutineHistory } from '@/components/dashboard/MissedRoutineHistory';

type ItemType = 'task' | 'todo' | 'subtask';
type ViewFilter = 'all' | 'todos' | 'subtasks';

interface KanbanItem {
 id: string;
 title: string;
 description?: string;
 status: StatusType;
 priority: PriorityType;
 due_date?: string;
 type: ItemType;
 taskId?: string;
 position?: number;
 taskTitle?: string;
 goalTitle?: string;
 milestoneTitle?: string;
}

type DragItem = Pick<KanbanItem, 'id' | 'type' | 'taskId' | 'status'>;

const TodosPage: React.FC = () => {
 const [viewFilter, setViewFilter] = usePersistentState<ViewFilter>('todo:viewFilter', 'all');
 const [draggingItem, setDraggingItem] = useState<DragItem | null>(null);
 const [dropTargetTodoId, setDropTargetTodoId] = useState<string | null>(null);
 const [dropTargetStatus, setDropTargetStatus] = useState<StatusType | null>(null);
 useDocumentTitle('Todos');

 const goals = useStore((s) => s.goals);
 const tasks = useStore((s) => s.tasks);
 const todos = useStore((s) => s.todos);
 const isLoadingGoals = useStore((s) => s.isLoadingGoals);
 const isLoadingTasks = useStore((s) => s.isLoadingTasks);
 const isLoadingTodos = useStore((s) => s.isLoadingTodos);
 const { fetchGoals, fetchTasks, fetchTodos, setGoals, updateTodoInGoals, updateSubtaskInGoals, reorderTodosInTask, reorderSubtasksInTask } = useStore(
 useShallow((s) => ({
 fetchGoals: s.fetchGoals,
 fetchTasks: s.fetchTasks,
 fetchTodos: s.fetchTodos,
 setGoals: s.setGoals,
 updateTodoInGoals: s.updateTodoInGoals,
 updateSubtaskInGoals: s.updateSubtaskInGoals,
 reorderTodosInTask: s.reorderTodosInTask,
 reorderSubtasksInTask: s.reorderSubtasksInTask,
 }))
 );

 const completionsMap = useTodoStreaks((s) => s.completions);

 useEffect(() => {
 void useTodoStreaks.getState().hydrate().catch(() => toast.error('Failed to load routine history'));
 }, []);

 const handleToggle = async (item: KanbanItem) => {
 const newStatus = item.status === StatusType.FINISHED ? StatusType.OUTSTANDING : StatusType.FINISHED;
 const localStamp = newStatus === StatusType.FINISHED ? new Date().toISOString() : undefined;
 const patch = {
 id: item.id,
 status: newStatus,
 ...(localStamp ? { end_datetime: localStamp } : {}),
 };

 try {
 if (item.type === 'todo') {
 const updated = await todosApi.update(patch);
 updateTodoInGoals({ ...updated, end_datetime: updated.end_datetime ?? localStamp });
 } else if (item.type === 'subtask') {
 const updated = await subtasksApi.update(patch);
 updateSubtaskInGoals({ ...updated, end_datetime: updated.end_datetime ?? localStamp });
 }
 } catch (err) {
 console.error('Failed to toggle item:', err);
 toast.error(`Failed to update ${item.type}`);
 }
 };

 useEffect(() => {
 const loadFullData = async () => {
 try {
 // Load goals with full nested data (like in GoalDetailView)
 const goalsWithFullData = await Promise.all(
 (await goalsApi.getAll()).map(async (goal) => {
 try {
 return await goalsApi.getById(goal.id, {
 include_milestones: true,
 include_tasks: true,
 include_subtasks: true,
 include_todos: true
 });
 } catch (error) {
 console.error(`Failed to fetch full data for goal ${goal.id}:`, error);
 return goal;
 }
 })
 );
 
 // Update the goals in the store with full data
 setGoals(goalsWithFullData);
 
 // Also fetch standalone tasks and todos
 fetchTasks();
 fetchTodos();
 } catch (error) {
 console.error('Failed to load full goal data:', error);
 // Fallback to regular fetch methods
 fetchGoals();
 fetchTasks();
 fetchTodos();
 }
 };

 loadFullData();
 }, [fetchGoals, fetchTasks, fetchTodos, setGoals]);

 const toneSurface = (tone: string, amount = 10): CSSProperties => ({
 background: `color-mix(in srgb, ${tone} ${amount}%, var(--tn-card))`,
 borderColor: `color-mix(in srgb, ${tone} ${Math.max(amount + 16, 28)}%, transparent)`,
 });

 const itemTypeStyle = (type: ItemType): CSSProperties => {
 const tone = type === 'todo' ? 'var(--tn-good, #2f7d50)' : 'var(--tn-plum, #8a6594)';
 return {
 background: tone,
 color: 'var(--tn-on-accent, #fff)',
 };
 };

 const segmentedButtonStyle = (active: boolean): CSSProperties => ({
 background: active ? 'var(--tn-accent)' : 'transparent',
 color: active ? 'var(--tn-on-accent)' : 'var(--tn-fg)',
 boxShadow: active ? 'var(--tn-shadow-soft, 0 1px 2px rgba(0,0,0,.08))' : undefined,
 });

 // Status columns configuration with theme-token tones.
 const statusColumns = [
 { 
 status: StatusType.OUTSTANDING, 
 title: 'Outstanding', 
 tone: 'var(--tn-fg-muted)'
 },
 { 
 status: StatusType.STARTED, 
 title: 'Started', 
 tone: 'var(--tn-warn, #c8932a)'
 },
 { 
 status: StatusType.IN_PROGRESS, 
 title: 'In Progress', 
 tone: 'var(--tn-accent)'
 },
 { 
 status: StatusType.FINISHED, 
 title: 'Finished', 
 tone: 'var(--tn-good, #2f7d50)'
 },
 { 
 status: StatusType.CLOSED, 
 title: 'Closed', 
 tone: 'var(--tn-fg-muted)'
 },
 { 
 status: StatusType.ABORTED, 
 title: 'Aborted', 
 tone: 'var(--tn-bad, #c25d63)'
 },
 { 
 status: StatusType.CANCELLED, 
 title: 'Cancelled', 
 tone: 'var(--tn-bad, #c25d63)'
 }
 ];

 // Get all items (ONLY subtasks and todos, NO tasks)
 const getAllItems = (): KanbanItem[] => {
 const allItems: KanbanItem[] = [];
 
 // Add subtasks and todos from goals structure
 goals.forEach(goal => {
 goal.milestones?.forEach(milestone => {
 milestone.tasks?.forEach(task => {
 // Add todos from tasks
 task.todos?.forEach(todo => {
 if (viewFilter === 'all' || viewFilter === 'todos') {
 allItems.push({
 id: todo.id,
 title: todo.title,
 description: todo.description,
 status: todo.status,
 priority: todo.priority,
 due_date: todo.due_date,
 type: 'todo',
 taskId: task.id,
 position: todo.position,
 taskTitle: task.title,
 goalTitle: goal.title,
 milestoneTitle: milestone.title
 });
 }
 });

 // Add subtasks 
 task.subtasks?.forEach(subtask => {
 if (viewFilter === 'all' || viewFilter === 'subtasks') {
 allItems.push({
 id: subtask.id,
 title: subtask.title,
 description: subtask.description,
 status: subtask.status,
 priority: subtask.priority,
 due_date: subtask.due_date,
 type: 'subtask',
 taskId: task.id,
 position: subtask.position,
 taskTitle: task.title,
 goalTitle: goal.title,
 milestoneTitle: milestone.title
 });
 }
 });
 });
 });
 });

 // Add standalone todos
 todos.forEach(todo => {
 if (!allItems.find(item => item.id === todo.id) && (viewFilter === 'all' || viewFilter === 'todos')) {
 allItems.push({
 id: todo.id,
 title: todo.title,
 description: todo.description,
 status: todo.status,
 priority: todo.priority,
 due_date: todo.due_date,
 type: 'todo',
 taskId: todo.task_id,
 position: todo.position,
 });
 }
 });

 // Add subtasks from tasks directly
 tasks.forEach(task => {
 if (task.subtasks && (viewFilter === 'all' || viewFilter === 'subtasks')) {
 task.subtasks.forEach(subtask => {
 if (!allItems.find(item => item.id === subtask.id)) {
 allItems.push({
 id: subtask.id,
 title: subtask.title,
 description: subtask.description || '',
 status: subtask.status,
 priority: subtask.priority,
 due_date: subtask.due_date,
 type: 'subtask',
 taskId: task.id,
 position: subtask.position,
 taskTitle: task.title
 });
 }
 });
 }
 });

 return allItems;
 };

 const allItems = getAllItems();
 const draggingTodoId = draggingItem?.type === 'todo' ? draggingItem.id : null;

 const getTodoOrderForTask = (taskId: string): string[] => {
 const nestedTask = goals
 .flatMap((goal) => goal.milestones ?? [])
 .flatMap((milestone) => milestone.tasks ?? [])
 .find((task) => task.id === taskId);
 const flatTask = tasks.find((task) => task.id === taskId);
 const taskTodos = nestedTask?.todos ?? flatTask?.todos ?? todos.filter((todo) => todo.task_id === taskId);
 return taskTodos
 .map((todo, index) => ({ todo, index }))
 .sort((a, b) => {
 const aPosition = a.todo.position ?? a.index + 1;
 const bPosition = b.todo.position ?? b.index + 1;
 return aPosition - bPosition || a.index - b.index;
 })
 .map(({ todo }) => todo.id);
 };

 const getSubtaskOrderForTask = (taskId: string): string[] => {
 const nestedTask = goals
 .flatMap((goal) => goal.milestones ?? [])
 .flatMap((milestone) => milestone.tasks ?? [])
 .find((task) => task.id === taskId);
 const flatTask = tasks.find((task) => task.id === taskId);
 const taskSubtasks = nestedTask?.subtasks ?? flatTask?.subtasks ?? [];
 return taskSubtasks
 .map((subtask, index) => ({ subtask, index }))
 .sort((a, b) => {
 const aPosition = a.subtask.position ?? a.index + 1;
 const bPosition = b.subtask.position ?? b.index + 1;
 return aPosition - bPosition || a.index - b.index;
 })
 .map(({ subtask }) => subtask.id);
 };

 const persistTodoOrder = async (target: KanbanItem) => {
 if (!draggingItem || draggingItem.type !== 'todo' || target.type !== 'todo' || !target.taskId || draggingItem.id === target.id) return;
 if (draggingItem.taskId !== target.taskId || draggingItem.status !== target.status) return;
 const previousOrder = getTodoOrderForTask(target.taskId);
 const fromIndex = previousOrder.indexOf(draggingItem.id);
 const toIndex = previousOrder.indexOf(target.id);
 if (fromIndex < 0 || toIndex < 0) return;
 const nextOrder = [...previousOrder];
 nextOrder.splice(fromIndex, 1);
 nextOrder.splice(toIndex, 0, draggingItem.id);
 reorderTodosInTask(target.taskId, nextOrder);
 try {
 await todosApi.reorder(nextOrder);
 } catch (error) {
 console.error('Failed to persist todo order:', error);
 reorderTodosInTask(target.taskId, previousOrder);
 toast.error('Failed to save todo order');
 }
 };

 const persistSubtaskOrder = async (target: KanbanItem) => {
 if (!draggingItem || draggingItem.type !== 'subtask' || target.type !== 'subtask' || !target.taskId || draggingItem.id === target.id) return;
 if (draggingItem.taskId !== target.taskId || draggingItem.status !== target.status) return;
 const previousOrder = getSubtaskOrderForTask(target.taskId);
 const fromIndex = previousOrder.indexOf(draggingItem.id);
 const toIndex = previousOrder.indexOf(target.id);
 if (fromIndex < 0 || toIndex < 0) return;
 const nextOrder = [...previousOrder];
 nextOrder.splice(fromIndex, 1);
 nextOrder.splice(toIndex, 0, draggingItem.id);
 reorderSubtasksInTask(target.taskId, nextOrder);
 try {
 await subtasksApi.reorder(nextOrder);
 } catch (error) {
 console.error('Failed to persist subtask order:', error);
 reorderSubtasksInTask(target.taskId, previousOrder);
 toast.error('Failed to save subtask order');
 }
 };

 const persistStatusMove = async (nextStatus: StatusType) => {
 if (!draggingItem || draggingItem.status === nextStatus) return;
 const finishedAt = nextStatus === StatusType.FINISHED ? new Date().toISOString() : undefined;
 const patch = {
 id: draggingItem.id,
 status: nextStatus,
 ...(finishedAt ? { end_datetime: finishedAt } : {}),
 };
 try {
 if (draggingItem.type === 'todo') {
 const updated = await todosApi.update(patch);
 updateTodoInGoals({ ...updated, end_datetime: updated.end_datetime ?? finishedAt });
 } else if (draggingItem.type === 'subtask') {
 const updated = await subtasksApi.update(patch);
 updateSubtaskInGoals({ ...updated, end_datetime: updated.end_datetime ?? finishedAt });
 }
 } catch (error) {
 console.error('Failed to move item:', error);
 toast.error(`Failed to move ${draggingItem.type}`);
 }
 };

 const getItemsForStatus = (status: StatusType) => {
 return allItems.filter(item => item.status === status);
 };

 if (isLoadingGoals || isLoadingTasks || isLoadingTodos) {
 return (
 <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tn-bg)' }}>
 <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--tn-accent)' }}></div>
 </div>
 );
 }

 return (
 <div className="page">
 <div className="mb-6">
 <StreakHeatmap />
 </div>
 <MissedRoutineHistory />
 {/* Page Header */}
 <div className="flex items-center justify-between mb-8">
 <div>
 <h1 className="page-title">Subtask & Todo Board</h1>
 <p className="page-lede">Nested recurring todos and one-off subtasks across tasks. Parent task cards stay on Tasks and Milestones.</p>
 </div>
 
 {/* Navigation Filters */}
 <div className="filter-actions rounded-lg p-1" style={{ background: 'var(--tn-surface-2, var(--tn-hover))', border: 'var(--tn-line)' }}>
 <button
 onClick={() => setViewFilter('all')}
 className="flex items-center space-x-2 px-4 py-2 rounded-md transition-all"
 style={segmentedButtonStyle(viewFilter === 'all')}
 >
 <List className="w-4 h-4" />
 <span>All</span>
 </button>
 <button
 onClick={() => setViewFilter('todos')}
 className="flex items-center space-x-2 px-4 py-2 rounded-md transition-all"
 style={segmentedButtonStyle(viewFilter === 'todos')}
 >
 <Target className="w-4 h-4" />
 <span>Todos</span>
 </button>
 <button
 onClick={() => setViewFilter('subtasks')}
 className="flex items-center space-x-2 px-4 py-2 rounded-md transition-all"
 style={segmentedButtonStyle(viewFilter === 'subtasks')}
 >
 <CheckSquare className="w-4 h-4" />
 <span>Subtasks</span>
 </button>
 </div>
 </div>

 {/* Kanban Board */}
 <div className="card" style={{ padding: 24 }}>
 {(() => {
 // Only show columns that have items
 const visibleColumns = allItems.length > 0 ? statusColumns : statusColumns.filter(column => {
 const columnItems = getItemsForStatus(column.status);
 return columnItems.length > 0;
 });

 return visibleColumns.length > 0 ? (
 <div className="md:flex md:gap-6 md:overflow-x-auto md:pb-4 space-y-4 md:space-y-0 -mx-2 md:mx-0 px-2 md:px-0" style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}>
 {visibleColumns.map((column) => {
 const columnItems = getItemsForStatus(column.status);

 return (
 <div
 key={column.status}
 className="md:flex-shrink-0 w-full md:w-80 rounded-xl shadow-lg overflow-hidden"
 onDragOver={(event) => {
 if (!draggingItem) return;
 event.preventDefault();
 event.dataTransfer.dropEffect = 'move';
 setDropTargetStatus(column.status);
 }}
 onDragLeave={() => {
 if (dropTargetStatus === column.status) setDropTargetStatus(null);
 }}
 onDrop={async (event) => {
 if (!draggingItem) return;
 event.preventDefault();
 await persistStatusMove(column.status);
 setDraggingItem(null);
 setDropTargetTodoId(null);
 setDropTargetStatus(null);
 }}
 style={{
 background: 'var(--tn-card)',
 border: dropTargetStatus === column.status ? '1px solid var(--tn-accent)' : 'var(--tn-line)',
 boxShadow: dropTargetStatus === column.status ? '0 0 0 3px color-mix(in srgb, var(--tn-accent) 18%, transparent)' : undefined,
 }}
 >
 {/* Column Header */}
 <div className="p-4 border-b" style={toneSurface(column.tone, 12)}>
 <div className="flex items-center justify-between mb-2">
 <h3 className="font-semibold text-foreground">{column.title}</h3>
 <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--tn-chip)', color: 'var(--tn-fg)' }}>
 {columnItems.length}
 </span>
 </div>
 </div>

 {/* Column Content */}
 <div className="p-4 space-y-3 flex-1 max-h-[calc(100vh-16rem)] overflow-y-auto">
 {columnItems.map((item) => (
 (() => {
 const canDragItem = (item.type === 'todo' || item.type === 'subtask') && !!item.taskId;
 const canReorderTodo =
 draggingItem?.type === 'todo' &&
 item.type === 'todo' &&
 draggingItem.taskId === item.taskId &&
 draggingItem.status === item.status;
 const canReorderSubtask =
 draggingItem?.type === 'subtask' &&
 item.type === 'subtask' &&
 draggingItem.taskId === item.taskId &&
 draggingItem.status === item.status;
 const isDragging = draggingItem?.id === item.id && draggingItem.type === item.type;
 const isDropTarget = dropTargetTodoId === item.id && draggingItem && draggingItem.id !== item.id;
 return (
 <div
 key={`${item.type}-${item.id}`}
 draggable={canDragItem}
 onDragStart={(event) => {
 if (!canDragItem) return;
 event.dataTransfer.effectAllowed = 'move';
 event.dataTransfer.setData('application/x-tasknest-board-item', `${item.type}:${item.id}`);
 setDraggingItem({ id: item.id, type: item.type, taskId: item.taskId, status: item.status });
 }}
 onDragOver={(event) => {
 if (!canDragItem || !draggingItem || draggingItem.id === item.id) return;
 event.preventDefault();
 event.stopPropagation();
 event.dataTransfer.dropEffect = 'move';
 setDropTargetTodoId(item.id);
 setDropTargetStatus(column.status);
 }}
 onDragLeave={() => {
 if (dropTargetTodoId === item.id) setDropTargetTodoId(null);
 }}
 onDrop={async (event) => {
 if (!canDragItem || !draggingItem) return;
 event.preventDefault();
 event.stopPropagation();
 if (canReorderTodo) await persistTodoOrder(item);
 else if (canReorderSubtask) await persistSubtaskOrder(item);
 else await persistStatusMove(item.status);
 setDraggingItem(null);
 setDropTargetTodoId(null);
 setDropTargetStatus(null);
 }}
 onDragEnd={() => {
 setDraggingItem(null);
 setDropTargetTodoId(null);
 setDropTargetStatus(null);
 }}
 className={`rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow border ${
 canDragItem ? 'cursor-grab active:cursor-grabbing' : ''
 }`}
 style={{
 ...toneSurface(column.tone, 6),
 borderColor: isDropTarget ? 'var(--tn-accent)' : toneSurface(column.tone, 6).borderColor,
 boxShadow: isDropTarget ? '0 0 0 3px color-mix(in srgb, var(--tn-accent) 24%, transparent)' : undefined,
 opacity: isDragging ? 0.55 : 1,
 }}
 >
 {/* Item Header */}
 <div className="flex items-start mb-3">
 {canDragItem && (
 <GripVertical className="mt-1 mr-2 h-4 w-4 flex-shrink-0" style={{ color: 'var(--tn-fg-muted)' }} />
 )}
 <button
 onClick={() => handleToggle(item)}
 aria-label={item.status === StatusType.FINISHED ? 'Mark as outstanding' : 'Mark as finished'}
 className="mt-1 mr-2 flex-shrink-0 rounded"
 >
 {item.status === StatusType.FINISHED ? (
 <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--tn-good, #2f7d50)' }} />
 ) : (
 <Circle className="w-5 h-5 text-muted-foreground hover:text-foreground" />
 )}
 </button>
 <div className="flex-1 min-w-0">
 <h4 className={`font-bold truncate ${item.status === StatusType.FINISHED ? 'line-through text-muted-foreground dark:text-muted-foreground' : 'text-foreground'}`}>
 {item.title}
 </h4>
 {item.description && (
 <p className={`text-sm mt-1 line-clamp-2 ${item.status === StatusType.FINISHED ? 'text-muted-foreground dark:text-muted-foreground' : 'text-foreground dark:text-muted-foreground/60'}`}>
 {item.description}
 </p>
 )}
 </div>
 </div>

 {/* Parent Information */}
 {item.taskTitle && (
 <div className="flex items-center text-xs mb-2 rounded px-2 py-1" style={{ background: 'var(--tn-chip)', color: 'var(--tn-fg-muted)' }}>
 <CheckSquare className="w-3 h-3 mr-1" />
 <span className="truncate">{item.taskTitle}</span>
 </div>
 )}

 {/* Additional Info */}
 <div className="flex items-center justify-between text-xs">
 <div className="flex items-center space-x-2">
 <span className="px-2 py-1 rounded-full" style={itemTypeStyle(item.type)}>
 {item.type === 'subtask' ? 'Subtask' : 'Todo'}
 </span>
 {item.type === 'todo' && (() => {
 const streak = getStreak(completionsMap[item.id] ?? []);
 if (streak < 2) return null;
 return (
 <span
 className="px-2 py-1 rounded-full"
 style={toneSurface('var(--tn-warn, #c8932a)', 16)}
 title={`${streak}-day streak`}
 >
 🔥 {streak}
 </span>
 );
 })()}
 </div>

 {item.due_date && (
 <div className="flex items-center text-foreground dark:text-muted-foreground">
 <Calendar className="w-3 h-3 mr-1" />
 <span>{new Date(item.due_date).toLocaleDateString()}</span>
 </div>
 )}
 </div>
 </div>
 );
 })()
 ))}

 <Link
 href="/goal"
 className="w-full p-3 border-2 border-dashed border-border rounded-lg text-foreground dark:text-muted-foreground hover:border-border dark:hover:border-border hover:text-foreground dark:hover:text-muted-foreground/60 transition-colors flex items-center justify-center space-x-2"
 >
 <Plus className="w-4 h-4" />
 <span className="text-sm">Add from a task</span>
 </Link>
 </div>
 </div>
 );
 })}
 </div>
 ) : (
 <div className="text-center py-12">
 <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--tn-chip)' }}>
 <Target className="w-8 h-8 text-muted-foreground dark:text-muted-foreground" />
 </div>
 <h3 className="text-lg font-medium text-foreground dark:text-muted-foreground/60 mb-2">No child items yet</h3>
 <p className="text-muted-foreground dark:text-muted-foreground mb-4">
 {viewFilter === 'todos' ? 'No recurring todos found. Open a task and add + Todo.' :
 viewFilter === 'subtasks' ? 'No one-off subtasks found. Open a task and add + Subtask.' :
 'This board shows todos and subtasks inside tasks, not the parent task cards themselves.'}
 </p>
 <Link href="/goal" className="btn btn-primary inline-flex items-center gap-2">
 <Plus className="w-4 h-4" />
 Open goals to add items
 </Link>
 </div>
 );
 })()}
 </div>
 
 </div>
 );
};

export default withAuth(TodosPage);
