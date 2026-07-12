'use client';

import Link from 'next/link';
import React, { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { withAuth } from '@/hoc/withAuth';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { ActivityHeatmap } from '@/components/dashboard/ActivityHeatmap';
import { collectRecentActivity, ActivityKind } from '@/lib/recentActivity';
import { AuthRequiredError, TodoOccurrenceItem, TodoOccurrenceStatus, todoOccurrencesApi } from '@/lib/api';
import { toast } from '@/store/useToast';
import { AlertCircle, CheckCircle2, CircleDashed, ShieldCheck } from 'lucide-react';

const KIND_TONES: Record<ActivityKind, string> = {
 Goal: 'var(--tn-accent)',
 Milestone: 'var(--tn-plum, #8a6594)',
 Task: 'var(--tn-good, #2f7d50)',
 Subtask: 'var(--tn-slate, #5a6f8c)',
 Todo: 'var(--tn-warn, #c8932a)',
};

const badgeStyle = (kind: ActivityKind): CSSProperties => {
 const tone = KIND_TONES[kind];
 return {
 background: `color-mix(in srgb, ${tone} 12%, var(--tn-card))`,
 color: tone,
 };
};

type HistoryStatusFilter = 'all' | Exclude<TodoOccurrenceStatus, 'open'>;

const HISTORY_STATUSES: Exclude<TodoOccurrenceStatus, 'open'>[] = ['done', 'minimum', 'skipped', 'missed', 'excused'];

const statusTone: Record<Exclude<TodoOccurrenceStatus, 'open'>, string> = {
 done: 'var(--tn-good, #2f7d50)',
 minimum: 'var(--tn-warn, #c8932a)',
 skipped: 'var(--tn-fg-muted)',
 missed: 'var(--tn-bad, #c25d63)',
 excused: 'var(--tn-accent)',
};

const historyBadgeStyle = (status: Exclude<TodoOccurrenceStatus, 'open'>): CSSProperties => {
 const tone = statusTone[status];
 return {
 background: `color-mix(in srgb, ${tone} 12%, var(--tn-card))`,
 color: tone,
 borderColor: `color-mix(in srgb, ${tone} 35%, transparent)`,
 };
};

const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

const defaultHistoryStart = () => {
 const date = new Date();
 date.setDate(date.getDate() - 30);
 return toDateInput(date);
};

const occurrenceHref = (item: TodoOccurrenceItem) => {
 if (item.goal_id) return `/goal/${item.goal_id}`;
 if (item.task_id) return `/task/${item.task_id}`;
 return '/todo';
};

const ActivityPage: React.FC = () => {
 useDocumentTitle('Activity');

 const goals = useStore((s) => s.goals);
 const { fetchGoals } = useStore(useShallow((s) => ({ fetchGoals: s.fetchGoals })));
 const [history, setHistory] = useState<TodoOccurrenceItem[]>([]);
 const [historyLoading, setHistoryLoading] = useState(true);
 const [historyStatus, setHistoryStatus] = useState<HistoryStatusFilter>('all');
 const [historyStart, setHistoryStart] = useState(defaultHistoryStart);
 const [historyEnd, setHistoryEnd] = useState(() => toDateInput(new Date()));
 const [busyOccurrenceId, setBusyOccurrenceId] = useState<string | null>(null);

 useEffect(() => {
 fetchGoals();
 }, [fetchGoals]);

 useEffect(() => {
 let cancelled = false;
 const loadHistory = async () => {
 setHistoryLoading(true);
 try {
 const statuses = historyStatus === 'all' ? HISTORY_STATUSES : [historyStatus];
 const rows = await todoOccurrencesApi.history({
 startDate: historyStart,
 endDate: historyEnd,
 statuses,
 });
 if (!cancelled) setHistory(rows);
 } catch (error) {
 if (error instanceof AuthRequiredError) return;
 console.error('Failed to load routine history:', error);
 toast.error('Failed to load routine history');
 } finally {
 if (!cancelled) setHistoryLoading(false);
 }
 };
 void loadHistory();
 return () => {
 cancelled = true;
 };
 }, [historyEnd, historyStart, historyStatus]);

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

 const historyByDay = useMemo(() => {
 const groups = new Map<string, TodoOccurrenceItem[]>();
 for (const item of history) {
 const arr = groups.get(item.date) ?? [];
 arr.push(item);
 groups.set(item.date, arr);
 }
 return Array.from(groups.entries()).sort(([a], [b]) => b.localeCompare(a));
 }, [history]);

 const updateOccurrenceStatus = async (item: TodoOccurrenceItem, status: TodoOccurrenceStatus) => {
 const previous = history;
 setBusyOccurrenceId(item.id);
 setHistory((current) => current.map((row) => (row.id === item.id ? { ...row, status } : row)));
 try {
 const updated = await todoOccurrencesApi.update({ id: item.id, status });
 setHistory((current) => current.map((row) => (row.id === updated.id ? updated : row)));
 void fetchGoals({ force: true, silent: true });
 toast.success(status === 'excused' ? 'Marked as excused' : 'Routine history updated');
 } catch (error) {
 setHistory(previous);
 console.error('Failed to update occurrence history:', error);
 toast.error('Failed to update routine history');
 } finally {
 setBusyOccurrenceId(null);
 }
 };

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

 <div className="mb-8 rounded-xl border border-border bg-card p-6 dark:border-border dark:bg-card">
 <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
 <div>
 <h2 className="text-lg font-semibold text-foreground">Routine history</h2>
 <p className="text-sm text-muted-foreground dark:text-muted-foreground">
 Finalized daily routine outcomes. Missed items stay as history, not overdue backlog.
 </p>
 </div>
 <div className="grid gap-2 sm:grid-cols-3 lg:w-auto">
 <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">
 From
 <input
 type="date"
 value={historyStart}
 onChange={(event) => setHistoryStart(event.target.value)}
 className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm normal-case tracking-normal text-foreground"
 />
 </label>
 <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">
 To
 <input
 type="date"
 value={historyEnd}
 onChange={(event) => setHistoryEnd(event.target.value)}
 className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm normal-case tracking-normal text-foreground"
 />
 </label>
 <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">
 Status
 <select
 value={historyStatus}
 onChange={(event) => setHistoryStatus(event.target.value as HistoryStatusFilter)}
 className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm normal-case tracking-normal text-foreground"
 >
 <option value="all">All finalized</option>
 {HISTORY_STATUSES.map((status) => (
 <option key={status} value={status}>{status}</option>
 ))}
 </select>
 </label>
 </div>
 </div>

 {historyLoading ? (
 <div className="rounded-lg bg-muted px-4 py-8 text-center text-sm text-muted-foreground dark:bg-card/40 dark:text-muted-foreground">
 Loading routine history…
 </div>
 ) : historyByDay.length === 0 ? (
 <div className="rounded-lg bg-muted px-4 py-8 text-center text-sm text-muted-foreground dark:bg-card/40 dark:text-muted-foreground">
 No finalized routine outcomes in this range yet.
 </div>
 ) : (
 <ol className="space-y-5">
 {historyByDay.map(([day, items]) => (
 <li key={day}>
 <div className="mb-2 flex items-center justify-between text-sm font-semibold text-foreground">
 <span>{new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
 <span className="text-xs text-muted-foreground dark:text-muted-foreground">{items.length} routine{items.length === 1 ? '' : 's'}</span>
 </div>
 <ul className="space-y-1.5">
 {items.map((item) => {
 const finalizedStatus = item.status === 'open' ? 'skipped' : item.status;
 const isMissed = item.status === 'missed';
 const isExcused = item.status === 'excused';
 return (
 <li
 key={item.id}
 className="flex flex-col gap-3 rounded-lg border border-border bg-muted px-3 py-3 dark:border-border dark:bg-card/40 sm:flex-row sm:items-center"
 >
 <div className="flex min-w-0 flex-1 items-start gap-3">
 <span className="mt-0.5 flex-shrink-0" style={{ color: statusTone[finalizedStatus as Exclude<TodoOccurrenceStatus, 'open'>] }}>
 {isExcused ? <ShieldCheck className="h-4 w-4" /> : isMissed ? <AlertCircle className="h-4 w-4" /> : <CircleDashed className="h-4 w-4" />}
 </span>
 <div className="min-w-0">
 <Link href={occurrenceHref(item)} className="block truncate text-sm font-medium text-foreground hover:underline">
 {item.todo_title}
 </Link>
 <div className="truncate text-xs text-muted-foreground dark:text-muted-foreground">
 {[item.goal_title, item.milestone_title, item.task_title].filter(Boolean).join(' · ') || 'Unlinked routine'}
 </div>
 </div>
 </div>
 <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
 <span className="rounded-full border px-2 py-0.5 text-xs font-medium" style={historyBadgeStyle(finalizedStatus as Exclude<TodoOccurrenceStatus, 'open'>)}>
 {item.status}
 </span>
 {isMissed && (
 <button
 type="button"
 onClick={() => void updateOccurrenceStatus(item, 'excused')}
 disabled={busyOccurrenceId === item.id}
 className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-background disabled:opacity-50"
 >
 Mark excused
 </button>
 )}
 {isExcused && (
 <button
 type="button"
 onClick={() => void updateOccurrenceStatus(item, 'missed')}
 disabled={busyOccurrenceId === item.id}
 className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-background disabled:opacity-50"
 >
 Undo excuse
 </button>
 )}
 </div>
 </li>
 );
 })}
 </ul>
 </li>
 ))}
 </ol>
 )}
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
 <span className="text-xs px-2 py-0.5 rounded-full" style={badgeStyle(item.kind)}>
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
