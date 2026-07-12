'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { StatusType } from '@/lib/types';
import { buildCalendarItems, calendarItemHref, CalendarItem } from '@/lib/calendarItems';
import { tasksApi, todosApi, subtasksApi, milestonesApi, eventsApi } from '@/lib/api';
import { toast } from '@/store/useToast';
import { Calendar, AlertCircle, Clock, Clock4 } from 'lucide-react';
import { DailyDraftTodos } from './DailyDraftTodos';
import { DailyLogPanel } from './DailyLogPanel';
import { QuickNoteCapture } from './QuickNoteCapture';

// Computes the"what do I need to act on right now" set across the entire
// tree: anything with due_date that's overdue, today, or in the next 7 days
// and not already finished/cancelled.

const startOfDay = (d: Date) => {
 const x = new Date(d);
 x.setHours(0, 0, 0, 0);
 return x;
};

type ActionGroup = {
 key: string;
 title: string;
 goalId?: string;
 overdue: CalendarItem[];
 dueToday: CalendarItem[];
 dueThisWeek: CalendarItem[];
};

export const TodayWidget: React.FC = () => {
 const goals = useStore((s) => s.goals);
 const tasks = useStore((s) => s.tasks);
 const todos = useStore((s) => s.todos);
 const events = useStore((s) => s.events);
 const { updateTaskInGoals, updateTodoInGoals, updateSubtaskInGoals, updateMilestoneInGoals, updateEvent } = useStore(
 useShallow((s) => ({
 updateTaskInGoals: s.updateTaskInGoals,
 updateTodoInGoals: s.updateTodoInGoals,
 updateSubtaskInGoals: s.updateSubtaskInGoals,
 updateMilestoneInGoals: s.updateMilestoneInGoals,
 updateEvent: s.updateEvent,
 }))
 );

 const snooze = async (item: CalendarItem, days: number) => {
 const next = new Date();
 next.setHours(0, 0, 0, 0);
 next.setDate(next.getDate() + days);
 const isoDate = next.toISOString().split('T')[0];
 try {
 switch (item.itemType) {
 case 'Task': {
 const updated = await tasksApi.update({ id: item.id, due_date: isoDate });
 updateTaskInGoals(updated);
 break;
 }
 case 'Todo': {
 const updated = await todosApi.update({ id: item.id, due_date: isoDate });
 updateTodoInGoals(updated);
 break;
 }
 case 'Subtask': {
 const updated = await subtasksApi.update({ id: item.id, due_date: isoDate });
 updateSubtaskInGoals(updated);
 break;
 }
 case 'Milestone': {
 const updated = await milestonesApi.update({ id: item.id, due_date: isoDate });
 updateMilestoneInGoals(updated);
 break;
 }
 case 'Event': {
 const start = new Date();
 start.setDate(start.getDate() + days);
 const updated = await eventsApi.update({ id: item.id, start_datetime: start.toISOString() });
 updateEvent(updated);
 break;
 }
 default:
 toast.error('This item cannot be snoozed');
 return;
 }
 toast.success(`Snoozed for ${days === 1 ? 'a day' : `${days} days`}`);
 } catch (err) {
 console.error('Snooze failed:', err);
 toast.error('Failed to snooze');
 }
 };

 const buckets = useMemo(() => {
 const items = buildCalendarItems(goals, tasks, todos, events).filter(
 (i) => i.status !== StatusType.FINISHED && i.status !== StatusType.CANCELLED
 );
 const today = startOfDay(new Date());
 const tomorrow = new Date(today);
 tomorrow.setDate(tomorrow.getDate() + 1);
 const weekEnd = new Date(today);
 weekEnd.setDate(weekEnd.getDate() + 7);

 const overdue = [];
 const dueToday = [];
 const dueThisWeek = [];

 for (const item of items) {
 const due = startOfDay(new Date(item.due_date));
 if (due < today) overdue.push(item);
 else if (due.getTime() === today.getTime()) dueToday.push(item);
 else if (due < weekEnd) dueThisWeek.push(item);
 }

 overdue.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
 dueToday.sort((a, b) => a.title.localeCompare(b.title));
 dueThisWeek.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

 return { overdue, dueToday, dueThisWeek };
 }, [goals, tasks, todos, events]);

 const actionGroups = useMemo(() => {
 const map = new Map<string, ActionGroup>();
 const ensure = (item: CalendarItem) => {
 const key = item.goalId ?? item.goalTitle ?? 'unlinked';
 const existing = map.get(key);
 if (existing) return existing;
 const created: ActionGroup = {
 key,
 title: item.goalTitle ?? 'Unlinked',
 overdue: [],
 dueToday: [],
 dueThisWeek: [],
 };
 if (item.goalId) created.goalId = item.goalId;
 map.set(key, created);
 return created;
 };

 buckets.overdue.forEach((item) => ensure(item).overdue.push(item));
 buckets.dueToday.forEach((item) => ensure(item).dueToday.push(item));
 buckets.dueThisWeek.slice(0, 8).forEach((item) => ensure(item).dueThisWeek.push(item));

 return Array.from(map.values()).sort((a, b) => {
 const aUrgent = a.overdue.length + a.dueToday.length;
 const bUrgent = b.overdue.length + b.dueToday.length;
 if (aUrgent !== bUrgent) return bUrgent - aUrgent;
 return a.title.localeCompare(b.title);
 });
 }, [buckets]);

 const totalActionable = buckets.overdue.length + buckets.dueToday.length;

 return (
 <div id="today-dashboard" tabIndex={-1} className="card mb-6 scroll-mt-24 focus:outline-none">
 <div className="flex items-center justify-between mb-4">
 <div>
 <h3 className="text-lg font-semibold text-foreground">Today</h3>
 <p className="text-sm text-foreground dark:text-muted-foreground">
 {totalActionable === 0
 ? 'Nothing due today — focus on your goals.'
 : `${totalActionable} due/overdue item${totalActionable === 1 ? '' : 's'} need${totalActionable === 1 ? 's' : ''} attention`}
 </p>
 </div>
 <div className="flex items-center space-x-3">
 <Link
 href="/calendar"
 className="text-sm hover:underline"
 style={{ color: 'var(--tn-accent)' }}
 >
 Open calendar →
 </Link>
 </div>
 </div>

 <DailyLogPanel />
 <DailyDraftTodos />
 <QuickNoteCapture />

 {actionGroups.length > 0 && (
 <div className="mt-4">
 <div className="mb-2 flex items-center justify-between gap-2">
 <div className="flex items-center gap-2">
 <Clock className="h-4 w-4" style={{ color: 'var(--tn-accent)' }} />
 <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
 Due work by goal
 </h4>
 </div>
 <span className="text-xs text-muted-foreground dark:text-muted-foreground">
 {buckets.overdue.length} overdue · {buckets.dueToday.length} today
 </span>
 </div>
 <div className="grid gap-3 lg:grid-cols-2">
 {actionGroups.map((group) => (
 <GoalActionCard key={group.key} group={group} onSnooze={snooze} />
 ))}
 </div>
 </div>
 )}
 {totalActionable === 0 && buckets.dueThisWeek.length === 0 && (
 <div className="text-center py-6 text-muted-foreground dark:text-muted-foreground text-sm">
 You&apos;re all caught up.
 </div>
 )}
 </div>
 );
};

