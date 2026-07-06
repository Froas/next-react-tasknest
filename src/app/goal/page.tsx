'use client';

import React, { useState, useEffect } from 'react';
import { withAuth } from '@/hoc/withAuth';
import { GoalItem as Goal, StatusType, PriorityType } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import dynamic from 'next/dynamic';
const GoalForm = dynamic(() => import('@/components/dashboard/GoalForm').then(m => m.GoalForm), { ssr: false });
import { goalsApi } from '@/lib/api';
import { priorityWeight } from '@/lib/sort';
import { toast } from '@/store/useToast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { GridSkeleton } from '@/components/ui/Skeletons';
import { usePersistentState } from '@/lib/usePersistentState';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import Link from 'next/link';
import { Plus, Target, Calendar, Filter } from 'lucide-react';

const GoalsPage: React.FC = () => {
 const [isCreatingGoal, setIsCreatingGoal] = useState(false);
 const [filterStatus, setFilterStatus] = usePersistentState<StatusType | 'all'>('goal:filter', 'all');
 const [sortBy, setSortBy] = usePersistentState<'title' | 'priority' | 'due'>('goal:sort', 'title');
 const [isDeleting, setIsDeleting] = useState(false);
 const [search, setSearch] = useState('');
 const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
 const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
 const [showArchive, setShowArchive] = usePersistentState<boolean>('goal:showArchive', false);
 useDocumentTitle('Goals');

 const goals = useStore((s) => s.goals);
 const isLoadingGoals = useStore((s) => s.isLoadingGoals);
 const goalsError = useStore((s) => s.goalsError);
 const { fetchGoals, addGoal, deleteGoal: deleteGoalFromStore, updateGoal } = useStore(
 useShallow((s) => ({
 fetchGoals: s.fetchGoals,
 addGoal: s.addGoal,
 deleteGoal: s.deleteGoal,
 updateGoal: s.updateGoal,
 }))
 );

 useEffect(() => {
 fetchGoals();
 }, [fetchGoals]);

 const handleGoalSubmit = async (goalData: Partial<Goal>) => {
 try {
 const newGoal = await goalsApi.create({
 title: goalData.title!,
 description: goalData.description!,
 status: goalData.status || StatusType.OUTSTANDING,
 priority: goalData.priority || PriorityType.HIGH,
 start_datetime: goalData.start_datetime,
 end_datetime: goalData.end_datetime,
 });
 addGoal(newGoal);
 setIsCreatingGoal(false);
 } catch (error) {
 console.error('Error saving goal:', error);
 toast.error('Failed to save goal');
 }
 };

 // Soft-delete: hide the goal locally for 5s and offer Undo. If the
 // window passes without action we then call the real DELETE. This
 // collapses the previous"open confirm dialog → confirm → delete" into
 // a single click + grace period, which feels far better while still
 // protecting against fat-finger removals.
 const softDeleteGoal = (id: string) => {
 const goal = goals.find((g) => g.id === id);
 if (!goal) return;
 deleteGoalFromStore(id);
 toast.withAction(
 'info',
 `"${goal.title}" deleted`,
 {
 label: 'Undo',
 run: () => addGoal(goal),
 },
 {
 ttlMs: 5000,
 onExpire: async () => {
 try {
 await goalsApi.delete(id);
 } catch (err) {
 console.error('Soft-delete commit failed:', err);
 addGoal(goal);
 toast.error('Failed to delete goal — restored');
 }
 },
 }
 );
 };

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
 setIsDeleting(true);
 const ids = Array.from(selectedIds);
 const stamp = new Date().toISOString();
 const results = await Promise.allSettled(
 ids.map((id) => goalsApi.update({ id, status: StatusType.FINISHED, end_datetime: stamp }))
 );
 let succeeded = 0;
 let failed = 0;
 results.forEach((res, i) => {
 if (res.status === 'fulfilled') {
 // Preserve client-side stamp if backend stripped it from response.
 updateGoal({ ...res.value, end_datetime: res.value.end_datetime ?? stamp });
 succeeded += 1;
 } else {
 console.error(`Failed to complete goal ${ids[i]}:`, res.reason);
 failed += 1;
 }
 });
 setIsDeleting(false);
 setSelectedIds(new Set());
 if (succeeded > 0) toast.success(`Completed ${succeeded} goal${succeeded === 1 ? '' : 's'}`);
 if (failed > 0) toast.error(`Failed to complete ${failed} goal${failed === 1 ? '' : 's'}`);
 };

 const performBulkDelete = async () => {
 if (selectedIds.size === 0) return;
 setIsDeleting(true);
 const ids = Array.from(selectedIds);
 const results = await Promise.allSettled(ids.map((id) => goalsApi.delete(id)));
 let succeeded = 0;
 let failed = 0;
 results.forEach((res, i) => {
 if (res.status === 'fulfilled') {
 deleteGoalFromStore(ids[i]);
 succeeded += 1;
 } else {
 console.error(`Failed to delete goal ${ids[i]}:`, res.reason);
 failed += 1;
 }
 });
 setIsDeleting(false);
 setConfirmBulkDelete(false);
 setSelectedIds(new Set());
 if (succeeded > 0) toast.success(`Deleted ${succeeded} goal${succeeded === 1 ? '' : 's'}`);
 if (failed > 0) toast.error(`Failed to delete ${failed} goal${failed === 1 ? '' : 's'}`);
 };

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

 const searchLower = search.trim().toLowerCase();
 const isArchived = (status: StatusType) =>
 status === StatusType.FINISHED || status === StatusType.CANCELLED;
 const visibleGoals = goals.filter((goal) => {
 // Hide archived (finished/cancelled) by default unless toggled or filter
 // explicitly targets one of those statuses.
 if (!showArchive && filterStatus === 'all' && isArchived(goal.status)) return false;
 if (filterStatus !== 'all' && goal.status !== filterStatus) return false;
 if (!searchLower) return true;
 return (
 goal.title.toLowerCase().includes(searchLower) ||
 (goal.description ?? '').toLowerCase().includes(searchLower)
 );
 });
 const archivedCount = goals.filter((g) => isArchived(g.status)).length;
 const filteredGoals = visibleGoals;

 const sortedGoals = [...filteredGoals].sort((a, b) => {
 switch (sortBy) {
 case 'title':
 return a.title.localeCompare(b.title);
 case 'priority':
 return priorityWeight(b.priority) - priorityWeight(a.priority);
 case 'due':
 return new Date(a.end_datetime || '').getTime() - new Date(b.end_datetime || '').getTime();
 default:
 return 0;
 }
 });

 if (isLoadingGoals && goals.length === 0) {
 return (
 <div className="min-h-screen bg-muted dark:bg-card">
 <main className="container mx-auto px-6 py-8">
 <GridSkeleton count={6} />
 </main>
 </div>
 );
 }

 return (
 <div className="page">
 {/* Page Header — themed via --tn-* tokens (responds to active theme) */}
 <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
 <div>
 <div className="page-eyebrow">Workspace</div>
 <h1 className="page-title">Goals</h1>
 <p className="page-lede">Manage and track your long-term objectives.</p>
 </div>
 
 <div className="flex items-center space-x-2">
 {selectedIds.size > 0 && (
 <>
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
 disabled={isDeleting}
 className="btn btn-primary"
 >
 Mark done
 </button>
 <button
 onClick={() => setConfirmBulkDelete(true)}
 className="btn" style={{background:'var(--tn-bad, #c25d63)', color:'#fff'}}
 >
 Delete selected
 </button>
 </>
 )}
 <button
 onClick={() => setIsCreatingGoal(true)}
 className="btn btn-primary"
 style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
 >
 <Plus className="w-4 h-4" />
 <span>Create Goal</span>
 </button>
 </div>
 </div>

 {/* Filters and Sort */}
 <div className="sticky top-16 z-20 -mx-6 px-6 py-3 mb-6 bg-muted/90 dark:bg-card/90 backdrop-blur border-b border-border dark:border-border flex flex-wrap items-center gap-3 no-print">
 <input
 type="search"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Search by title or description..."
 aria-label="Search goals"
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

 {archivedCount > 0 && (
 <>
 <button
 onClick={() => setShowArchive(!showArchive)}
 className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
 showArchive
 ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
 : 'border-border dark:border-border bg-card dark:bg-card text-foreground dark:text-muted-foreground/60 hover:bg-muted dark:hover:bg-muted'
 }`}
 >
 {showArchive ? 'Hide archived' : `Show archived (${archivedCount})`}
 </button>
 <Link
 href="/goal/archive"
 className="px-3 py-2 text-sm rounded-lg border border-border dark:border-border bg-card dark:bg-card text-foreground dark:text-muted-foreground/60 hover:bg-muted dark:hover:bg-muted"
 >
 Archive →
 </Link>
 </>
 )}
 </div>

 {/* Goals Grid */}
 {sortedGoals.length === 0 ? (
 <div className="card" style={{ textAlign: 'center', padding: 48 }}>
 <Target className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--tn-fg-muted)' }} />
 <h3 style={{ fontSize: 20, fontWeight: 600, color: 'var(--tn-fg)', marginBottom: 8, fontFamily: 'var(--tn-font-display, var(--tn-font-sans))' }}>No goals yet</h3>
 <p style={{ color: 'var(--tn-fg-muted)', marginBottom: 24 }}>Create your first goal to start building your roadmap.</p>
 <button onClick={() => setIsCreatingGoal(true)} className="btn btn-primary">
 Create Your First Goal
 </button>
 </div>
 ) : (
 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
 {sortedGoals.map((goal) => {
 const isSelected = selectedIds.has(goal.id);
 return (
 <div
 key={goal.id}
 className={`relative bg-card dark:bg-card rounded-lg border p-6 hover:shadow-md transition-shadow ${
 isSelected
 ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900'
 : 'border-border dark:border-border'
 }`}
 >
 <input
 type="checkbox"
 checked={isSelected}
 onChange={() => toggleSelected(goal.id)}
 aria-label={`Select goal ${goal.title}`}
 className="absolute top-4 right-4 h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500"
 />
 <Link href={`/goal/${goal.id}`} className="block">
 <div className="flex items-start justify-between mb-4 pr-8">
 <div className="flex-1">
 <h3 className="text-lg font-semibold text-foreground mb-2">
 {goal.title}
 </h3>
 {goal.description && (
 <p className="text-sm text-foreground dark:text-muted-foreground mb-3 line-clamp-2">
 {goal.description}
 </p>
 )}
 </div>
 </div>

 <div className="flex items-center space-x-2 mb-4">
 <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(goal.status)}`}>
 {goal.status}
 </span>
 <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(goal.priority)}`}>
 {goal.priority}
 </span>
 </div>

 {goal.end_datetime && (
 <div className="flex items-center text-xs text-muted-foreground dark:text-muted-foreground mb-4">
 <Calendar className="w-3 h-3 mr-1" />
 <span>Due {new Date(goal.end_datetime).toLocaleDateString()}</span>
 </div>
 )}
 </Link>

 <div className="flex items-center justify-between text-sm text-muted-foreground dark:text-muted-foreground">
 <span>{goal.milestones?.length || 0} milestones</span>
 <button
 onClick={(e) => {
 e.preventDefault();
 softDeleteGoal(goal.id);
 }}
 className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs"
 >
 Delete
 </button>
 </div>
 </div>
 );
 })}
 </div>
 )}

 {/* Create Goal Modal */}
 {isCreatingGoal && (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
 <div className="bg-card dark:bg-card rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
 <h3 className="text-lg font-semibold text-foreground mb-4">Create New Goal</h3>
 <GoalForm
 onSuccess={handleGoalSubmit}
 onCancel={() => setIsCreatingGoal(false)}
 />
 </div>
 </div>
 )}

 <ConfirmDialog
 open={confirmBulkDelete}
 title={`Delete ${selectedIds.size} goal${selectedIds.size === 1 ? '' : 's'}`}
 description="All linked milestones, tasks, and todos under these goals will be removed. This action cannot be undone."
 destructive
 confirmLabel={`Delete ${selectedIds.size}`}
 busy={isDeleting}
 onConfirm={performBulkDelete}
 onCancel={() => !isDeleting && setConfirmBulkDelete(false)}
 />
 </div>
 );
};

export default withAuth(GoalsPage);
