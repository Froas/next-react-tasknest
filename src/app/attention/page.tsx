'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CalendarClock, Clock, Clock4 } from 'lucide-react';
import { withAuth } from '@/hoc/withAuth';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { StatusType } from '@/lib/types';
import { buildCalendarItems, calendarDateKey, calendarItemHref, parseCalendarDate, type CalendarItem } from '@/lib/calendarItems';
import { eventsApi, milestonesApi, subtasksApi, tasksApi, todosApi } from '@/lib/api';
import { toast } from '@/store/useToast';

type AttentionGroup = {
 key: string;
 title: string;
 goalId?: string;
 overdue: CalendarItem[];
 dueToday: CalendarItem[];
 upcoming: CalendarItem[];
};

const startOfDay = (date: Date) => {
 const value = new Date(date);
 value.setHours(0, 0, 0, 0);
 return value;
};

const attentionItemKey = (item: CalendarItem) => `${item.itemType}:${item.id}`;

const snoozedDate = (days: number) => {
 const next = startOfDay(new Date());
 next.setDate(next.getDate() + days);
 return calendarDateKey(next);
};

const runWithConcurrency = async <T,>(
 items: T[],
 limit: number,
 worker: (item: T) => Promise<void>,
) => {
 let nextIndex = 0;
 const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
 while (nextIndex < items.length) {
 const item = items[nextIndex];
 nextIndex += 1;
 await worker(item);
 }
 });
 await Promise.all(runners);
};