type Tone = 'overdue' | 'today' | 'upcoming';

const toneStyle = (tone: Tone): React.CSSProperties => {
 if (tone === 'overdue') {
 return {
 border: '1px solid color-mix(in srgb, var(--tn-bad, #c25d63) 42%, var(--tn-card))',
 background: 'color-mix(in srgb, var(--tn-bad, #c25d63) 8%, var(--tn-card))',
 };
 }
 if (tone === 'today') {
 return {
 border: '1px solid color-mix(in srgb, var(--tn-accent, #2563eb) 42%, var(--tn-card))',
 background: 'color-mix(in srgb, var(--tn-accent, #2563eb) 8%, var(--tn-card))',
 };
 }
 return {
 border: 'var(--tn-line)',
 background: 'var(--tn-card)',
 };
};

const GoalActionCard: React.FC<{
 group: ActionGroup;
 onSnooze: (item: CalendarItem, days: number) => void;
}> = ({ group, onSnooze }) => {
 const total = group.overdue.length + group.dueToday.length + group.dueThisWeek.length;
 return (
 <article className="rounded-2xl border p-3" style={{ border: 'var(--tn-line)', background: 'var(--tn-card)' }}>
 <div className="mb-3 flex items-start justify-between gap-2">
 <div>
 <h5 className="text-sm font-semibold text-foreground">
 {group.goalId ? (
 <Link href={`/goal/${group.goalId}`} className="hover:underline" style={{ color: 'inherit' }}>
 {group.title}
 </Link>
 ) : (
 group.title
 )}
 </h5>
 <p className="text-xs text-muted-foreground dark:text-muted-foreground">
 {total} item{total === 1 ? '' : 's'} · context preserved
 </p>
 </div>
 </div>
 <div className="space-y-3">
 {group.overdue.length > 0 && (
 <ActionBucket
 title="Overdue"
 icon={<AlertCircle className="h-4 w-4" style={{ color: 'var(--tn-bad, #c25d63)' }} />}
 tone="overdue"
 items={group.overdue}
 onSnooze={onSnooze}
 />
 )}
 {group.dueToday.length > 0 && (
 <ActionBucket
 title="Due today"
 icon={<Clock className="h-4 w-4" style={{ color: 'var(--tn-accent)' }} />}
 tone="today"
 items={group.dueToday}
 onSnooze={onSnooze}
 />
 )}
 {group.dueThisWeek.length > 0 && (
 <ActionBucket
 title="This week"
 icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
 tone="upcoming"
 items={group.dueThisWeek}
 />
 )}
 </div>
 </article>
 );
};

