'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { withAuth } from '@/hoc/withAuth';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { goalsApi } from '@/lib/api';
import { duplicateGoal } from '@/lib/duplicateGoal';
import { toast } from '@/store/useToast';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { goalToMarkdown, downloadMarkdown } from '@/lib/goalToMarkdown';
import { useRecentGoals } from '@/store/useRecentGoals';
import { GoalColorPicker } from '@/components/dashboard/GoalColorPicker';
import { Copy, FileText } from 'lucide-react';

const GoalDetailView = dynamic(
 () => import('@/components/dashboard/GoalDetailView').then((m) => m.GoalDetailView),
 { ssr: false }
);

const GoalDetailPage: React.FC = () => {
 const params = useParams();
 const router = useRouter();
 const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params!.id[0] : '';

 const goal = useStore((s) => s.goals.find((g) => g.id === id));
 const { updateGoal, deleteGoal: deleteGoalFromStore, addGoal } = useStore(
 useShallow((s) => ({ updateGoal: s.updateGoal, deleteGoal: s.deleteGoal, addGoal: s.addGoal }))
 );

 const [isLoading, setIsLoading] = useState(!goal);
 const [notFound, setNotFound] = useState(false);
 const [isDuplicating, setIsDuplicating] = useState(false);
 useDocumentTitle(goal?.title);

 const visitGoal = useRecentGoals((s) => s.visit);
 useEffect(() => {
 if (goal?.id) visitGoal(goal.id);
 }, [goal?.id, visitGoal]);

 const handleCopyLink = async () => {
 if (typeof window === 'undefined') return;
 const url = window.location.href;
 try {
 // Modern clipboard API requires secure context.
 if (navigator.clipboard?.writeText) {
 await navigator.clipboard.writeText(url);
 } else {
 const ta = document.createElement('textarea');
 ta.value = url;
 ta.style.position = 'fixed';
 ta.style.opacity = '0';
 document.body.appendChild(ta);
 ta.select();
 document.execCommand('copy');
 document.body.removeChild(ta);
 }
 toast.success('Link copied to clipboard');
 } catch (err) {
 console.error('Copy failed:', err);
 toast.error('Failed to copy link');
 }
 };

 const handleExportMarkdown = () => {
 if (!goal) return;
 const md = goalToMarkdown(goal);
 const slug = goal.title
 .toLowerCase()
 .replace(/[^a-z0-9]+/g, '-')
 .replace(/^-|-$/g, '')
 .slice(0, 40) || 'goal';
 downloadMarkdown(`${slug}.md`, md);
 toast.success('Markdown downloaded');
 };

 const handleDuplicate = async () => {
 if (!goal) return;
 setIsDuplicating(true);
 try {
 const { goal: newGoal, milestoneCount, taskCount, childCount } = await duplicateGoal(goal);
 addGoal(newGoal);
 toast.success(
 `Duplicated: ${milestoneCount} milestone${milestoneCount === 1 ? '' : 's'}, ${taskCount} task${taskCount === 1 ? '' : 's'}, ${childCount} item${childCount === 1 ? '' : 's'}`
 );
 router.push(`/goal/${newGoal.id}`);
 } catch (err) {
 console.error('Failed to duplicate goal:', err);
 toast.error('Failed to duplicate goal');
 } finally {
 setIsDuplicating(false);
 }
 };

 useEffect(() => {
 if (!id) return;
 let cancelled = false;
 const load = async () => {
 try {
 const fullGoal = await goalsApi.getById(id, {
 include_milestones: true,
 include_tasks: true,
 include_subtasks: true,
 include_todos: true,
 });
 if (!cancelled) updateGoal(fullGoal);
 } catch (err) {
 console.error('Failed to load goal by id:', err);
 if (!cancelled) setNotFound(true);
 } finally {
 if (!cancelled) setIsLoading(false);
 }
 };
 load();
 return () => {
 cancelled = true;
 };
 }, [id, updateGoal]);

 const handleDelete = async () => {
 if (!goal) return;
 try {
 await goalsApi.delete(goal.id);
 deleteGoalFromStore(goal.id);
 toast.success('Goal deleted');
 router.push('/goal');
 } catch (error) {
 console.error('Failed to delete goal:', error);
 toast.error('Failed to delete goal');
 }
 };

 if (isLoading) {
 return (
 <div className="min-h-screen bg-muted dark:bg-card flex items-center justify-center">
 <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
 </div>
 );
 }

 if (notFound || !goal) {
 return (
 <div className="min-h-screen bg-muted dark:bg-card flex items-center justify-center px-4">
 <div className="max-w-md w-full text-center bg-card dark:bg-card rounded-xl border border-border dark:border-border p-8">
 <h1 className="text-2xl font-semibold text-foreground mb-3">Goal not found</h1>
 <p className="text-foreground dark:text-muted-foreground/60 mb-6">
 The goal you&apos;re looking for doesn&apos;t exist or has been deleted.
 </p>
 <button
 onClick={() => router.push('/goal')}
 className="px-4 py-2 rounded-lg bg-card dark:bg-card text-white hover:bg-card dark:hover:bg-muted"
 >
 Back to goals
 </button>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-muted dark:bg-card">
 <main className="container mx-auto px-6 py-8">
 <div className="flex justify-end mb-4 space-x-2 no-print flex-wrap gap-2">
 <button
 onClick={handleCopyLink}
 className="px-3 py-1.5 text-sm rounded-md font-medium border border-border dark:border-border text-foreground dark:text-muted-foreground/60 hover:bg-muted dark:hover:bg-card flex items-center space-x-1"
 title="Copy link to this goal"
 >
 <Copy className="w-3.5 h-3.5" />
 <span>Copy link</span>
 </button>
 <button
 onClick={handleExportMarkdown}
 className="px-3 py-1.5 text-sm rounded-md font-medium border border-border dark:border-border text-foreground dark:text-muted-foreground/60 hover:bg-muted dark:hover:bg-card flex items-center space-x-1"
 title="Download goal as markdown"
 >
 <FileText className="w-3.5 h-3.5" />
 <span>Export .md</span>
 </button>
 <GoalColorPicker goalId={goal.id} />
 <button
 onClick={handleDuplicate}
 disabled={isDuplicating}
 className="px-3 py-1.5 text-sm rounded-md font-medium border border-border dark:border-border text-foreground dark:text-muted-foreground/60 hover:bg-muted dark:hover:bg-card disabled:opacity-50"
 >
 {isDuplicating ? 'Duplicating…' : 'Duplicate goal'}
 </button>
 </div>
 <GoalDetailView goal={goal} onBack={() => router.push('/goal')} onDelete={handleDelete} />
 </main>
 </div>
 );
};

export default withAuth(GoalDetailPage);
