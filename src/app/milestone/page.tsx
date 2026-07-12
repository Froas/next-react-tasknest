'use client';

import React, { useState, useEffect } from 'react';
import { withAuth } from '@/hoc/withAuth';
import { MilestoneItem as Milestone, StatusType, PriorityType } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { MilestoneForm } from '@/components/dashboard/MilestoneForm';
import { milestonesApi, trashApi } from '@/lib/api';
import { priorityWeight } from '@/lib/sort';
import { toast } from '@/store/useToast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { GridSkeleton } from '@/components/ui/Skeletons';
import { usePersistentState } from '@/lib/usePersistentState';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { DropPlacement, moveIdRelative } from '@/lib/reorder';
import { stripMarkdown } from '@/lib/utils';
import Link from 'next/link';
import { Plus, Flag, Calendar, Filter, Target, GripVertical } from 'lucide-react';

type MilestoneSort = 'custom' | 'title' | 'priority' | 'due';

const MilestonesPage: React.FC = () => {
 const [isCreatingMilestone, setIsCreatingMilestone] = useState(false);
 const [filterStatus, setFilterStatus] = usePersistentState<StatusType | 'all'>('milestone:filter', 'all');
 const [sortBy, setSortBy] = usePersistentState<MilestoneSort>('milestone:sort', 'custom');
 const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
 const [isDeleting, setIsDeleting] = useState(false);
 const [search, setSearch] = useState('');
 useDocumentTitle('Milestones');
 const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
 const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
 const [draggingMilestoneId, setDraggingMilestoneId] = useState<string | null>(null);
 const [dropTargetMilestoneId, setDropTargetMilestoneId] = useState<string | null>(null);
 const [dropTargetMilestonePlacement, setDropTargetMilestonePlacement] = useState<DropPlacement>('before');

 const goals = useStore((s) => s.goals);
 const milestones = useStore((s) => s.milestones);
 const tasks = useStore((s) => s.tasks);
 const isLoadingMilestones = useStore((s) => s.isLoadingMilestones);
 const milestonesError = useStore((s) => s.milestonesError);
 const {
 fetchMilestones,
 fetchTasks,
 addMilestone,
 addMilestoneToGoal,
 deleteMilestoneFromGoals,
 fetchGoals,
 updateMilestoneInGoals,
 reorderMilestonesInGoal,
 } = useStore(
 useShallow((s) => ({
 fetchMilestones: s.fetchMilestones,
 fetchTasks: s.fetchTasks,
 addMilestone: s.addMilestone,
 addMilestoneToGoal: s.addMilestoneToGoal,
 deleteMilestoneFromGoals: s.deleteMilestoneFromGoals,
 fetchGoals: s.fetchGoals,
 updateMilestoneInGoals: s.updateMilestoneInGoals,
 reorderMilestonesInGoal: s.reorderMilestonesInGoal,
 }))
 );

 useEffect(() => {
 fetchMilestones();
 fetchTasks();
 fetchGoals();
 }, [fetchMilestones, fetchTasks, fetchGoals]);

 const handleMilestoneSubmit = async (milestoneData: Partial<Milestone>) => {
 try {
 const newMilestone = await milestonesApi.create({
 title: milestoneData.title!,
 description: milestoneData.description!,
 status: milestoneData.status || StatusType.OUTSTANDING,
 priority: milestoneData.priority || PriorityType.MEDIUM,
 due_date: milestoneData.due_date,
 end_datetime: milestoneData.end_datetime,
 goal_id: milestoneData.goal_id,
 });
 addMilestone(newMilestone);
 if (newMilestone.goal_id) {
 addMilestoneToGoal(newMilestone, newMilestone.goal_id);
 }
 setIsCreatingMilestone(false);
 } catch (error) {
 console.error('Error saving milestone:', error);
 toast.error('Failed to save milestone');
 }
 };

 const softDeleteMilestone = async (id: string) => {
 const milestone = milestones.find((m) => m.id === id);
 if (!milestone) return;
 deleteMilestoneFromGoals(id);
 try {
 await milestonesApi.delete(id);
 } catch (err) {
 console.error('Soft-delete failed:', err);
 addMilestone(milestone);
 if (milestone.goal_id) addMilestoneToGoal(milestone, milestone.goal_id);
 toast.error('Failed to delete milestone — restored');
 return;
 }
 toast.withAction(
 'info',
 `"${milestone.title}" deleted`,
 {
 label: 'Undo',
 run: async () => {
 try {
 await trashApi.restore('milestone', id);
 addMilestone(milestone);
 if (milestone.goal_id) addMilestoneToGoal(milestone, milestone.goal_id);
 } catch (err) {
 console.error('Milestone restore failed:', err);
 toast.error('Failed to restore milestone');
 }
 },
 },
 { ttlMs: 5000 }
 );
 };

 const performDelete = async () => {
 if (!confirmDeleteId) return;
 setIsDeleting(true);
 try {
 await milestonesApi.delete(confirmDeleteId);
 deleteMilestoneFromGoals(confirmDeleteId);
 toast.success('Milestone deleted');
 setConfirmDeleteId(null);
 } catch (error) {
 console.error('Error deleting milestone:', error);
 toast.error('Failed to delete milestone');
 } finally {
 setIsDeleting(false);
 }
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
 ids.map((id) => milestonesApi.update({ id, status: StatusType.FINISHED, end_datetime: stamp }))
 );
 let succeeded = 0;
 let failed = 0;
 results.forEach((res, i) => {
 if (res.status === 'fulfilled') {
 updateMilestoneInGoals({ ...res.value, end_datetime: res.value.end_datetime ?? stamp });
 succeeded += 1;
 } else {
 console.error(`Failed to complete milestone ${ids[i]}:`, res.reason);
 failed += 1;
 }
 });
 setIsDeleting(false);
 setSelectedIds(new Set());
 if (succeeded > 0) toast.success(`Completed ${succeeded} milestone${succeeded === 1 ? '' : 's'}`);
 if (failed > 0) toast.error(`Failed to complete ${failed} milestone${failed === 1 ? '' : 's'}`);
 };

 const performBulkDelete = async () => {
 if (selectedIds.size === 0) return;
 setIsDeleting(true);
 const ids = Array.from(selectedIds);
 const results = await Promise.allSettled(ids.map((id) => milestonesApi.delete(id)));
 let succeeded = 0;
 let failed = 0;
 results.forEach((res, i) => {
 if (res.status === 'fulfilled') {
 deleteMilestoneFromGoals(ids[i]);
 succeeded += 1;
 } else {
 console.error(`Failed to delete milestone ${ids[i]}:`, res.reason);
 failed += 1;
 }
 });
 setIsDeleting(false);
 setConfirmBulkDelete(false);
 setSelectedIds(new Set());
 if (succeeded > 0) toast.success(`Deleted ${succeeded} milestone${succeeded === 1 ? '' : 's'}`);
 if (failed > 0) toast.error(`Failed to delete ${failed} milestone${failed === 1 ? '' : 's'}`);
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
 const filteredMilestones = milestones.filter((milestone) => {
 if (filterStatus !== 'all' && milestone.status !== filterStatus) return false;
 if (!searchLower) return true;
 return (
 milestone.title.toLowerCase().includes(searchLower) ||
 (milestone.description ?? '').toLowerCase().includes(searchLower)
 );
 });

 const goalOrder = new Map(goals.map((goal, index) => [goal.id, index]));
 const customOrderedMilestoneIds = milestones
 .map((milestone, index) => ({ milestone, index }))
 .sort((a, b) => {
 const aGoalOrder = a.milestone.goal_id ? goalOrder.get(a.milestone.goal_id) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
 const bGoalOrder = b.milestone.goal_id ? goalOrder.get(b.milestone.goal_id) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
 const aPosition = a.milestone.position ?? a.index + 1;
 const bPosition = b.milestone.position ?? b.index + 1;
 return aGoalOrder - bGoalOrder || aPosition - bPosition || a.index - b.index;
 })
 .map(({ milestone }) => milestone.id);
 const draggingMilestoneForPreview = draggingMilestoneId ? milestones.find((milestone) => milestone.id === draggingMilestoneId) : null;
 const dropTargetMilestoneForPreview = dropTargetMilestoneId ? milestones.find((milestone) => milestone.id === dropTargetMilestoneId) : null;
 const previewMilestoneIds =
 sortBy === 'custom' &&
 draggingMilestoneForPreview?.goal_id &&
 dropTargetMilestoneForPreview?.goal_id === draggingMilestoneForPreview.goal_id
 ? moveIdRelative(customOrderedMilestoneIds, draggingMilestoneId, dropTargetMilestoneId, dropTargetMilestonePlacement)
 : customOrderedMilestoneIds;

 const sortedMilestones = [...filteredMilestones].sort((a, b) => {
 switch (sortBy) {
 case 'custom':
 return previewMilestoneIds.indexOf(a.id) - previewMilestoneIds.indexOf(b.id);
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

 const getMilestoneOrderForGoal = (goalId: string): string[] => milestones
 .filter((milestone) => milestone.goal_id === goalId)
 .map((milestone, index) => ({ milestone, index }))
 .sort((a, b) => {
 const aPosition = a.milestone.position ?? a.index + 1;
 const bPosition = b.milestone.position ?? b.index + 1;
 return aPosition - bPosition || a.index - b.index;
 })
 .map(({ milestone }) => milestone.id);

 const persistMilestoneOrder = async (target: Milestone, placement: DropPlacement) => {
 if (!draggingMilestoneId || draggingMilestoneId === target.id) return;
 const draggingMilestone = milestones.find((milestone) => milestone.id === draggingMilestoneId);
 if (!draggingMilestone || !draggingMilestone.goal_id || draggingMilestone.goal_id !== target.goal_id) {
 toast.info('Milestones can be reordered only inside the same goal');
 return;
 }
 const previousOrder = getMilestoneOrderForGoal(draggingMilestone.goal_id);
 const nextOrder = moveIdRelative(previousOrder, draggingMilestoneId, target.id, placement);
 if (nextOrder === previousOrder) return;
 reorderMilestonesInGoal(draggingMilestone.goal_id, nextOrder);
 try {
 await milestonesApi.reorder(nextOrder);
 } catch (error) {
 console.error('Failed to persist milestone order:', error);
 reorderMilestonesInGoal(draggingMilestone.goal_id, previousOrder);
 toast.error('Failed to save milestone order');
 }
 };

 if (isLoadingMilestones && milestones.length === 0) {
 return (
 <div className="page">
 <GridSkeleton count={6} />
 </div>
 );
 }

 return (
 <div className="page">
 {/* Page Header */}
 <div className="page-head page-head-row">
 <div>
 <h1 className="page-title">Milestones</h1>
 <p className="page-lede">Track key progress checkpoints across your goals.</p>
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
 onClick={() => setIsCreatingMilestone(true)}
 className="btn btn-primary page-cta"
 >
 <Plus className="w-4 h-4" />
 <span>Create Milestone</span>
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
 aria-label="Search milestones"
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
 </div>

 {/* Milestones Grid */}
 {sortedMilestones.length === 0 ? (
 <div className="text-center py-16">
 <Flag className="w-16 h-16 mx-auto text-muted-foreground/60 dark:text-foreground mb-4" />
 <h3 className="text-xl font-medium text-foreground mb-2">No milestones yet</h3>
 <p className="text-foreground dark:text-muted-foreground mb-6">Create your first milestone to track progress</p>
 <button
 onClick={() => setIsCreatingMilestone(true)}
 className="btn btn-primary"
 >
 Create Your First Milestone
 </button>
 </div>
 ) : (
 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
 {sortedMilestones.map((milestone) => {
 const parentGoal = goals.find(g => g.id === milestone.goal_id);
 const isSelected = selectedIds.has(milestone.id);
 const canDrag = sortBy === 'custom' && !!milestone.goal_id;
 const isDragging = draggingMilestoneId === milestone.id;
 const draggingMilestone = draggingMilestoneId ? milestones.find((item) => item.id === draggingMilestoneId) : null;
 const canDropHere = !!draggingMilestone && draggingMilestone.goal_id === milestone.goal_id && draggingMilestone.id !== milestone.id;
 const isDropTarget = dropTargetMilestoneId === milestone.id && canDropHere;
 const showDropMarker = isDragging && !!dropTargetMilestoneId && dropTargetMilestoneId !== milestone.id;
 const nestedTaskCount = milestone.tasks?.length ?? 0;
 const flatTaskCount = tasks.filter((task) => task.milestone_id === milestone.id).length;
 const taskCount = Math.max(nestedTaskCount, flatTaskCount);
 return (
 <div key={milestone.id} className="min-w-0">
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
 e.dataTransfer.setData('application/x-tasknest-milestone-id', milestone.id);
 setDraggingMilestoneId(milestone.id);
 }}
 onDragEnd={() => {
 setDraggingMilestoneId(null);
 setDropTargetMilestoneId(null);
 }}
 onDragOver={(e) => {
 if (!canDrag || !draggingMilestoneId || draggingMilestoneId === milestone.id) return;
 e.preventDefault();
 if (!canDropHere) {
 e.dataTransfer.dropEffect = 'none';
 return;
 }
 const rect = e.currentTarget.getBoundingClientRect();
 const placement: DropPlacement = e.clientY > rect.top + rect.height / 2 ? 'after' : 'before';
 e.dataTransfer.dropEffect = 'move';
 setDropTargetMilestoneId(milestone.id);
 setDropTargetMilestonePlacement(placement);
 }}
 onDrop={async (e) => {
 if (!canDrag) return;
 e.preventDefault();
 await persistMilestoneOrder(milestone, dropTargetMilestonePlacement);
 setDraggingMilestoneId(null);
 setDropTargetMilestoneId(null);
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
 title="Drag to reorder within this goal"
 aria-label={`Drag ${milestone.title} to reorder`}
 >
 <GripVertical className="h-4 w-4" style={{ color: 'var(--tn-fg-muted)' }} aria-hidden="true" />
 </button>
 )}
 <input
 type="checkbox"
 checked={isSelected}
 onChange={() => toggleSelected(milestone.id)}
 draggable={false}
 onMouseDown={(e) => e.stopPropagation()}
 aria-label={`Select milestone ${milestone.title}`}
 className="absolute top-4 right-4 h-4 w-4 rounded border-border"
 style={{ accentColor: 'var(--tn-accent)' }}
 />
 <Link
 href={`/milestone/${milestone.id}`}
 draggable={false}
 className="block"
 style={{ paddingLeft: canDrag ? 14 : 0 }}
 >
 <div className="flex items-start mb-4 pr-8">
 <div className="flex-1">
 <h3 className="text-lg font-semibold text-foreground mb-2">{milestone.title}</h3>
 {milestone.description && (
 <p className="text-sm text-foreground dark:text-muted-foreground mb-3 line-clamp-2">
 {stripMarkdown(milestone.description)}
 </p>
 )}
 </div>
 </div>

 {parentGoal && (
 <div className="flex items-center text-xs mb-3" style={{ color: 'var(--tn-accent)' }}>
 <Target className="w-3 h-3 mr-1" />
 <span>{parentGoal.title}</span>
 </div>
 )}

 <div className="flex items-center space-x-2 mb-4">
 <span className={`pill ${getStatusColor(milestone.status)}`}>
 {milestone.status}
 </span>
 <span className={`pill ${getPriorityColor(milestone.priority)}`}>
 {milestone.priority}
 </span>
 </div>

 {milestone.due_date && (
 <div className="flex items-center text-xs text-muted-foreground dark:text-muted-foreground mb-4">
 <Calendar className="w-3 h-3 mr-1" />
 <span>Due {new Date(milestone.due_date).toLocaleDateString()}</span>
 </div>
 )}
 </Link>

 <div className="flex items-center justify-between text-sm text-muted-foreground dark:text-muted-foreground">
 <span>{taskCount} tasks</span>
 <button
 draggable={false}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => {
 e.preventDefault();
 softDeleteMilestone(milestone.id);
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

 {/* Create Milestone Modal */}
 {isCreatingMilestone && (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
 <div className="bg-card dark:bg-card rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
 <h3 className="text-lg font-semibold text-foreground mb-4">Create New Milestone</h3>
 <MilestoneForm
 onSuccess={handleMilestoneSubmit}
 onCancel={() => setIsCreatingMilestone(false)}
 />
 </div>
 </div>
 )}

 <ConfirmDialog
 open={!!confirmDeleteId}
 title="Delete milestone"
 description="Are you sure you want to delete this milestone? Linked tasks and todos will be removed too."
 destructive
 confirmLabel="Delete"
 busy={isDeleting}
 onConfirm={performDelete}
 onCancel={() => !isDeleting && setConfirmDeleteId(null)}
 />

 <ConfirmDialog
 open={confirmBulkDelete}
 title={`Delete ${selectedIds.size} milestone${selectedIds.size === 1 ? '' : 's'}`}
 description="All linked tasks and todos will be removed. This action cannot be undone."
 destructive
 confirmLabel={`Delete ${selectedIds.size}`}
 busy={isDeleting}
 onConfirm={performBulkDelete}
 onCancel={() => !isDeleting && setConfirmBulkDelete(false)}
 />
 
 </div>
 );
};

export default withAuth(MilestonesPage);
