'use client';

import React, { useState, useEffect } from 'react';
import { withAuth } from '@/hoc/withAuth';
import { TaskItem as Task, StatusType, PriorityType } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { priorityWeight } from '@/lib/sort';
import { tasksApi } from '@/lib/api';
import { toast } from '@/store/useToast';
import { usePersistentState } from '@/lib/usePersistentState';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { stripMarkdown } from '@/lib/utils';
import Link from 'next/link';
import { CheckSquare, CheckCircle2, Circle, Filter, Calendar, Target, Flag } from 'lucide-react';

const TasksPage: React.FC = () => {
 const [filterStatus, setFilterStatus] = usePersistentState<StatusType | 'all'>('task:filter', 'all');
 const [sortBy, setSortBy] = usePersistentState<'title' | 'priority' | 'due'>('task:sort', 'title');
 const [search, setSearch] = useState('');
 const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
 const [isBulkBusy, setIsBulkBusy] = useState(false);
 useDocumentTitle('Tasks');

 const goals = useStore((s) => s.goals);
 const tasks = useStore((s) => s.tasks);
 const isLoadingGoals = useStore((s) => s.isLoadingGoals);
 const isLoadingTasks = useStore((s) => s.isLoadingTasks);
 const { fetchGoals, fetchTasks, updateTaskInGoals } = useStore(
 useShallow((s) => ({
 fetchGoals: s.fetchGoals,
 fetchTasks: s.fetchTasks,
 updateTaskInGoals: s.updateTaskInGoals,
 }))
 );

 const toggleSelected = (id: string) => {
 setSelectedIds((prev) => {
 const next = new Set(prev);
 if (next.has(id)) next.delete(id);
 else next.add(id);
 return next;
 });
 };

 const performBulkComplete = async () => {
 if (selectedIds.size === 0) return;
 setIsBulkBusy(true);
 const ids = Array.from(selectedIds);
 const stamp = new Date().toISOString();
 const results = await Promise.allSettled(
 ids.map((id) => tasksApi.update({ id, status: StatusType.FINISHED, end_datetime: stamp }))
 );
 let succeeded = 0;
 let failed = 0;
 results.forEach((res, i) => {
 if (res.status === 'fulfilled') {
 const existing = tasks.find((t) => t.id === ids[i]);
 updateTaskInGoals({
 ...res.value,
 end_datetime: res.value.end_datetime ?? stamp,
 subtasks: existing?.subtasks ?? res.value.subtasks ?? [],
 todos: existing?.todos ?? res.value.todos ?? [],
 });
 succeeded += 1;
 } else {
 console.error(`Failed to complete task ${ids[i]}:`, res.reason);
 failed += 1;
 }
 });
 setIsBulkBusy(false);
 setSelectedIds(new Set());
 if (succeeded > 0) toast.success(`Completed ${succeeded} task${succeeded === 1 ? '' : 's'}`);
 if (failed > 0) toast.error(`Failed to complete ${failed} task${failed === 1 ? '' : 's'}`);
 };

 const handleToggleDone = async (task: Task) => {
 const newStatus = task.status === StatusType.FINISHED ? StatusType.OUTSTANDING : StatusType.FINISHED;
 const localStamp = newStatus === StatusType.FINISHED ? new Date().toISOString() : undefined;
 try {
 const updated = await tasksApi.update({
 id: task.id,
 status: newStatus,
 ...(localStamp ? { end_datetime: localStamp } : {}),
 });
 // Preserve the timestamp client-side: if the server response strips
 // it, Activity stats would silently lose this completion.
 updateTaskInGoals({
 ...updated,
 end_datetime: updated.end_datetime ?? localStamp,
 subtasks: task.subtasks ?? updated.subtasks ?? [],
 todos: task.todos ?? updated.todos ?? [],
 });
 } catch (err) {
 console.error('Failed to toggle task:', err);
 toast.error('Failed to update task');
 }
 };

 useEffect(() => {
 fetchGoals();
 fetchTasks();
 }, [fetchGoals, fetchTasks]);

 const getStatusColor = (status: StatusType) => {
 switch (status) {
 case StatusType.FINISHED:
 return 'bg-green-100 text-green-800 border-green-200';
 case StatusType.IN_PROGRESS:
 return 'bg-blue-100 text-blue-800 border-blue-200';
 case StatusType.OUTSTANDING:
 return 'bg-amber-100 text-amber-800 border-amber-200';
 default:
 return 'bg-muted text-foreground border-border';
 }
 };

 const getPriorityColor = (priority: PriorityType) => {
 switch (priority) {
 case PriorityType.HIGH:
 return 'bg-red-100 text-red-800 border-red-200';
 case PriorityType.MEDIUM:
 return 'bg-yellow-100 text-yellow-800 border-yellow-200';
 case PriorityType.LOW:
 return 'bg-green-100 text-green-800 border-green-200';
 default:
 return 'bg-muted text-foreground border-border';
 }
 };

 // Get all tasks from goals/milestones and also from the tasks store
 const allTasks: (Task & { goalTitle?: string; milestoneTitle?: string })[] = [];
 
 // Add tasks from goals structure
 goals.forEach(goal => {
 goal.milestones?.forEach(milestone => {
 milestone.tasks?.forEach(task => {
 allTasks.push({
 ...task,
 goalTitle: goal.title,
 milestoneTitle: milestone.title
 });
 });
 });
 });

 // Add tasks from direct tasks store (these might not be in goals)
 tasks.forEach(task => {
 // Only add if not already in allTasks
 if (!allTasks.find(t => t.id === task.id)) {
 allTasks.push(task);
 }
 });

 const searchLower = search.trim().toLowerCase();
 const filteredTasks = allTasks.filter((task) => {
 if (filterStatus !== 'all' && task.status !== filterStatus) return false;
 if (!searchLower) return true;
 return (
 task.title.toLowerCase().includes(searchLower) ||
 (task.description ?? '').toLowerCase().includes(searchLower)
 );
 });

 const sortedTasks = [...filteredTasks].sort((a, b) => {
 switch (sortBy) {
 case 'title':
 return a.title.localeCompare(b.title);
 case 'priority':
 return priorityWeight(b.priority) - priorityWeight(a.priority);
 case 'due':
 return new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime();
 default:
 return 0;
 }
 });

 if (isLoadingGoals || isLoadingTasks) {
 return (
 <div className="min-h-screen bg-muted dark:bg-card">
 <div className="flex items-center justify-center h-64">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
 </div>
 </div>
 );
 }

 return (
 <div className="page">
 {/* Page Header */}
 <div className="flex items-center justify-between mb-8">
 <div>
 <h1 className="page-title">Tasks</h1>
 <p className="page-lede">Manage all your tasks across goals and milestones.</p>
 </div>
 {selectedIds.size > 0 && (
 <div className="flex items-center space-x-2">
 <span className="text-sm text-foreground dark:text-muted-foreground/60">
 {selectedIds.size} selected
 </span>
 <button
 onClick={() => setSelectedIds(new Set())}
 className="px-3 py-2 text-sm text-foreground dark:text-muted-foreground/60 bg-muted dark:bg-card rounded-lg hover:bg-muted dark:hover:bg-muted"
 >
 Clear
 </button>
 <button
 onClick={performBulkComplete}
 disabled={isBulkBusy}
 className="btn btn-primary"
 >
 Mark done
 </button>
 </div>
 )}
 </div>

 {/* Filters and Sort */}
 <div className="sticky top-16 z-20 -mx-6 px-6 py-3 mb-6 bg-muted/90 dark:bg-card/90 backdrop-blur border-b border-border dark:border-border flex flex-wrap items-center gap-3 no-print">
 <input
 type="search"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Search by title or description..."
 aria-label="Search tasks"
 className="flex-1 min-w-[200px] px-3 py-2 border border-border dark:border-border bg-card dark:bg-card text-foreground rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 <div className="flex items-center space-x-2">
 <Filter className="w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
 <select
 value={filterStatus}
 onChange={(e) => setFilterStatus(e.target.value as StatusType | 'all')}
 className="px-3 py-2 border border-border dark:border-border bg-card dark:bg-card text-foreground rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 >
 <option value="all">All Status</option>
 <option value={StatusType.OUTSTANDING}>Outstanding</option>
 <option value={StatusType.IN_PROGRESS}>In Progress</option>
 <option value={StatusType.FINISHED}>Finished</option>
 </select>
 </div>

 <select
 value={sortBy}
 onChange={(e) => setSortBy(e.target.value as any)}
 className="px-3 py-2 border border-border dark:border-border bg-card dark:bg-card text-foreground rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 >
 <option value="title">Sort by Title</option>
 <option value="priority">Sort by Priority</option>
 <option value="due">Sort by Due Date</option>
 </select>
 </div>

 {/* Tasks Grid */}
 {sortedTasks.length === 0 ? (
 <div className="text-center py-16">
 <CheckSquare className="w-16 h-16 mx-auto text-muted-foreground/60 dark:text-foreground mb-4" />
 <h3 className="text-xl font-medium text-foreground mb-2">
 {search || filterStatus !== 'all' ? 'No matching tasks' : 'No tasks yet'}
 </h3>
 <p className="text-foreground dark:text-muted-foreground mb-6">
 {search || filterStatus !== 'all'
 ? 'Try clearing the filters to see all tasks.'
 : 'Tasks live inside milestones. Open a goal to add tasks under one of its milestones.'}
 </p>
 {goals.length === 0 && (
 <Link
 href="/goal"
 className="btn btn-primary"
 >
 Create your first goal
 </Link>
 )}
 {goals.length > 0 && (
 <Link
 href="/goal"
 className="inline-block px-4 py-2 rounded-lg bg-card dark:bg-card text-white hover:bg-card dark:hover:bg-muted transition-colors"
 >
 Open goals
 </Link>
 )}
 </div>
 ) : (
 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
 {sortedTasks.map((task) => {
 const isDone = task.status === StatusType.FINISHED;
 const isSelected = selectedIds.has(task.id);
 return (
 <div
 key={task.id}
 className={`relative bg-card dark:bg-card rounded-lg border p-6 hover:shadow-md transition-shadow ${
 isSelected
 ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900'
 : 'border-border dark:border-border'
 }`}
 >
 <input
 type="checkbox"
 checked={isSelected}
 onChange={() => toggleSelected(task.id)}
 aria-label={`Select task ${task.title}`}
 className="absolute top-4 right-4 h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500"
 />
 <div className="flex items-start mb-4 pr-8">
 <button
 onClick={() => handleToggleDone(task)}
 aria-label={isDone ? 'Mark as outstanding' : 'Mark as finished'}
 className="mt-1 mr-3 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
 >
 {isDone ? (
 <CheckCircle2 className="w-5 h-5 text-green-500" />
 ) : (
 <Circle className="w-5 h-5 text-muted-foreground hover:text-foreground" />
 )}
 </button>
 <Link href={`/task/${task.id}`} className="flex-1 min-w-0">
 <h3 className={`text-lg font-semibold mb-2 ${isDone ? 'line-through text-muted-foreground dark:text-muted-foreground' : 'text-foreground'}`}>
 {task.title}
 </h3>
 {task.description && (
 <p className={`text-sm mb-3 line-clamp-2 ${isDone ? 'text-muted-foreground dark:text-muted-foreground' : 'text-foreground dark:text-muted-foreground'}`}>
 {stripMarkdown(task.description)}
 </p>
 )}
 </Link>
 </div>

 {/* Parent Goal and Milestone */}
 <div className="space-y-1 mb-3">
 {task.goalTitle && (
 <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
 <Target className="w-3 h-3 mr-1" />
 <span>{task.goalTitle}</span>
 </div>
 )}
 {task.milestoneTitle && (
 <div className="flex items-center text-xs text-purple-600 dark:text-purple-400">
 <Flag className="w-3 h-3 mr-1" />
 <span>{task.milestoneTitle}</span>
 </div>
 )}
 </div>

 <div className="flex items-center space-x-2 mb-4">
 <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(task.status)}`}>
 {task.status}
 </span>
 <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(task.priority)}`}>
 {task.priority}
 </span>
 </div>

 {task.due_date && (
 <div className="flex items-center text-xs text-muted-foreground dark:text-muted-foreground mb-4">
 <Calendar className="w-3 h-3 mr-1" />
 <span>Due {new Date(task.due_date).toLocaleDateString()}</span>
 </div>
 )}

 <div className="flex items-center justify-between text-sm text-muted-foreground dark:text-muted-foreground">
 <div className="space-x-3">
 <span>{task.subtasks?.length || 0} subtasks</span>
 <span>{task.todos?.length || 0} todos</span>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}
 
 </div>
 );
};

export default withAuth(TasksPage);
