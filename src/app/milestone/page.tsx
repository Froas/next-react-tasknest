'use client';

import React, { useState, useEffect } from 'react';
import { withAuth } from '@/hoc/withAuth';
import { MilestoneItem as Milestone, StatusType, PriorityType } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { MilestoneForm } from '@/components/dashboard/MilestoneForm';
import { milestonesApi } from '@/lib/api';
import { priorityWeight } from '@/lib/sort';
import { toast } from '@/store/useToast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { GridSkeleton } from '@/components/ui/Skeletons';
import { usePersistentState } from '@/lib/usePersistentState';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { stripMarkdown } from '@/lib/utils';
import Link from 'next/link';
import { Plus, Flag, Calendar, Filter, Target } from 'lucide-react';

const MilestonesPage: React.FC = () => {
 const [isCreatingMilestone, setIsCreatingMilestone] = useState(false);
 const [filterStatus, setFilterStatus] = usePersistentState<StatusType | 'all'>('milestone:filter', 'all');
 const [sortBy, setSortBy] = usePersistentState<'title' | 'priority' | 'due'>('milestone:sort', 'title');
 const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
 const [isDeleting, setIsDeleting] = useState(false);
 const [search, setSearch] = useState('');
 useDocumentTitle('Milestones');
 const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
 const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

 const goals = useStore((s) => s.goals);
 const milestones = useStore((s) => s.milestones);
 const isLoadingMilestones = useStore((s) => s.isLoadingMilestones);
 const milestonesError = useStore((s) => s.milestonesError);
 const {
 fetchMilestones,
 addMilestone,
 addMilestoneToGoal,
 deleteMilestoneFromGoals,
 fetchGoals,
 updateMilestoneInGoals,
 } = useStore(
 useShallow((s) => ({
 fetchMilestones: s.fetchMilestones,
 addMilestone: s.addMilestone,
 addMilestoneToGoal: s.addMilestoneToGoal,
 deleteMilestoneFromGoals: s.deleteMilestoneFromGoals,
 fetchGoals: s.fetchGoals,
 updateMilestoneInGoals: s.updateMilestoneInGoals,
 }))
 );

 useEffect(() => {
 fetchMilestones();
 fetchGoals();
 }, [fetchMilestones, fetchGoals]);

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

 // Soft-delete with undo: optimistic remove, 5-second toast window, then
 // commit via API (or restore on Undo / API failure).
 const softDeleteMilestone = (id: string) => {
 const milestone = milestones.find((m) => m.id === id);
 if (!milestone) return;
 deleteMilestoneFromGoals(id);
 toast.withAction(
 'info',
 `"${milestone.title}" deleted`,
 {
 label: 'Undo',
 run: () => {
 addMilestone(milestone);
 if (milestone.goal_id) addMilestoneToGoal(milestone, milestone.goal_id);
 },
 },
 {
 ttlMs: 5000,
 onExpire: async () => {
 try {
 await milestonesApi.delete(id);
 } catch (err) {
 console.error('Soft-delete commit failed:', err);
 addMilestone(milestone);
 if (milestone.goal_id) addMilestoneToGoal(milestone, milestone.goal_id);
 toast.error('Failed to delete milestone — restored');
 }
 },
 }
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
 const filteredMilestones = milestones.filter((milestone) => {
 if (filterStatus !== 'all' && milestone.status !== filterStatus) return false;
 if (!searchLower) return true;
 return (
 milestone.title.toLowerCase().includes(searchLower) ||
 (milestone.description ?? '').toLowerCase().includes(searchLower)
 );
 });

 const sortedMilestones = [...filteredMilestones].sort((a, b) => {
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
 <div className="flex items-center justify-between mb-8">
 <div>
 <h1 className="page-title">Milestones</h1>
 <p className="page-lede">Track key progress checkpoints across your goals.</p>
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
 onClick={() => setIsCreatingMilestone(true)}
 className="btn btn-primary"
 >
 <Plus className="w-5 h-5" />
 <span>Create Milestone</span>
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
 aria-label="Search milestones"
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
 return (
 <div
 key={milestone.id}
 className={`relative bg-card dark:bg-card rounded-lg border p-6 hover:shadow-md transition-shadow ${
 isSelected
 ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900'
 : 'border-border dark:border-border'
 }`}
 >
 <input
 type="checkbox"
 checked={isSelected}
 onChange={() => toggleSelected(milestone.id)}
 aria-label={`Select milestone ${milestone.title}`}
 className="absolute top-4 right-4 h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500"
 />
 <Link href={`/milestone/${milestone.id}`} className="block">
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
 <div className="flex items-center text-xs text-blue-600 dark:text-blue-400 mb-3">
 <Target className="w-3 h-3 mr-1" />
 <span>{parentGoal.title}</span>
 </div>
 )}

 <div className="flex items-center space-x-2 mb-4">
 <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(milestone.status)}`}>
 {milestone.status}
 </span>
 <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(milestone.priority)}`}>
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
 <span>{milestone.tasks?.length || 0} tasks</span>
 <button
 onClick={(e) => {
 e.preventDefault();
 softDeleteMilestone(milestone.id);
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
