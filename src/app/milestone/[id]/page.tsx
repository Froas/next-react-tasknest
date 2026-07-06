'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { withAuth } from '@/hoc/withAuth';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { goalsApi, milestonesApi } from '@/lib/api';
import { calculateMilestoneProgress } from '@/lib/progress';
import { formatDate } from '@/lib/utils';
import { toast } from '@/store/useToast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { BatchImport } from '@/components/dashboard/BatchImport';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { Markdown } from '@/components/ui/Markdown';
import { ChevronLeft, Target, Trash2, ListPlus } from 'lucide-react';

const MilestoneCard = dynamic(() => import('@/components/dashboard/MilestoneCard'), { ssr: false });

const MilestoneDetailPage: React.FC = () => {
 const params = useParams();
 const router = useRouter();
 const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params!.id[0] : '';

 const { milestone, parentGoal } = useStore((s) => {
 for (const goal of s.goals) {
 const m = goal.milestones?.find((mm) => mm.id === id);
 if (m) return { milestone: m, parentGoal: goal };
 }
 return { milestone: undefined, parentGoal: undefined };
 });

 const { updateMilestoneInGoals, deleteMilestoneFromGoals, fetchGoals } = useStore(
 useShallow((s) => ({
 updateMilestoneInGoals: s.updateMilestoneInGoals,
 deleteMilestoneFromGoals: s.deleteMilestoneFromGoals,
 fetchGoals: s.fetchGoals,
 }))
 );

 const [isLoading, setIsLoading] = useState(!milestone);
 const [confirmDelete, setConfirmDelete] = useState(false);
 const [isDeleting, setIsDeleting] = useState(false);
 const [batchOpen, setBatchOpen] = useState(false);
 useDocumentTitle(milestone?.title);

 useEffect(() => {
 if (!id || milestone) {
 setIsLoading(false);
 return;
 }
 let cancelled = false;
 const load = async () => {
 try {
 // Load the milestone fully and ensure goals are fetched so the parent
 // breadcrumb resolves.
 const fresh = await milestonesApi.getById(id, true, true, true);
 if (cancelled) return;
 updateMilestoneInGoals(fresh);
 fetchGoals();
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
 }, [id, milestone, updateMilestoneInGoals, fetchGoals]);

 const progress = useMemo(() => (milestone ? calculateMilestoneProgress(milestone) : 0), [milestone]);

 const handleUpdate = async (data: Partial<typeof milestone> & { id?: string }) => {
 if (!milestone) return;
 try {
 const updated = await milestonesApi.update({ id: milestone.id, ...data } as any);
 updateMilestoneInGoals(updated);
 } catch (err) {
 console.error('Failed to update milestone:', err);
 toast.error('Failed to update milestone');
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
 <div className="min-h-screen bg-muted dark:bg-card flex items-center justify-center">
 <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
 </div>
 );
 }

 if (!milestone) {
 return (
 <div className="min-h-screen bg-muted dark:bg-card flex items-center justify-center px-4">
 <div className="max-w-md w-full text-center bg-card dark:bg-card rounded-xl border border-border dark:border-border p-8">
 <h1 className="text-2xl font-semibold text-foreground mb-3">Milestone not found</h1>
 <p className="text-foreground dark:text-muted-foreground/60 mb-6">It may have been deleted or moved.</p>
 <Link
 href="/milestone"
 className="inline-block px-4 py-2 rounded-lg bg-card dark:bg-card text-white hover:bg-card dark:hover:bg-muted"
 >
 Back to milestones
 </Link>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-muted dark:bg-card">
 <main className="container mx-auto px-6 py-8 max-w-4xl">
 <div className="flex items-center justify-between mb-6">
 <button
 onClick={() => router.back()}
 className="flex items-center text-sm text-foreground dark:text-muted-foreground/60 hover:text-foreground dark:hover:text-white"
 >
 <ChevronLeft className="w-4 h-4 mr-1" /> Back
 </button>
 <div className="flex items-center space-x-2">
 <button
 onClick={() => setBatchOpen(true)}
 className="flex items-center space-x-1 px-3 py-1.5 text-sm text-foreground dark:text-muted-foreground/60 border border-border dark:border-border hover:bg-muted dark:hover:bg-card rounded-lg"
 >
 <ListPlus className="w-4 h-4" />
 <span>Batch import</span>
 </button>
 <button
 onClick={() => setConfirmDelete(true)}
 className="flex items-center space-x-1 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
 >
 <Trash2 className="w-4 h-4" />
 <span>Delete</span>
 </button>
 </div>
 </div>

 <div className="bg-card dark:bg-card rounded-xl border border-border dark:border-border p-6 mb-6">
 {parentGoal && (
 <Link
 href={`/goal/${parentGoal.id}`}
 className="flex items-center text-xs text-blue-600 dark:text-blue-400 mb-2 hover:underline"
 >
 <Target className="w-3 h-3 mr-1" />
 {parentGoal.title}
 </Link>
 )}
 <h1 className="page-title" style={{ marginBottom: 8 }}>{milestone.title}</h1>
 {milestone.description && (
 <Markdown source={milestone.description} className="text-foreground dark:text-muted-foreground/60 mb-4" />
 )}
 <div className="flex items-center justify-between text-sm">
 <span className="text-muted-foreground dark:text-muted-foreground">
 {milestone.tasks?.length || 0} tasks
 {milestone.due_date ? ` · Due ${formatDate(milestone.due_date)}` : ''}
 </span>
 <span className="font-semibold text-foreground">{Math.round(progress)}%</span>
 </div>
 <div className="bg-muted dark:bg-card rounded-full h-2 mt-2 overflow-hidden">
 <div
 className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all"
 style={{ width: `${progress}%` }}
 />
 </div>
 </div>

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
