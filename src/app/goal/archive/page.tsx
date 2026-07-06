'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { withAuth } from '@/hoc/withAuth';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { GoalItem as Goal, StatusType } from '@/lib/types';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { stripMarkdown, formatDate } from '@/lib/utils';
import { useGoalGradientClass } from '@/lib/goalCover';
import { goalsApi } from '@/lib/api';
import { toast } from '@/store/useToast';
import { Archive, ArrowLeft, RotateCcw } from 'lucide-react';

const ArchivedGoalsPage: React.FC = () => {
 useDocumentTitle('Archived goals');

 const goals = useStore((s) => s.goals);
 const { fetchGoals, updateGoal } = useStore(
 useShallow((s) => ({ fetchGoals: s.fetchGoals, updateGoal: s.updateGoal }))
 );

 useEffect(() => {
 fetchGoals();
 }, [fetchGoals]);

 const archived = goals.filter(
 (g) => g.status === StatusType.FINISHED || g.status === StatusType.CANCELLED
 );

 const handleRestore = async (id: string) => {
 try {
 const updated = await goalsApi.update({ id, status: StatusType.IN_PROGRESS });
 updateGoal(updated);
 toast.success('Goal restored');
 } catch (err) {
 console.error('Restore failed:', err);
 toast.error('Failed to restore goal');
 }
 };

 return (
 <div className="page">
 <div className="page-head">
 <Link
 href="/goal"
 style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--tn-fg-muted)', marginBottom: 8, textDecoration: 'none' }}
 >
 <ArrowLeft className="w-4 h-4" />
 Back to goals
 </Link>
 <div className="page-eyebrow">Archive</div>
 <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
 <Archive style={{ width: 28, height: 28, color: 'var(--tn-fg-muted)' }} />
 Archive
 </h1>
 <p className="page-lede">
 Goals you&apos;ve finished or cancelled. Restore them anytime to bring back to active.
 </p>
 </div>

 {archived.length === 0 ? (
 <div className="text-center py-16 bg-card dark:bg-card rounded-xl">
 <Archive className="w-12 h-12 mx-auto text-muted-foreground/60 dark:text-foreground mb-3" />
 <p className="text-muted-foreground dark:text-muted-foreground">
 Nothing in the archive yet. Mark a goal finished or cancelled to put it here.
 </p>
 </div>
 ) : (
 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
 {archived.map((goal) => (
 <ArchivedCard key={goal.id} goal={goal} onRestore={() => handleRestore(goal.id)} />
 ))}
 </div>
 )}
 </div>
 );
};

const ArchivedCard: React.FC<{ goal: Goal; onRestore: () => void }> = ({ goal, onRestore }) => {
 const gradient = useGoalGradientClass(goal.id);
 return (
 <div className="bg-card dark:bg-card rounded-lg border border-border dark:border-border overflow-hidden opacity-90 hover:opacity-100 transition-opacity">
 <div className={`h-1.5 bg-gradient-to-r ${gradient} grayscale-[40%]`} />
 <div className="p-5">
 <div className="flex items-start justify-between mb-2">
 <Link href={`/goal/${goal.id}`} className="flex-1 min-w-0">
 <h3 className="text-base font-semibold text-foreground truncate">{goal.title}</h3>
 </Link>
 <span className={`text-xs px-2 py-0.5 rounded-full ${
 goal.status === StatusType.FINISHED
 ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
 : 'bg-muted dark:bg-card text-foreground dark:text-muted-foreground/60'
 }`}>
 {goal.status}
 </span>
 </div>
 {goal.description && (
 <p className="text-sm text-muted-foreground dark:text-muted-foreground line-clamp-2 mb-3">
 {stripMarkdown(goal.description)}
 </p>
 )}
 <div className="flex items-center justify-between text-xs text-muted-foreground dark:text-muted-foreground">
 <span>{goal.end_datetime ? `Closed ${formatDate(goal.end_datetime)}` : ''}</span>
 <button
 onClick={onRestore}
 className="flex items-center space-x-1 px-2 py-1 text-foreground dark:text-muted-foreground/60 border border-border dark:border-border rounded hover:bg-muted dark:hover:bg-card"
 >
 <RotateCcw className="w-3 h-3" />
 <span>Restore</span>
 </button>
 </div>
 </div>
 </div>
 );
};

export default withAuth(ArchivedGoalsPage);
