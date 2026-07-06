'use client';

import React, { useEffect, useMemo } from 'react';
import { withAuth } from '@/hoc/withAuth';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { ActivityHeatmap } from '@/components/dashboard/ActivityHeatmap';
import { collectRecentActivity, ActivityKind } from '@/lib/recentActivity';
import { CheckCircle2 } from 'lucide-react';

const KIND_TONES: Record<ActivityKind, string> = {
 Goal: 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40',
 Milestone: 'text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/40',
 Task: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40',
 Subtask: 'text-cyan-700 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-900/40',
 Todo: 'text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/40',
};

const ActivityPage: React.FC = () => {
 useDocumentTitle('Activity');

 const goals = useStore((s) => s.goals);
 const { fetchGoals } = useStore(useShallow((s) => ({ fetchGoals: s.fetchGoals })));

 useEffect(() => {
 fetchGoals();
 }, [fetchGoals]);

 // Group full activity log by ISO date (YYYY-MM-DD) so we can render
 // a chronological journal underneath the heatmap.
 const activityByDay = useMemo(() => {
 const items = collectRecentActivity(goals, 500);
 const groups = new Map<string, typeof items>();
 for (const item of items) {
 const key = new Date(item.finishedAt).toDateString();
 const arr = groups.get(key) ?? [];
 arr.push(item);
 groups.set(key, arr);
 }
 return Array.from(groups.entries());
 }, [goals]);

 return (
 <div className="page">
 <div className="page-head">
 <div className="page-eyebrow">Insights</div>
 <h1 className="page-title">Activity</h1>
 <p className="page-lede">
 Everything you&apos;ve closed across the goal tree, day by day.
 </p>
 </div>

 <div className="mb-8">
 <ActivityHeatmap weeks={53} />
 </div>

 <div className="bg-card dark:bg-card rounded-xl border border-border dark:border-border p-6">
 <h2 className="text-lg font-semibold text-foreground mb-4">Journal</h2>
 {activityByDay.length === 0 ? (
 <p className="text-sm text-muted-foreground dark:text-muted-foreground text-center py-8">
 No completions yet — finish something to start your log.
 </p>
 ) : (
 <ol className="space-y-6">
 {activityByDay.map(([day, items]) => (
 <li key={day}>
 <div className="text-sm font-semibold text-foreground dark:text-muted-foreground/60 mb-2 flex items-center justify-between">
 <span>{new Date(day).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
 <span className="text-xs text-muted-foreground dark:text-muted-foreground">{items.length} item{items.length === 1 ? '' : 's'}</span>
 </div>
 <ul className="space-y-1.5 ml-1">
 {items.map((item) => (
 <li
 key={`${item.kind}-${item.id}-${item.finishedAt}`}
 className="flex items-start space-x-3 px-3 py-2 rounded-lg bg-muted dark:bg-card/40"
 >
 <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
 <div className="flex-1 min-w-0">
 <div className="text-sm font-medium text-foreground truncate">{item.title}</div>
 {(item.goalTitle || item.milestoneTitle || item.taskTitle) && (
 <div className="text-xs text-muted-foreground dark:text-muted-foreground truncate">
 {[item.goalTitle, item.milestoneTitle, item.taskTitle].filter(Boolean).join(' · ')}
 </div>
 )}
 </div>
 <div className="flex items-center space-x-2 flex-shrink-0">
 <span className={`text-xs px-2 py-0.5 rounded-full ${KIND_TONES[item.kind]}`}>
 {item.kind}
 </span>
 <span className="text-xs text-muted-foreground dark:text-muted-foreground hidden sm:inline">
 {new Date(item.finishedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
 </span>
 </div>
 </li>
 ))}
 </ul>
 </li>
 ))}
 </ol>
 )}
 </div>
 </div>
 );
};

export default withAuth(ActivityPage);
