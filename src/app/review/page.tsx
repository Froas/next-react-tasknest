'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { withAuth } from '@/hoc/withAuth';
import {
 AuthRequiredError,
 dailyLogsApi,
 metricsApi,
 notesApi,
 todoOccurrencesApi,
 type DailyLogColor,
 type DailyLogItem,
 type NoteItem,
 type TodayMetricItem,
 type TodoOccurrenceItem,
} from '@/lib/api';
import { calculateGoalProgressLanes, calculateStructuralGoalProgress } from '@/lib/progress';
import { StatusType, type GoalItem, type TaskItem } from '@/lib/types';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { useStore } from '@/store/useStore';
import { buildCalendarItems, calendarDateKey, calendarItemHref, isCalendarItemActionable, parseCalendarDate } from '@/lib/calendarItems';
import { isRadarDue, radarBucket } from '@/lib/radar';
import {
 BriefcaseBusiness,
 CircleGauge,
 Radar,
 Repeat2,
 Target,
 type LucideIcon,
} from 'lucide-react';

const REVIEW_WINDOW_DAYS = 14;

type ReviewView = 'overview' | 'goals' | 'consistency' | 'workload' | 'radar';

const REVIEW_VIEWS: Array<{
 id: ReviewView;
 label: string;
 description: string;
 icon: LucideIcon;
}> = [
 { id: 'overview', label: 'Overview', description: 'System snapshot', icon: CircleGauge },
 { id: 'goals', label: 'Goals', description: 'Progress health', icon: Target },
 { id: 'consistency', label: 'Consistency', description: 'Routines and logs', icon: Repeat2 },
 { id: 'workload', label: 'Workload', description: 'Due and overdue', icon: BriefcaseBusiness },
 { id: 'radar', label: 'Radar', description: 'Signals and patterns', icon: Radar },
];

const pad = (value: number) => String(value).padStart(2, '0');