const AttentionPage: React.FC = () => {
 const goals = useStore((state) => state.goals);
 const tasks = useStore((state) => state.tasks);
 const todos = useStore((state) => state.todos);
 const events = useStore((state) => state.events);
 const [optimisticDates, setOptimisticDates] = useState<Record<string, string>>({});
 const { updateTaskInGoals, updateTodoInGoals, updateSubtaskInGoals, updateMilestoneInGoals, updateEvent } = useStore(
 useShallow((state) => ({
 updateTaskInGoals: state.updateTaskInGoals,
 updateTodoInGoals: state.updateTodoInGoals,
 updateSubtaskInGoals: state.updateSubtaskInGoals,
 updateMilestoneInGoals: state.updateMilestoneInGoals,
 updateEvent: state.updateEvent,
 }))
 );

 const { groups, overdueCount, dueTodayCount } = useMemo(() => {
 const today = startOfDay(new Date());
 const weekEnd = new Date(today);
 weekEnd.setDate(weekEnd.getDate() + 7);
 const map = new Map<string, AttentionGroup>();
 const ensure = (item: CalendarItem) => {
 const key = item.goalId ?? item.goalTitle ?? 'unlinked';
 const existing = map.get(key);
 if (existing) return existing;
 const group: AttentionGroup = { key, title: item.goalTitle ?? 'Unlinked', overdue: [], dueToday: [], upcoming: [] };
 if (item.goalId) group.goalId = item.goalId;
 map.set(key, group);
 return group;
 };

 const all = buildCalendarItems(goals, tasks, todos, events)
 .map((item) => {
 const optimisticDate = optimisticDates[attentionItemKey(item)];
 return optimisticDate ? { ...item, due_date: optimisticDate } : item;
 })
 .filter((item) => item.status !== StatusType.FINISHED && item.status !== StatusType.CANCELLED);
 const overdue: CalendarItem[] = [];
 const dueToday: CalendarItem[] = [];

 all.forEach((item) => {
 const due = startOfDay(parseCalendarDate(item.due_date));
 if (due < today) {
 overdue.push(item);
 ensure(item).overdue.push(item);
 } else if (due.getTime() === today.getTime()) {
 dueToday.push(item);
 ensure(item).dueToday.push(item);
 } else if (due < weekEnd) {
 ensure(item).upcoming.push(item);
 }
 });

 const sortByDate = (items: CalendarItem[]) => items.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
 map.forEach((group) => {
 sortByDate(group.overdue);
 sortByDate(group.dueToday);
 sortByDate(group.upcoming);
 });

 return {
 groups: Array.from(map.values()).sort((a, b) => {
 const aUrgency = a.overdue.length + a.dueToday.length;
 const bUrgency = b.overdue.length + b.dueToday.length;
 return bUrgency - aUrgency || a.title.localeCompare(b.title);
 }),
 overdueCount: overdue.length,
 dueTodayCount: dueToday.length,
 };
 }, [events, goals, optimisticDates, tasks, todos]);

 const snooze = async (item: CalendarItem, days: number, notify = true): Promise<boolean> => {
 const date = snoozedDate(days);
 try {
 switch (item.itemType) {
 case 'Task': {
 const dateUpdate = item.dateSource === 'scheduled_date'
 ? { scheduled_date: date }
 : { due_date: date };
 updateTaskInGoals(await tasksApi.update({ id: item.id, ...dateUpdate }));
 break;
 }
 case 'Todo': updateTodoInGoals(await todosApi.update({ id: item.id, due_date: date })); break;
 case 'Subtask': updateSubtaskInGoals(await subtasksApi.update({ id: item.id, due_date: date })); break;
 case 'Milestone': updateMilestoneInGoals(await milestonesApi.update({ id: item.id, due_date: date })); break;
 case 'Event': {
 const start = new Date();
 start.setDate(start.getDate() + days);
 updateEvent(await eventsApi.update({ id: item.id, start_datetime: start.toISOString() }));
 break;
 }
 default: return false;
 }
 if (notify) toast.success(`Snoozed for ${days === 1 ? 'a day' : `${days} days`}`);
 return true;
 } catch (error) {
 console.error('Failed to snooze attention item:', error);
 if (notify) toast.error('Failed to snooze item');
 return false;
 }
 };

 const snoozeAll = async (itemsToSnooze: CalendarItem[], days: 1 | 7) => {
 const date = snoozedDate(days);
 const keys = itemsToSnooze.map(attentionItemKey);
 setOptimisticDates((current) => {
 const next = { ...current };
 keys.forEach((key) => { next[key] = date; });
 return next;
 });

 let succeeded = 0;
 try {
 await runWithConcurrency(itemsToSnooze, 8, async (item) => {
 if (await snooze(item, days, false)) succeeded += 1;
 });
 } finally {
 setOptimisticDates((current) => {
 const next = { ...current };
 keys.forEach((key) => { delete next[key]; });
 return next;
 });
 }

 const failed = itemsToSnooze.length - succeeded;
 if (succeeded > 0) {
 toast.success(`Snoozed ${succeeded} item${succeeded === 1 ? '' : 's'} for ${days === 1 ? 'a day' : '7 days'}`);
 }
 if (failed > 0) toast.error(`Failed to snooze ${failed} item${failed === 1 ? '' : 's'}`);
 };

 return (
 <div className="page" style={{ maxWidth: 1400 }}>
 <div className="page-head">
 <div className="page-eyebrow">Work queue</div>
 <h1 className="page-title">Attention</h1>
 <p className="page-lede">Due and overdue work, grouped by the goal it belongs to.</p>
 </div>

 <div className="mb-5 flex flex-wrap items-center gap-3">
 <span className="pill" style={{ color: 'var(--tn-bad)', borderColor: 'var(--tn-bad)' }}>{overdueCount} overdue</span>
 <span className="pill">{dueTodayCount} due today</span>
 <Link href="/calendar" className="btn btn-secondary !px-3 !py-2 text-xs">Open calendar →</Link>
 </div>

 {groups.length === 0 ? (
 <div className="card text-center text-sm text-muted-foreground dark:text-muted-foreground">Nothing needs attention right now.</div>
 ) : (
 <div className="grid gap-4 xl:grid-cols-2">
 {groups.map((group) => (
 <article key={group.key} className="rounded-2xl border p-4" style={{ border: 'var(--tn-line)', background: 'var(--tn-card)' }}>
 <div className="mb-4 flex items-start justify-between gap-3">
 <div>
 <h2 className="text-base font-semibold text-foreground">
 {group.goalId ? <Link href={`/goal/${group.goalId}`} className="hover:underline">{group.title}</Link> : group.title}
 </h2>
 <p className="text-xs text-muted-foreground dark:text-muted-foreground">
 {group.overdue.length} overdue · {group.dueToday.length} today · {group.upcoming.length} this week
 </p>
 </div>
 </div>
 <AttentionBucket title="Overdue" icon={<AlertCircle className="h-4 w-4" />} tone="overdue" items={group.overdue} onSnooze={snooze} onSnoozeAll={snoozeAll} />
 <AttentionBucket title="Due today" icon={<Clock className="h-4 w-4" />} tone="today" items={group.dueToday} onSnooze={snooze} onSnoozeAll={snoozeAll} />
 <AttentionBucket title="This week" icon={<CalendarClock className="h-4 w-4" />} tone="upcoming" items={group.upcoming} onSnooze={snooze} onSnoozeAll={snoozeAll} />
 </article>
 ))}
 </div>
 )}
 </div>
 );
};

