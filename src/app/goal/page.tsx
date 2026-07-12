'use client';

import React, { useState, useEffect } from 'react';
import { withAuth } from '@/hoc/withAuth';
import { GoalItem as Goal, StatusType, PriorityType } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import dynamic from 'next/dynamic';
const GoalForm = dynamic(() => import('@/components/dashboard/GoalForm').then(m => m.GoalForm), { ssr: false });
import { goalsApi, trashApi } from '@/lib/api';
import { priorityWeight } from '@/lib/sort';
import { toast } from '@/store/useToast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { GridSkeleton } from '@/components/ui/Skeletons';
import { usePersistentState } from '@/lib/usePersistentState';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { DropPlacement, moveIdRelative } from '@/lib/reorder';
import Link from 'next/link';
import { GripVertical, Plus, Target, Calendar, Filter } from 'lucide-react';

const GoalsPage: React.FC = () => {
 const [isCreatingGoal, setIsCreatingGoal] = useState(false);
 const [filterStatus, setFilterStatus] = usePersistentState<StatusType | 'all'>('goal:filter', 'all');
 const [sortBy, setSortBy] = usePersistentState<'custom' | 'title' | 'priority' | 'due'>('goal:sort', 'custom');
 const [isDeleting, setIsDeleting] = useState(false);
 const [search, setSearch] = useState('');
 const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
 const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
 const [showArchive, setShowArchive] = usePersistentState<boolean>('goal:showArchive', false);
 const [draggingGoalId, setDraggingGoalId] = useState<string | null>(null);
 const [dropTargetGoalId, setDropTargetGoalId] = useState<string | null>(null);
 const [dropTargetGoalPlacement, setDropTargetGoalPlacement] = useState<DropPlacement>('before');
 useDocumentTitle('Goals');

 const goals = useStore((s) => s.goals);
 const isLoadingGoals = useStore((s) => s.isLoadingGoals);
 const goalsError = useStore((s) => s.goalsError);
 const { fetchGoals, addGoal, deleteGoal: deleteGoalFromStore, updateGoal, reorderGoals } = useStore(
 useShallow((s) => ({
 fetchGoals: s.fetchGoals,
 addGoal: s.addGoal,
 deleteGoal: s.deleteGoal,
 updateGoal: s.updateGoal,
 reorderGoals: s.reorderGoals,
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

 const softDeleteGoal = async (id: string) => {
 const goal = goals.find((g) => g.id === id);
 if (!goal) return;
 deleteGoalFromStore(id);
 try {
 await goalsApi.delete(id);
 } catch (err) {
 console.error('Soft-delete failed:', err);
 addGoal(goal);
 toast.error('Failed to delete goal — restored');
 return;
 }
 toast.withAction(
 'info',
 `"${goal.title}" deleted`,
 {
 label: 'Undo',
 run: async () => {
 try {
 await trashApi.restore('goal', id);
 addGoal(goal);
 } catch (err) {
 console.error('Goal restore failed:', err);
 toast.error('Failed to restore goal');
 }
 },
 },
 { ttlMs: 5000 }
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
 return 'status-finished';
 case StatusType.IN_PROGRESS:
 return 'status-in-progress';
 case StatusType.OUTSTANDING:
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
 const customOrderedGoals = goals
 .map((goal, index) => ({ goal, index }))
 .sort((a, b) => {
 const aPosition = a.goal.position ?? a.index + 1;
 const bPosition = b.goal.position ?? b.index + 1;
 return aPosition - bPosition || a.index - b.index;
 });
 const customOrderedIds = customOrderedGoals.map(({ goal }) => goal.id);
 const previewOrderedIds =
 sortBy === 'custom' && draggingGoalId && dropTargetGoalId
 ? moveIdRelative(customOrderedIds, draggingGoalId, dropTargetGoalId, dropTargetGoalPlacement)
 : customOrderedIds;

 const sortedGoals = [...filteredGoals].sort((a, b) => {
 switch (sortBy) {
 case 'custom':
 return previewOrderedIds.indexOf(a.id) - previewOrderedIds.indexOf(b.id);
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

 const persistGoalOrder = async (targetGoalId: string, placement: DropPlacement) => {
 if (!draggingGoalId || draggingGoalId === targetGoalId) return;
 const previousOrder = customOrderedIds;
 const nextOrder = moveIdRelative(previousOrder, draggingGoalId, targetGoalId, placement);
 if (nextOrder === previousOrder) return;
 reorderGoals(nextOrder);
 try {
 await goalsApi.reorder(nextOrder);
 } catch (error) {
 console.error('Failed to persist goal order:', error);
 reorderGoals(previousOrder);
 toast.error('Failed to save goal order');
 }
 };

 if (isLoadingGoals && goals.length === 0) {
 return (
 <div className="min-h-screen" style={{ background: 'var(--tn-bg)' }}>
 <main className="container mx-auto px-6 py-8">
 <GridSkeleton count={6} />
 </main>
 </div>
 );
 }

 return (
 <div className="page">
 {/* Page Header — themed via --tn-* tokens (responds to active theme) */}
 <div className="page-head page-head-row">
 <div>
 <div className="page-eyebrow">Workspace</div>
 <h1 className="page-title">Goals</h1>
 <p className="page-lede">Manage and track your long-term objectives.</p>
 </div>
 
 <div className="page-head-actions">
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
 className="btn btn-danger"
 >
 Delete selected
 </button>
 </>
 )}
 <button
 onClick={() => setIsCreatingGoal(true)}
 className="btn btn-primary page-cta"
 >
 <Plus className="w-4 h-4" />
 <span>Create Goal</span>
 </button>
 </div>
 </div>

 {/* Filters and Sort */}
 <div className="filter-toolbar no-print">
 <input
 type="search"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Search by title or description..."
 aria-label="Search goals"
 className="filter-input"
 />
 <div className="filter-actions">
 <Filter className="w-4 h-4 filter-icon" />
 <select
 value={filterStatus}
 onChange={(e) => setFilterStatus(e.target.value as StatusType | 'all')}
 className="filter-select"
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
 className="filter-select"
 >
 <option value="custom">Custom order</option>
 <option value="title">Sort by Title</option>
 <option value="priority">Sort by Priority</option>
 <option value="due">Sort by Due Date</option>
 </select>

 {archivedCount > 0 && (
 <>
 <button
 onClick={() => setShowArchive(!showArchive)}
 className="btn btn-secondary"
 style={showArchive ? {
 borderColor: 'var(--tn-accent)',
 background: 'color-mix(in srgb, var(--tn-accent) 12%, var(--tn-card))',
 color: 'var(--tn-accent)',
 } : undefined}
 >
 {showArchive ? 'Hide archived' : `Show archived (${archivedCount})`}
 </button>
 <Link
 href="/goal/archive"
 className="btn btn-secondary"
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
 const canDrag = sortBy === 'custom';
 const isDragging = draggingGoalId === goal.id;
 const isDropTarget = dropTargetGoalId === goal.id && draggingGoalId && draggingGoalId !== goal.id;
 const showDropMarker = isDragging && !!dropTargetGoalId && dropTargetGoalId !== goal.id;
 return (
 <div key={goal.id} className="min-w-0">
 {showDropMarker && (
 <div className="mb-2 flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--tn-accent)' }}>
 <span className="h-px flex-1 border-t-2 border-dashed" style={{ borderColor: 'var(--tn-accent)' }} />
 <span>Drop here</span>
 <span className="h-px flex-1 border-t-2 border-dashed" style={{ borderColor: 'var(--tn-accent)' }} />
 </div>
 )}
 <div
 draggable={canDrag}
 onDragStart={(e) => {
 if (!canDrag) return;
 e.dataTransfer.effectAllowed = 'move';
 e.dataTransfer.setData('application/x-tasknest-goal-id', goal.id);
 setDraggingGoalId(goal.id);
 }}
 onDragEnd={() => {
 setDraggingGoalId(null);
 setDropTargetGoalId(null);
 }}
 onDragOver={(e) => {
 if (!canDrag || !draggingGoalId || draggingGoalId === goal.id) return;
 e.preventDefault();
 const rect = e.currentTarget.getBoundingClientRect();
 const placement: DropPlacement = e.clientY > rect.top + rect.height / 2 ? 'after' : 'before';
 e.dataTransfer.dropEffect = 'move';
 setDropTargetGoalId(goal.id);
 setDropTargetGoalPlacement(placement);
 }}
 onDrop={async (e) => {
 if (!canDrag) return;
 e.preventDefault();
 await persistGoalOrder(goal.id, dropTargetGoalPlacement);
 setDraggingGoalId(null);
 setDropTargetGoalId(null);
 }}
 className={`relative bg-card dark:bg-card rounded-lg border p-6 hover:shadow-md transition-shadow ${
 canDrag ? 'cursor-grab active:cursor-grabbing' : ''
 }`}
 style={{
 borderColor: isDropTarget || isSelected ? 'var(--tn-accent)' : undefined,
 boxShadow: isDropTarget
 ? '0 0 0 3px color-mix(in srgb, var(--tn-accent) 24%, transparent)'
 : isSelected
 ? '0 0 0 2px color-mix(in srgb, var(--tn-accent) 22%, transparent)'
 : undefined,
 opacity: isDragging ? 0.55 : 1,
 }}
 >
 {canDrag && (
 <button
 type="button"
 draggable={false}
 className="absolute left-3 top-4 rounded p-1 pointer-events-none"
 title="Drag to reorder"
 aria-label={`Drag ${goal.title} to reorder`}
 >
 <GripVertical
 className="h-4 w-4"
 style={{ color: 'var(--tn-fg-muted)' }}
 aria-hidden="true"
 />
 </button>
 )}
 <input
 type="checkbox"
 checked={isSelected}
 onChange={() => toggleSelected(goal.id)}
 draggable={false}
 onMouseDown={(e) => e.stopPropagation()}
 aria-label={`Select goal ${goal.title}`}
 className="absolute top-4 right-4 h-4 w-4 rounded border-border"
 style={{ accentColor: 'var(--tn-accent)' }}
 />
 <Link
 href={`/goal/${goal.id}`}
 draggable={false}
 className="block"
 style={{ paddingLeft: canDrag ? 14 : 0 }}
 >
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
 <span className={`pill ${getStatusColor(goal.status)}`}>
 {goal.status}
 </span>
 <span className={`pill ${getPriorityColor(goal.priority)}`}>
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
 draggable={false}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => {
 e.preventDefault();
 softDeleteGoal(goal.id);
 }}
 className="btn btn-danger-ghost text-xs"
 >
 Delete
 </button>
 </div>
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