const dateKey = (date: Date) =>
 `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const addDays = (date: Date, days: number) => {
 const copy = new Date(date);
 copy.setDate(copy.getDate() + days);
 return copy;
};

const countBy = (items: NoteItem[], key: (item: NoteItem) => string | null | undefined) => {
 const counts = new Map<string, number>();
 items.forEach((item) => {
 const value = key(item)?.trim();
 if (!value) return;
 counts.set(value, (counts.get(value) ?? 0) + 1);
 });
 return Array.from(counts.entries())
 .map(([label, count]) => ({ label, count }))
 .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

const formatDate = (value: string) =>
 new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const formatPercent = (value: number) => `${Math.round(value)}%`;

const notesFilterHref = (params: Record<string, string>) => {
 const search = new URLSearchParams({ kind: 'signal', ...params });
 return `/notes?${search.toString()}`;
};

type DueWorkItem = {
 id: string;
 title: string;
 kind: string;
 href: string;
 dueKey: string | null;
 status: StatusType;
};

const inactiveStatuses = new Set<StatusType>([
 StatusType.FINISHED,
 StatusType.CLOSED,
 StatusType.ABORTED,
 StatusType.CANCELLED,
]);

const isActive = (item: { status: StatusType }) => !inactiveStatuses.has(item.status);
const isRoutineDone = (item: TodoOccurrenceItem) => item.status === 'done' || item.status === 'minimum';

const flattenGoalTasks = (goals: GoalItem[]) =>
 goals.flatMap((goal) => [
 ...(goal.tasks ?? []).map((task) => ({ ...task, goal_title: goal.title })),
 ...(goal.milestones ?? []).flatMap((milestone) =>
 (milestone.tasks ?? []).map((task) => ({
 ...task,
 goal_title: goal.title,
 milestone_title: milestone.title,
 })),
 ),
 ]);

const flattenGoalTodos = (tasks: TaskItem[]) =>
 tasks.flatMap((task) => (task.todos ?? []).map((todo) => ({ ...todo, task_title: task.title })));

const ReviewPage: React.FC = () => {
 useDocumentTitle('Review');
 const goals = useStore((state) => state.goals);
 const storeTasks = useStore((state) => state.tasks);
 const storeTodos = useStore((state) => state.todos);
 const events = useStore((state) => state.events);
 const fetchGoals = useStore((state) => state.fetchGoals);
 const fetchEvents = useStore((state) => state.fetchEvents);
 const [notes, setNotes] = useState<NoteItem[]>([]);
 const [dailyLogs, setDailyLogs] = useState<DailyLogItem[]>([]);
 const [occurrences, setOccurrences] = useState<TodoOccurrenceItem[]>([]);
 const [todayOccurrences, setTodayOccurrences] = useState<TodoOccurrenceItem[]>([]);
 const [todayMetrics, setTodayMetrics] = useState<TodayMetricItem[]>([]);
 const [loading, setLoading] = useState(true);
 const [reviewLoading, setReviewLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [activeView, setActiveView] = useState<ReviewView>('overview');

 const today = useMemo(() => new Date(), []);
 const todayKey = dateKey(today);
 const reviewStartKey = dateKey(addDays(today, -(REVIEW_WINDOW_DAYS - 1)));
 const reviewEndKey = todayKey;
 const upcomingEndKey = dateKey(addDays(today, 6));

 useEffect(() => {
 let cancelled = false;
 (async () => {
 try {
 const rows = await notesApi.getAll();
 if (!cancelled) setNotes(rows);
 } catch (err) {
 if (err instanceof AuthRequiredError) return;
 if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load review');
 } finally {
 if (!cancelled) setLoading(false);
 }
 })();
 return () => {
 cancelled = true;
 };
 }, []);

 useEffect(() => {
 fetchGoals();
 fetchEvents();
 }, [fetchEvents, fetchGoals]);

 useEffect(() => {
 let cancelled = false;
 (async () => {
 try {
 const [logs, routineHistory, todayRoutines, metrics] = await Promise.all([
 dailyLogsApi.list({ startDate: reviewStartKey, endDate: reviewEndKey }),
 todoOccurrencesApi.history({ startDate: reviewStartKey, endDate: reviewEndKey }),
 todoOccurrencesApi.today(todayKey),
 metricsApi.today(todayKey),
 ]);
 if (!cancelled) {
 setDailyLogs(logs);
 setOccurrences(routineHistory);
 setTodayOccurrences(todayRoutines);
 setTodayMetrics(metrics);
 }
 } catch (err) {
 if (err instanceof AuthRequiredError) return;
 if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load review data');
 } finally {
 if (!cancelled) setReviewLoading(false);
 }
 })();
 return () => {
 cancelled = true;
 };
 }, [reviewEndKey, reviewStartKey, todayKey]);

 const relationLabels = useMemo(() => {
 const labels = new Map<string, { label: string; href: string }>();
 goals.forEach((goal) => {
 labels.set(`goal:${goal.id}`, { label: `Goal · ${goal.title}`, href: `/goal/${goal.id}` });
 (goal.tasks ?? []).forEach((task) => {
 labels.set(`task:${task.id}`, { label: `Routine · ${goal.title} / ${task.title}`, href: `/task/${task.id}` });
 });
 (goal.milestones ?? []).forEach((milestone) => {
 milestone.tasks.forEach((task) => {
 labels.set(`task:${task.id}`, {
 label: `Task · ${goal.title} / ${milestone.title} / ${task.title}`,
 href: `/task/${task.id}`,
 });
 });
 });
 });
 return labels;
 }, [goals]);

 const signals = useMemo(
 () => notes.filter((note) => note.kind === 'signal').sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
 [notes],
 );
 const regularNotes = notes.filter((note) => note.kind !== 'signal');
 const sourceCounts = countBy(signals, (note) => note.source);
 const tagCounts = countBy(signals, (note) => note.tag);
 const relationCounts = countBy(signals, (note) => {
 if (note.task_id) return relationLabels.get(`task:${note.task_id}`)?.label ?? 'Linked task';
 if (note.goal_id) return relationLabels.get(`goal:${note.goal_id}`)?.label ?? 'Linked goal';
 return null;
 });
 const linkedSignals = signals.filter((note) => note.goal_id || note.task_id).length;
 const recentSignals = signals.slice(0, 12);
 const radarCounts = signals.reduce<Record<string, number>>((acc, signal) => {
 const bucket = radarBucket(signal);
 acc[bucket] = (acc[bucket] ?? 0) + 1;
 return acc;
 }, {});
 const dueSignals = signals.filter((signal) => isRadarDue(signal, todayKey));
 const allTasks = useMemo(() => flattenGoalTasks(goals), [goals]);
 const allTodos = useMemo(() => flattenGoalTodos(allTasks), [allTasks]);
 const activeGoals = goals.filter(isActive);
 const activeTasks = allTasks.filter(isActive);
 const routineTasks = activeTasks.filter((task) => task.kind === 'routine');
 const recurringTodos = allTodos.filter((todo) => todo.repeat_interval);
 const completedTodayOccurrences = todayOccurrences.filter(isRoutineDone);
 const completedWindowOccurrences = occurrences.filter(isRoutineDone);
 const routineAdherence = occurrences.length > 0
 ? (completedWindowOccurrences.length / occurrences.length) * 100
 : 0;
 const averageGoalProgress = activeGoals.length > 0
 ? activeGoals.reduce((sum, goal) => sum + calculateStructuralGoalProgress(goal), 0) / activeGoals.length
 : 0;
 const metricLoggedCount = todayMetrics.filter((metric) =>
 metric.value?.trim() || metric.numeric_value !== null && metric.numeric_value !== undefined,
 ).length;
 const dailyLogColors = dailyLogs.reduce<Record<DailyLogColor | 'unset', number>>((acc, log) => {
 const key = log.color ?? 'unset';
 acc[key] = (acc[key] ?? 0) + 1;
 return acc;
 }, { green: 0, yellow: 0, red: 0, black: 0, unset: 0 });
 const dueWork: DueWorkItem[] = buildCalendarItems(goals, storeTasks, storeTodos, events)
 .filter(isCalendarItemActionable)
 .map((item) => ({
 id: item.id,
 title: item.title,
 kind: item.itemType,
 href: calendarItemHref(item),
 dueKey: calendarDateKey(parseCalendarDate(item.due_date)),
 status: item.status,
 }));
 const overdueWork = dueWork.filter((item) => item.dueKey! < todayKey);
 const todayWork = dueWork.filter((item) => item.dueKey === todayKey);
 const upcomingEvents = events.filter((event) => {
 if (!event.start_datetime) return false;
 const key = dateKey(new Date(event.start_datetime));
 return key >= todayKey && key <= upcomingEndKey;
 }).length;
 const topGoals = [...activeGoals]
 .sort((a, b) => calculateStructuralGoalProgress(a) - calculateStructuralGoalProgress(b))
 .slice(0, 5);

 return (
 <div className="page">
 <div className="page-head">
 <div className="page-eyebrow">System Review</div>
 <h1 className="page-title">Review</h1>
 <p className="page-lede">
 See overall progress, routine consistency, daily logs, and radar signals in one place.
 </p>
 </div>

 {error && (
 <div className="mb-4 rounded-xl border p-4 text-sm" style={{ borderColor: 'var(--tn-bad)', color: 'var(--tn-bad)' }}>
 {error}
 </div>
 )}

 <nav className="mb-6 overflow-x-auto pb-1" aria-label="Review sections">
 <div
 className="flex min-w-max gap-2 rounded-2xl border p-2"
 style={{ border: 'var(--tn-line)', background: 'var(--tn-card)' }}
 >
 {REVIEW_VIEWS.map((view) => {
 const Icon = view.icon;
 const active = activeView === view.id;
 return (
 <button
 key={view.id}
 type="button"
 onClick={() => setActiveView(view.id)}
 aria-current={active ? 'page' : undefined}
 className="flex min-w-[148px] items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors"
 style={{
 border: active ? 'var(--tn-line-strong, var(--tn-line))' : '1px solid transparent',
 background: active ? 'var(--tn-accent)' : 'transparent',
 color: active ? 'var(--tn-on-accent)' : 'var(--tn-fg)',
 }}
 >
 <Icon className="h-4 w-4 shrink-0" style={{ color: active ? 'var(--tn-on-accent)' : 'var(--tn-fg-muted)' }} />
 <span>
 <span className="block text-sm font-semibold">{view.label}</span>
 <span
 className="block text-xs"
 style={{ color: active ? 'var(--tn-on-accent)' : 'var(--tn-fg-muted)', opacity: active ? 0.78 : 1 }}
 >
 {view.description}
 </span>
 </span>
 </button>
 );
 })}
 </div>
 </nav>

 {activeView === 'radar' && (
 <div className="section">
 <div className="section-head">
 <h2>Radar Workflow</h2>
 <Link href="/radar" className="btn btn-secondary !px-3 !py-2 text-xs">
 Open Radar
 </Link>
 </div>
 <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
 {[
 ['Inbox', radarCounts.inbox ?? 0],
 ['Watch', radarCounts.watch ?? 0],
 ['Test', radarCounts.test ?? 0],
 ['Act', radarCounts.act ?? 0],
 ['Due', dueSignals.length],
 ['Done', (radarCounts.done ?? 0) + (radarCounts.ignored ?? 0)],
 ].map(([label, value]) => (
 <div key={String(label)} className="card !p-4">
 <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
 <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
 </div>
 ))}
 </div>
 </div>
 )}

 {activeView === 'overview' && (
 <div className="section">
 <div className="stats">
 <ReviewSummaryStat label="Active goals" value={reviewLoading ? '…' : activeGoals.length} detail={`${goals.length} total goals`} />
 <ReviewSummaryStat label="Avg progress" value={reviewLoading ? '…' : formatPercent(averageGoalProgress)} detail="structural progress" />
 <ReviewSummaryStat label="Routines today" value={reviewLoading ? '…' : `${completedTodayOccurrences.length}/${todayOccurrences.length}`} detail={`${routineTasks.length} routine tasks · ${recurringTodos.length} definitions`} />
 <ReviewSummaryStat label="Due work" value={reviewLoading ? '…' : overdueWork.length} detail={`${todayWork.length} today · ${upcomingEvents} events soon`} />
 </div>
 </div>
 )}

 {activeView === 'consistency' && (
 <div className="section">
 <div className="section-head">
 <h2>General Review</h2>
 <span className="count">last {REVIEW_WINDOW_DAYS} days</span>
 </div>
 <div className="grid gap-4 lg:grid-cols-3">
 <ReviewCard
 title="Routine consistency"
 value={occurrences.length ? formatPercent(routineAdherence) : '—'}
 detail={`${completedWindowOccurrences.length}/${occurrences.length} routine occurrences completed/minimum`}
 progress={occurrences.length ? routineAdherence : null}
 />
 <ReviewCard
 title="Daily logs"
 value={`${dailyLogs.length}/${REVIEW_WINDOW_DAYS}`}
 detail={`${dailyLogColors.green} good · ${dailyLogColors.yellow} minimum · ${dailyLogColors.red} bad`}
 progress={(dailyLogs.length / REVIEW_WINDOW_DAYS) * 100}
 />
 <ReviewCard
 title="Metrics today"
 value={`${metricLoggedCount}/${todayMetrics.length}`}
 detail="metrics filled on Today"
 progress={todayMetrics.length ? (metricLoggedCount / todayMetrics.length) * 100 : null}
 />
 </div>
 </div>
 )}

 {activeView === 'goals' && (
 <div className="section">
 <div className="section-head">
 <h2>Goal Health</h2>
 <Link href="/goal" className="btn btn-secondary !px-3 !py-2 text-xs">
 Open goals
 </Link>
 </div>
 {topGoals.length === 0 ? (
 <div className="card text-sm text-muted-foreground">No active goals to review yet.</div>
 ) : (
 <div className="grid gap-3 lg:grid-cols-2">
 {topGoals.map((goal) => (
 <GoalReviewRow key={goal.id} goal={goal} />
 ))}
 </div>
 )}
 </div>
 )}

 {activeView === 'workload' && (
 <div className="section">
 <div className="section-head">
 <h2>Work Pressure</h2>
 <Link href="/" className="btn btn-secondary !px-3 !py-2 text-xs">
 Open Today
 </Link>
 </div>
 <div className="grid items-start gap-4 lg:grid-cols-2">
 <DueWorkCard title="Overdue" rows={overdueWork.slice(0, 8)} empty="No overdue work. Nice." />
 <DueWorkCard title="Due today" rows={todayWork.slice(0, 8)} empty="Nothing due today." />
 </div>
 </div>
 )}

 {activeView === 'radar' && (
 <div className="section">
 <div className="stats">
 <ReviewSummaryStat label="Signals" value={loading ? '…' : signals.length} detail="captured radar items" />
 <ReviewSummaryStat label="Linked" value={loading ? '…' : linkedSignals} detail="connected to goal/task" />
 <ReviewSummaryStat label="Sources" value={loading ? '…' : sourceCounts.length} detail="places signals came from" />
 <ReviewSummaryStat label="Notes" value={loading ? '…' : regularNotes.length} detail="non-signal notes" />
 </div>
 </div>
 )}

 {activeView === 'radar' && (
 <>
 <div className="section">
 <div className="section-head">
 <h2>Radar Map</h2>
 <Link href="/radar" className="btn btn-secondary !px-3 !py-2 text-xs">
 Open Radar
 </Link>
 </div>
 <RadarGraph sourceCounts={sourceCounts} tagCounts={tagCounts} relationCounts={relationCounts} />
 </div>

 <div className="section">
 <div className="section-head">
 <h2>Signal Patterns</h2>
 <Link href="/notes" className="btn btn-secondary !px-3 !py-2 text-xs">
 Open notes
 </Link>
 </div>
 <div className="grid gap-4 lg:grid-cols-2">
 <PatternCard
 title="By source"
 rows={sourceCounts}
 empty="No signal sources yet."
 hrefForRow={(label) => notesFilterHref({ source: label })}
 />
 <PatternCard
 title="By tag"
 rows={tagCounts}
 empty="No signal tags yet."
 hrefForRow={(label) => notesFilterHref({ tag: label })}
 />
 </div>
 </div>

 <div className="section">
 <div className="section-head">
 <h2>Recent Signals</h2>
 </div>
 {loading ? (
 <div className="card text-sm text-muted-foreground">Loading radar…</div>
 ) : recentSignals.length === 0 ? (
 <div className="card">
 <h3 className="mb-2 text-base font-semibold text-foreground">No signals yet</h3>
 <p className="mb-4 text-sm text-muted-foreground">
 Use Today → Quick Capture → Signal when something feels repeated, odd, useful, or worth tracking.
 </p>
 <Link href="/" className="btn btn-primary !px-3 !py-2 text-xs">
 Capture from Today
 </Link>
 </div>
 ) : (
 <div className="grid gap-3 lg:grid-cols-2">
 {recentSignals.map((signal) => {
 const relation = signal.task_id
 ? relationLabels.get(`task:${signal.task_id}`)
 : signal.goal_id
 ? relationLabels.get(`goal:${signal.goal_id}`)
 : null;
 return (
 <article
 key={signal.id}
 className="rounded-2xl border p-4"
 style={{ border: 'var(--tn-line)', background: 'var(--tn-card)' }}
 >
 <div className="mb-2 flex flex-wrap items-center gap-2">
 <span className="pill" style={{ borderColor: 'var(--tn-accent)', color: 'var(--tn-accent)' }}>
 signal
 </span>
 {signal.tag && <span className="pill">{signal.tag}</span>}
 {signal.source && <span className="pill">src: {signal.source}</span>}
 <span className="ml-auto text-xs text-muted-foreground">{formatDate(signal.updated_at)}</span>
 </div>
 <h3 className="mb-1 text-sm font-semibold text-foreground">{signal.title}</h3>
 {signal.body && (
 <p className="mb-3 line-clamp-3 text-sm text-muted-foreground">
 {signal.body}
 </p>
 )}
 <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
 {relation ? (
 <Link href={relation.href} className="hover:underline" style={{ color: 'var(--tn-accent)' }}>
 {relation.label}
 </Link>
 ) : (
 <span className="text-muted-foreground">No linked goal/task</span>
 )}
 <Link href={`/radar?view=${radarBucket(signal)}&signal=${signal.id}`} className="hover:underline" style={{ color: 'var(--tn-accent)' }}>
 Process signal →
 </Link>
 </div>
 </article>
 );
 })}
 </div>
 )}
 </div>
 </>
 )}
 </div>
 );
};

const ReviewSummaryStat: React.FC<{
 label: string;
 value: React.ReactNode;
 detail: string;
}> = ({ label, value, detail }) => (
 <div className="stat">
 <div className="s-label">{label}</div>
 <div className="s-value">{value}</div>
 <div className="s-delta">{detail}</div>
 </div>
);

const RadarGraph: React.FC<{
 sourceCounts: Array<{ label: string; count: number }>;
 tagCounts: Array<{ label: string; count: number }>;
 relationCounts: Array<{ label: string; count: number }>;
}> = ({ sourceCounts, tagCounts, relationCounts }) => {
 const nodes = [
 ...sourceCounts.slice(0, 4).map((row, index) => ({
 id: `source:${row.label}`,
 label: row.label,
 count: row.count,
 href: notesFilterHref({ source: row.label }),
 x: 18,
 y: 24 + index * 15,
 tone: 'source',
 })),
 ...tagCounts.slice(0, 4).map((row, index) => ({
 id: `tag:${row.label}`,
 label: row.label,
 count: row.count,
 href: notesFilterHref({ tag: row.label }),
 x: 82,
 y: 24 + index * 15,
 tone: 'tag',
 })),
 ...relationCounts.slice(0, 3).map((row, index) => ({
 id: `relation:${row.label}`,
 label: row.label,
 count: row.count,
 href: notesFilterHref({}),
 x: 38 + index * 12,
 y: 82,
 tone: 'relation',
 })),
 ];

 if (nodes.length === 0) {
 return (
 <div className="card">
 <p className="text-sm text-muted-foreground">
 Capture signals from Today first; the map will show repeated sources, tags, and linked goals.
 </p>
 </div>
 );
 }

 return (
 <div className="card relative min-h-[320px] overflow-hidden">
 <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
 {nodes.map((node) => (
 <line
 key={node.id}
 x1="50"
 y1="48"
 x2={node.x}
 y2={node.y}
 stroke="var(--tn-line-strong, var(--tn-fg-muted))"
 strokeOpacity="0.26"
 strokeWidth="0.35"
 />
 ))}
 </svg>
 <div
 className="absolute left-1/2 top-[48%] z-10 -translate-x-1/2 -translate-y-1/2 rounded-2xl border px-5 py-4 text-center shadow-sm"
 style={{ border: 'var(--tn-line)', background: 'var(--tn-card)', color: 'var(--tn-fg)' }}
 >
 <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Radar</div>
 <div className="text-2xl font-bold">{nodes.reduce((sum, node) => sum + node.count, 0)}</div>
 <div className="text-xs text-muted-foreground">signal links</div>
 </div>
 {nodes.map((node) => (
 <Link
 key={node.id}
 href={node.href}
 className="absolute z-20 max-w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border px-3 py-2 text-sm shadow-sm transition-transform hover:scale-[1.02]"
 style={{
 left: `${node.x}%`,
 top: `${node.y}%`,
 border: 'var(--tn-line)',
 background:
 node.tone === 'source'
 ? 'color-mix(in srgb, var(--tn-card) 80%, var(--tn-accent) 8%)'
 : node.tone === 'tag'
 ? 'color-mix(in srgb, var(--tn-card) 82%, var(--tn-good) 8%)'
 : 'color-mix(in srgb, var(--tn-card) 82%, var(--tn-warn, #d69c2f) 10%)',
 color: 'var(--tn-fg)',
 }}
 >
 <div className="truncate font-semibold">{node.label}</div>
 <div className="text-xs text-muted-foreground">{node.count} signal{node.count === 1 ? '' : 's'}</div>
 </Link>
 ))}
 </div>
 );
};

const PatternCard: React.FC<{
 title: string;
 rows: Array<{ label: string; count: number }>;
 empty: string;
 hrefForRow?: (label: string) => string;
}> = ({
 title,
 rows,
 empty,
 hrefForRow,
}) => (
 <div className="card">
 <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
 {rows.length === 0 ? (
 <p className="text-sm text-muted-foreground">{empty}</p>
 ) : (
 <div className="space-y-2">
 {rows.slice(0, 8).map((row) => (
 <div key={row.label}>
 <div className="mb-1 flex items-center justify-between gap-3 text-sm">
 {hrefForRow ? (
 <Link href={hrefForRow(row.label)} className="truncate text-foreground hover:underline">
 {row.label}
 </Link>
 ) : (
 <span className="truncate text-foreground">{row.label}</span>
 )}
 <span className="font-semibold text-foreground">{row.count}</span>
 </div>
 <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--tn-hover)' }}>
 <div
 className="h-full rounded-full"
 style={{
 width: `${Math.max(10, Math.min(100, row.count * 20))}%`,
 background: 'var(--tn-accent)',
 }}
 />
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
);

const ReviewCard: React.FC<{
 title: string;
 value: string;
 detail: string;
 progress: number | null;
}> = ({ title, value, detail, progress }) => (
 <div className="card">
 <div className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
 <div className="mb-1 text-3xl font-bold text-foreground">{value}</div>
 <p className="mb-3 text-sm text-muted-foreground">{detail}</p>
 {progress !== null && (
 <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--tn-hover)' }}>
 <div
 className="h-full rounded-full"
 style={{
 width: `${Math.max(0, Math.min(100, progress))}%`,
 background: 'var(--tn-accent)',
 }}
 />
 </div>
 )}
 </div>
);

const GoalReviewRow: React.FC<{ goal: GoalItem }> = ({ goal }) => {
 const lanes = calculateGoalProgressLanes(goal);
 const structural = lanes.find((lane) => lane.id === 'structural');
 const outcome = lanes.find((lane) => lane.id === 'outcome');
 const consistency = lanes.find((lane) => lane.id === 'consistency');

 return (
 <Link
 href={`/goal/${goal.id}`}
 className="rounded-2xl border p-4 transition-transform hover:scale-[1.01]"
 style={{ border: 'var(--tn-line)', background: 'var(--tn-card)', color: 'var(--tn-fg)' }}
 >
 <div className="mb-2 flex items-start justify-between gap-3">
 <div>
 <h3 className="text-base font-semibold text-foreground">{goal.title}</h3>
 {goal.description && (
 <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{goal.description}</p>
 )}
 </div>
 <span className="pill">{goal.status}</span>
 </div>
 <div className="mb-3 h-2 overflow-hidden rounded-full" style={{ background: 'var(--tn-hover)' }}>
 <div
 className="h-full rounded-full"
 style={{
 width: `${Math.max(0, Math.min(100, structural?.value ?? 0))}%`,
 background: 'var(--tn-accent)',
 }}
 />
 </div>
 <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
 <span>Structural · {structural?.value === null || structural?.value === undefined ? '—' : formatPercent(structural.value)}</span>
 <span>Outcome · {outcome?.value === null || outcome?.value === undefined ? '—' : formatPercent(outcome.value)}</span>
 <span>Consistency · {consistency?.value === null || consistency?.value === undefined ? '—' : formatPercent(consistency.value)}</span>
 </div>
 </Link>
 );
};

const DueWorkCard: React.FC<{
 title: string;
 rows: Array<{ id: string; title: string; kind: string; href: string; dueKey: string | null }>;
 empty: string;
}> = ({ title, rows, empty }) => (
 <div className="card">
 <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
 {rows.length === 0 ? (
 <p className="text-sm text-muted-foreground">{empty}</p>
 ) : (
 <div className="space-y-2">
 {rows.map((row) => (
 <Link
 key={`${row.kind}:${row.id}`}
 href={row.href}
 className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm hover:shadow-sm"
 style={{ border: 'var(--tn-line)', background: 'var(--tn-surface-2, var(--tn-card))', color: 'var(--tn-fg)' }}
 >
 <span className="min-w-0">
 <span className="block truncate font-medium">{row.title}</span>
 <span className="text-xs text-muted-foreground">{row.kind}</span>
 </span>
 <span className="shrink-0 text-xs text-muted-foreground">{row.dueKey}</span>
 </Link>
 ))}
 </div>
 )}
 </div>
);

export default withAuth(ReviewPage);