type AttentionTone = 'overdue' | 'today' | 'upcoming';

const AttentionBucket: React.FC<{
 title: string;
 icon: React.ReactNode;
 tone: AttentionTone;
 items: CalendarItem[];
 onSnooze: (item: CalendarItem, days: number, notify?: boolean) => Promise<boolean>;
 onSnoozeAll: (items: CalendarItem[], days: 1 | 7) => Promise<void>;
}> = ({ title, icon, tone, items, onSnooze, onSnoozeAll }) => {
 const [bulkDays, setBulkDays] = useState<1 | 7 | null>(null);
 if (items.length === 0) return null;
 const color = tone === 'overdue' ? 'var(--tn-bad, #c25d63)' : tone === 'today' ? 'var(--tn-accent)' : 'var(--tn-fg-muted)';

 const snoozeAll = async (days: 1 | 7) => {
 setBulkDays(days);
 try {
 await onSnoozeAll(items, days);
 } finally {
 setBulkDays(null);
 }
 };

 return (
 <section className="mb-4 last:mb-0">
 <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
 <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color }}>
 {icon}<span>{title}</span><span>({items.length})</span>
 </div>
 <div className="flex items-center gap-2">
 <button type="button" onClick={() => void snoozeAll(1)} disabled={bulkDays !== null} className="btn btn-secondary !px-2 !py-1 text-xs disabled:opacity-50" title={`Snooze all ${items.length} items for one day`}>
 {bulkDays === 1 ? 'Moving…' : 'All +1d'}
 </button>
 <button type="button" onClick={() => void snoozeAll(7)} disabled={bulkDays !== null} className="btn btn-secondary !px-2 !py-1 text-xs disabled:opacity-50" title={`Snooze all ${items.length} items for one week`}>
 {bulkDays === 7 ? 'Moving…' : 'All +1w'}
 </button>
 </div>
 </div>
 <div className="space-y-2">
 {items.map((item) => (
 <div key={`${item.itemType}-${item.id}`} className="flex items-center gap-2 rounded-xl border p-2" style={{ border: 'var(--tn-line)', background: tone === 'overdue' ? 'color-mix(in srgb, var(--tn-bad) 8%, var(--tn-card))' : 'var(--tn-hover)' }}>
 <Link href={calendarItemHref(item)} className="min-w-0 flex-1">
 <span className="block truncate text-sm font-medium text-foreground">{item.title}</span>
 <span className="block truncate text-xs text-muted-foreground dark:text-muted-foreground">{[item.milestoneTitle, item.taskTitle, item.itemType].filter(Boolean).join(' · ')}</span>
 </Link>
 <button type="button" onClick={() => void onSnooze(item, 1)} disabled={bulkDays !== null} className="btn btn-secondary !px-2 !py-1 text-xs disabled:opacity-50" title="Snooze one day"><Clock4 className="h-3.5 w-3.5" />+1d</button>
 <button type="button" onClick={() => void onSnooze(item, 7)} disabled={bulkDays !== null} className="btn btn-secondary !px-2 !py-1 text-xs disabled:opacity-50" title="Snooze one week">+1w</button>
 </div>
 ))}
 </div>
 </section>
 );
};

export default withAuth(AttentionPage);
