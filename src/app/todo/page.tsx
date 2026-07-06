'use client';

import React, { useState, useEffect } from 'react';
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
import { CheckSquare, CheckCircle2, Circle, List, Target, Plus, Check, Calendar } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

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
 taskTitle?: string;
 goalTitle?: string;
 milestoneTitle?: string;
}

const TodosPage: React.FC = () => {
 const [viewFilter, setViewFilter] = usePersistentState<ViewFilter>('todo:viewFilter', 'all');
 useDocumentTitle('Todos');
 const { theme } = useTheme();

 const goals = useStore((s) => s.goals);
 const tasks = useStore((s) => s.tasks);
 const todos = useStore((s) => s.todos);
 const isLoadingGoals = useStore((s) => s.isLoadingGoals);
 const isLoadingTasks = useStore((s) => s.isLoadingTasks);
 const isLoadingTodos = useStore((s) => s.isLoadingTodos);
 const { fetchGoals, fetchTasks, fetchTodos, setGoals, updateTodoInGoals, updateSubtaskInGoals } = useStore(
 useShallow((s) => ({
 fetchGoals: s.fetchGoals,
 fetchTasks: s.fetchTasks,
 fetchTodos: s.fetchTodos,
 setGoals: s.setGoals,
 updateTodoInGoals: s.updateTodoInGoals,
 updateSubtaskInGoals: s.updateSubtaskInGoals,
 }))
 );

 const completionsMap = useTodoStreaks((s) => s.completions);

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
 if (newStatus === StatusType.FINISHED) {
 useTodoStreaks.getState().recordCompletion(item.id);
 } else {
 useTodoStreaks.getState().removeLastCompletion(item.id);
 }
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

 // Status columns configuration with dark theme support
 const statusColumns = [
 { 
 status: StatusType.OUTSTANDING, 
 title: 'Outstanding', 
 bgColor: 'bg-slate-100 dark:bg-slate-700',
 cardColor: 'bg-slate-50 dark:bg-slate-600 border-slate-200 dark:border-slate-500'
 },
 { 
 status: StatusType.STARTED, 
 title: 'Started', 
 bgColor: 'bg-amber-100 dark:bg-amber-800',
 cardColor: 'bg-amber-50 dark:bg-amber-700 border-amber-200 dark:border-amber-600'
 },
 { 
 status: StatusType.IN_PROGRESS, 
 title: 'In Progress', 
 bgColor: 'bg-blue-100 dark:bg-blue-800',
 cardColor: 'bg-blue-50 dark:bg-blue-700 border-blue-200 dark:border-blue-600'
 },
 { 
 status: StatusType.FINISHED, 
 title: 'Finished', 
 bgColor: 'bg-green-100 dark:bg-green-800',
 cardColor: 'bg-green-50 dark:bg-green-700 border-green-200 dark:border-green-600'
 },
 { 
 status: StatusType.CLOSED, 
 title: 'Closed', 
 bgColor: 'bg-muted dark:bg-card',
 cardColor: 'bg-muted border-border'
 },
 { 
 status: StatusType.ABORTED, 
 title: 'Aborted', 
 bgColor: 'bg-red-100 dark:bg-red-800',
 cardColor: 'bg-red-50 dark:bg-red-700 border-red-200 dark:border-red-600'
 },
 { 
 status: StatusType.CANCELLED, 
 title: 'Cancelled', 
 bgColor: 'bg-red-100 dark:bg-red-800',
 cardColor: 'bg-red-50 dark:bg-red-700 border-red-200 dark:border-red-600'
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
 type: 'todo'
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
 taskTitle: task.title
 });
 }
 });
 }
 });

 return allItems;
 };

 const allItems = getAllItems();

 const getItemsForStatus = (status: StatusType) => {
 return allItems.filter(item => item.status === status);
 };

 if (isLoadingGoals || isLoadingTasks || isLoadingTodos) {
 return (
 <div className="min-h-screen bg-muted dark:bg-card flex items-center justify-center">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
 </div>
 );
 }

 return (
 <div className="page">
 <div className="mb-6">
 <StreakHeatmap />
 </div>
 {/* Page Header */}
 <div className="flex items-center justify-between mb-8">
 <div>
 <h1 className="page-title">Subtask & Todo Board</h1>
 <p className="page-lede">Recurring todos and one-off subtasks across all tasks.</p>
 </div>
 
 {/* Navigation Filters */}
 <div className="flex items-center space-x-4 bg-card dark:bg-card border border-border dark:border-border rounded-lg p-1">
 <button
 onClick={() => setViewFilter('all')}
 className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
 viewFilter === 'all' 
 ? 'btn-primary text-on-accent' 
 : 'text-foreground dark:text-muted-foreground/60 hover:text-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-card'
 }`}
 >
 <List className="w-4 h-4" />
 <span>All</span>
 </button>
 <button
 onClick={() => setViewFilter('todos')}
 className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
 viewFilter === 'todos' 
 ? 'btn-primary text-on-accent' 
 : 'text-foreground dark:text-muted-foreground/60 hover:text-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-card'
 }`}
 >
 <Target className="w-4 h-4" />
 <span>Todos</span>
 </button>
 <button
 onClick={() => setViewFilter('subtasks')}
 className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
 viewFilter === 'subtasks' 
 ? 'btn-primary text-on-accent' 
 : 'text-foreground dark:text-muted-foreground/60 hover:text-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-card'
 }`}
 >
 <CheckSquare className="w-4 h-4" />
 <span>Subtasks</span>
 </button>
 </div>
 </div>

 {/* Kanban Board */}
 <div className="bg-card dark:bg-card border border-border dark:border-border rounded-2xl p-6">
 {(() => {
 // Only show columns that have items
 const visibleColumns = statusColumns.filter(column => {
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
 className="md:flex-shrink-0 w-full md:w-80 rounded-xl shadow-lg overflow-hidden bg-card dark:bg-card border border-border dark:border-border"
 >
 {/* Column Header */}
 <div className={`${column.bgColor} p-4 border-b border-border dark:border-border`}>
 <div className="flex items-center justify-between mb-2">
 <h3 className="font-semibold text-foreground">{column.title}</h3>
 <span className="bg-muted dark:bg-card text-foreground dark:text-muted-foreground/60 text-xs px-2 py-1 rounded-full">
 {columnItems.length}
 </span>
 </div>
 </div>

 {/* Column Content */}
 <div className="p-4 space-y-3 flex-1 max-h-[calc(100vh-16rem)] overflow-y-auto">
 {columnItems.map((item) => (
 <div
 key={`${item.type}-${item.id}`}
 className={`${column.cardColor} rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow border`}
 >
 {/* Item Header */}
 <div className="flex items-start mb-3">
 <button
 onClick={() => handleToggle(item)}
 aria-label={item.status === StatusType.FINISHED ? 'Mark as outstanding' : 'Mark as finished'}
 className="mt-1 mr-2 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
 >
 {item.status === StatusType.FINISHED ? (
 <CheckCircle2 className="w-5 h-5 text-green-600" />
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
 <div className="flex items-center text-xs text-foreground dark:text-muted-foreground mb-2 bg-muted rounded px-2 py-1">
 <CheckSquare className="w-3 h-3 mr-1" />
 <span className="truncate">{item.taskTitle}</span>
 </div>
 )}

 {/* Additional Info */}
 <div className="flex items-center justify-between text-xs">
 <div className="flex items-center space-x-2">
 <span className={`px-2 py-1 rounded-full text-white ${
 item.type === 'todo' ? 'bg-green-500' : 'bg-purple-500'
 }`}>
 {item.type === 'subtask' ? 'Subtask' : 'Todo'}
 </span>
 {item.type === 'todo' && (() => {
 const streak = getStreak(completionsMap[item.id] ?? []);
 if (streak < 2) return null;
 return (
 <span
 className="px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300"
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
 ))}

 {/* Add New Button */}
 <button className="w-full p-3 border-2 border-dashed border-border rounded-lg text-foreground dark:text-muted-foreground hover:border-border dark:hover:border-border hover:text-foreground dark:hover:text-muted-foreground/60 transition-colors flex items-center justify-center space-x-2">
 <Plus className="w-4 h-4" />
 <span className="text-sm">New Item</span>
 </button>
 </div>
 </div>
 );
 })}
 </div>
 ) : (
 <div className="text-center py-12">
 <div className="w-16 h-16 bg-muted dark:bg-card rounded-full flex items-center justify-center mx-auto mb-4">
 <Target className="w-8 h-8 text-muted-foreground dark:text-muted-foreground" />
 </div>
 <h3 className="text-lg font-medium text-foreground dark:text-muted-foreground/60 mb-2">No items to display</h3>
 <p className="text-muted-foreground dark:text-muted-foreground mb-4">
 {viewFilter === 'todos' ? 'No todos found' : 
 viewFilter === 'subtasks' ? 'No subtasks found' : 
 'No subtasks or todos found'}
 </p>
 </div>
 );
 })()}
 </div>
 
 </div>
 );
};

export default withAuth(TodosPage);