const ActionBucket: React.FC<{
 title: string;
 icon: React.ReactNode;
 tone: Tone;
 items: CalendarItem[];
 onSnooze?: (item: CalendarItem, days: number) => void;
}> = ({ title, icon, tone, items, onSnooze }) => (
 <section>
 <div className="mb-1 flex items-center gap-2">
 {icon}
 <h6 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
 {title}
 </h6>
 <span className="text-[11px] text-muted-foreground dark:text-muted-foreground">({items.length})</span>
 </div>
 <ul className="space-y-1">
 {items.map((item) => (
 <Row key={`${item.itemType}-${item.id}`} item={item} tone={tone} onSnooze={onSnooze} hideGoal />
 ))}
 </ul>
 </section>
);

interface RowProps {
 item: CalendarItem;
 tone: Tone;
 onSnooze?: (item: CalendarItem, days: number) => void;
 hideGoal?: boolean;
}

const Row: React.FC<RowProps> = ({ item, tone, onSnooze, hideGoal }) => (
 <li>
 <Link
 href={calendarItemHref(item)}
 className="flex items-center justify-between px-3 py-2 rounded-lg border group transition-transform hover:-translate-y-0.5 hover:shadow-sm"
 style={toneStyle(tone)}
 >
 <div className="flex-1 min-w-0">
 <div className="text-sm font-medium text-foreground truncate">{item.title}</div>
 {(!hideGoal || item.milestoneTitle || item.taskTitle) && (item.goalTitle || item.milestoneTitle || item.taskTitle) && (
 <div className="text-xs text-muted-foreground dark:text-muted-foreground truncate">
 {[hideGoal ? null : item.goalTitle, item.milestoneTitle, item.taskTitle].filter(Boolean).join(' · ')}
 </div>
 )}
 </div>
 <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
 {onSnooze && item.itemType !== 'Goal' && (
 <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center space-x-1">
 <button
 onClick={(event) => {
 event.preventDefault();
 event.stopPropagation();
 onSnooze(item, 1);
 }}
 title="Snooze 1 day"
 className="p-1 text-muted-foreground hover:text-foreground dark:hover:text-muted-foreground/60 rounded"
 >
 <Clock4 className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={(event) => {
 event.preventDefault();
 event.stopPropagation();
 onSnooze(item, 7);
 }}
 title="Snooze 1 week"
 className="text-xs text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white px-1"
 >
 +1w
 </button>
 </div>
 )}
 <span className="text-xs text-muted-foreground dark:text-muted-foreground">
 {new Date(item.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
 </span>
 <span className="text-xs px-2 py-0.5 rounded-full text-foreground dark:text-muted-foreground/60" style={{ background: 'var(--tn-hover)' }}>
 {item.itemType}
 </span>
 </div>
 </Link>
 </li>
);
