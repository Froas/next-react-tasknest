'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { withAuth } from '@/hoc/withAuth';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { PriorityType, StatusType } from '@/lib/types';
import { goalsApi, milestonesApi } from '@/lib/api';
import { calculateMilestoneProgress, calculateMilestoneProgressLanes } from '@/lib/progress';
import { formatDate } from '@/lib/utils';
import { toast } from '@/store/useToast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { BatchImport } from '@/components/dashboard/BatchImport';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { Markdown } from '@/components/ui/Markdown';
import { InlineSelect, InlineText } from '@/components/ui/InlineEdit';
import { CompletionRulePanel } from '@/components/dashboard/GoalCompletionRulePanel';
import { ProgressLanes } from '@/components/dashboard/ProgressLanes';
import { ChevronLeft, Target, Trash2, ListPlus } from 'lucide-react';

const MilestoneCard = dynamic(() => import('@/components/dashboard/MilestoneCard'), { ssr: false });

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

const tokenChip = (tone: string): React.CSSProperties => ({
 background: `color-mix(in srgb, ${tone} 12%, var(--tn-card))`,
 color: tone,
 borderColor: `color-mix(in srgb, ${tone} 38%, var(--tn-card))`,
});

const statusStyle = (status: StatusType): React.CSSProperties => {
 switch (status) {
 case StatusType.FINISHED:
 return tokenChip('var(--tn-good, #2f7d50)');
 case StatusType.IN_PROGRESS:
 return tokenChip('var(--tn-accent)');
 case StatusType.CANCELLED:
 case StatusType.ABORTED:
 return tokenChip('var(--tn-bad, #c25d63)');
 case StatusType.STARTED:
 return tokenChip('var(--tn-warn, #c8932a)');
 case StatusType.OUTSTANDING:
 default:
 return tokenChip('var(--tn-fg-muted)');
 }
};

const priorityStyle = (priority: PriorityType): React.CSSProperties => {
 switch (priority) {
 case PriorityType.HIGH:
 return tokenChip('var(--tn-bad, #c25d63)');
 case PriorityType.MEDIUM:
 return tokenChip('var(--tn-warn, #c8932a)');
 case PriorityType.LOW:
 return tokenChip('var(--tn-good, #2f7d50)');
 default:
 return tokenChip('var(--tn-fg-muted)');
 }
};

const MilestoneDetailPage: React.FC = () => {
 const params = useParams();
 const router = useRouter();
 const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params!.id[0] : '';

 const storeMatch = useStore(useShallow((s) => {
 for (const goal of s.goals) {
 const m = goal.milestones?.find((mm) => mm.id === id);
 if (m) return { milestone: m, parentGoal: goal };
 }
 return { milestone: undefined, parentGoal: undefined };
 }));
 const [fetchedMilestone, setFetchedMilestone] = useState<typeof storeMatch.milestone>();
 const milestone = storeMatch.milestone ?? fetchedMilestone;
 const parentGoal = storeMatch.parentGoal;

 const { updateMilestoneInGoals, deleteMilestoneFromGoals, fetchGoals } = useStore(
 useShallow((s) => ({
 updateMilestoneInGoals: s.updateMilestoneInGoals,
 deleteMilestoneFromGoals: s.deleteMilestoneFromGoals,
 fetchGoals: s.fetchGoals,
 }))
 );

 const [isLoading, setIsLoading] = useState(!milestone);
 const [loadedFullForId, setLoadedFullForId] = useState<string | null>(null);
 const [confirmDelete, setConfirmDelete] = useState(false);
 const [isDeleting, setIsDeleting] = useState(false);
 const [batchOpen, setBatchOpen] = useState(false);
 useDocumentTitle(milestone?.title);

 const renderStatusBadge = (status: StatusType) => (
 <span
 className="inline-flex max-w-full px-3 py-2 rounded-full text-sm font-medium border"
 style={statusStyle(status)}
 >
 <span className="flex items-center gap-2 min-w-0">
 <span className="w-2 h-2 rounded-full bg-current"></span>
 <span className="truncate">{status}</span>
 </span>
 </span>
 );

 const renderPriorityBadge = (priority: PriorityType) => (
 <span className="inline-flex max-w-full px-3 py-2 rounded-full text-sm font-medium border" style={priorityStyle(priority)}>
 <span className="flex items-center gap-2 min-w-0">
 <span className="w-2 h-2 rounded-full bg-current"></span>
 <span className="truncate">{priority}</span>
 </span>
 </span>
 );

 useEffect(() => {
 if (!id) {
 return;
 }
 if (loadedFullForId === id) {
 setIsLoading(false);
 return;
 }
 let cancelled = false;
 const load = async () => {
 try {
 if (!milestone) setIsLoading(true);
 // Load the milestone fully and ensure goals are fetched so the parent
 // breadcrumb resolves. Even when a milestone already exists in the store,
 // it may be a lightweight list item without tasks/subtasks/todos.
 const fresh = await milestonesApi.getById(id, true, true, true);
 if (cancelled) return;
 setFetchedMilestone(fresh);
 updateMilestoneInGoals(fresh);
 setLoadedFullForId(id);
 fetchGoals({ force: true });
 } catch (err) {
 console.error('Failed to load milestone:', err);
 } finally {
 if (!cancelled) setIsLoading(false);
 }
 };
 load();
 return () => {
 cancelled = true;
 };
 }, [id, loadedFullForId, milestone, updateMilestoneInGoals, fetchGoals]);

 const progress = useMemo(() => (milestone ? calculateMilestoneProgress(milestone) : 0), [milestone]);
 const progressLanes = useMemo(() => (milestone ? calculateMilestoneProgressLanes(milestone) : []), [milestone]);
 const metricTaskIds = useMemo(() => milestone?.tasks?.map((task) => task.id) ?? [], [milestone]);

 const handleUpdate = async (data: Partial<typeof milestone> & { id?: string }) => {
 if (!milestone) return;
 try {
 const updated = await milestonesApi.update({ id: milestone.id, ...data } as any);
 setFetchedMilestone(updated);
 updateMilestoneInGoals(updated);
 void fetchGoals({ force: true, silent: true });
 } catch (err) {
 console.error('Failed to update milestone:', err);
 toast.error('Failed to update milestone');
 throw err;
 }
 };

 const performDelete = async () => {
 if (!milestone) return;
 setIsDeleting(true);
 try {
 await milestonesApi.delete(milestone.id);
 deleteMilestoneFromGoals(milestone.id);
 toast.success('Milestone deleted');
 router.push(parentGoal ? `/goal/${parentGoal.id}` : '/milestone');
 } catch (err) {
 console.error('Failed to delete milestone:', err);
 toast.error('Failed to delete milestone');
 } finally {
 setIsDeleting(false);
 setConfirmDelete(false);
 }
 };

 if (isLoading) {
 return (
 <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tn-bg)' }}>
 <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: 'var(--tn-accent)' }} />
 </div>
 );
 }

 if (!milestone) {
 return (
 <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--tn-bg)' }}>
 <div className="card max-w-md w-full text-center" style={{ padding: 32 }}>
 <h1 className="text-2xl font-semibold text-foreground mb-3">Milestone not found</h1>
 <p className="mb-6" style={{ color: 'var(--tn-fg-muted)' }}>It may have been deleted or moved.</p>
 <Link
 href="/milestone"
 className="btn btn-primary"
 >
 Back to milestones
 </Link>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen" style={{ background: 'var(--tn-bg)' }}>
 <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-4xl">
 <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
 <button
 onClick={() => router.back()}
 className="btn btn-ghost"
 >
 <ChevronLeft className="w-4 h-4 mr-1" /> Back
 </button>
 <div className="flex flex-wrap items-center gap-2">
 <button
 onClick={() => setBatchOpen(true)}
 className="btn btn-secondary"
 >
 <ListPlus className="w-4 h-4" />
 <span>Batch import</span>
 </button>
 <button
 onClick={() => setConfirmDelete(true)}
 className="btn btn-danger"
 >
 <Trash2 className="w-4 h-4" />
 <span>Delete</span>
 </button>
 </div>
 </div>

 <div className="card mb-6">
 {parentGoal && (
 <Link
 href={`/goal/${parentGoal.id}`}
 className="flex items-center text-xs mb-2 hover:underline"
 style={{ color: 'var(--tn-accent)' }}
 >
 <Target className="w-3 h-3 mr-1" />
 {parentGoal.title}
 </Link>
 )}
 <InlineText
 value={milestone.title}
 required
 ariaLabel="Edit milestone title"
 className="-mx-2 px-2 py-1 mb-2"
 editClassName="page-title"
 renderValue={(title) => <h1 className="page-title" style={{ marginBottom: 8 }}>{title}</h1>}
 onSave={(title) => handleUpdate({ title })}
 />
 <InlineText
 value={milestone.description ?? ''}
 placeholder="Add a description..."
 multiline
 ariaLabel="Edit milestone description"
 className="-mx-2 px-2 py-1 mb-4"
 editClassName="text-foreground dark:text-muted-foreground/60"
 renderValue={(description) => <Markdown source={description} className="mb-4" />}
 onSave={(description) => handleUpdate({ description })}
 />
 <div className="mb-4 flex flex-wrap items-center gap-2">
 <InlineSelect
 value={milestone.status}
 options={statusOptions}
 ariaLabel="Edit milestone status"
 renderValue={renderStatusBadge}
 onSave={(status) => handleUpdate({ status })}
 />
 <InlineSelect
 value={milestone.priority}
 options={priorityOptions}
 ariaLabel="Edit milestone priority"
 renderValue={renderPriorityBadge}
 onSave={(priority) => handleUpdate({ priority })}
 />
 </div>
 <div className="flex items-center justify-between text-sm">
 <span className="text-muted-foreground dark:text-muted-foreground">
 {milestone.tasks?.length || 0} tasks
 {milestone.due_date ? ` · Due ${formatDate(milestone.due_date)}` : ''}
 </span>
 <span className="font-semibold text-foreground">Structural {Math.round(progress)}%</span>
 </div>
 <div className="rounded-full h-2.5 mt-2 overflow-hidden" style={{ background: 'var(--tn-bar-bg, rgba(0,0,0,.08))', border: 'var(--tn-line)' }}>
 <div
 className="h-full rounded-full transition-all"
 style={{ width: `${progress}%`, background: 'var(--tn-accent)' }}
 />
 </div>
 </div>

 <ProgressLanes lanes={progressLanes} className="mb-6" />
 <CompletionRulePanel
 entity={milestone}
 entityType="milestone"
 metricTaskIds={metricTaskIds}
 onSaved={(entity) => {
 const updated = entity as typeof milestone;
 setFetchedMilestone(updated);
 updateMilestoneInGoals(updated);
 void fetchGoals({ force: true, silent: true });
 }}
 />

 <MilestoneCard
 milestone={milestone}
 goalId={parentGoal?.id ?? milestone.goal_id ?? ''}
 onUpdate={handleUpdate}
 onDelete={() => setConfirmDelete(true)}
 />

 <ConfirmDialog
 open={confirmDelete}
 title="Delete milestone"
 description="All linked tasks and todos will be removed. This action cannot be undone."
 destructive
 confirmLabel="Delete"
 busy={isDeleting}
 onConfirm={performDelete}
 onCancel={() => !isDeleting && setConfirmDelete(false)}
 />

 <BatchImport
 open={batchOpen}
 onClose={() => setBatchOpen(false)}
 goalId={parentGoal?.id ?? milestone.goal_id ?? ''}
 milestoneId={milestone.id}
 />
 </main>
 </div>
 );
};

export default withAuth(MilestoneDetailPage);
