'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { StatusType } from '@/lib/types';
import { buildCalendarItems, CalendarItem } from '@/lib/calendarItems';
import { tasksApi, todosApi, milestonesApi, eventsApi } from '@/lib/api';
import { toast } from '@/store/useToast';
import { Calendar, AlertCircle, Clock, Clock4 } from 'lucide-react';

// Computes the"what do I need to act on right now" set across the entire
// tree: anything with due_date that's overdue, today, or in the next 7 days
// and not already finished/cancelled.

const startOfDay = (d: Date) => {
 const x = new Date(d);
 x.setHours(0, 0, 0, 0);
 return x;
};

export const TodayWidget: React.FC = () => {
 const goals = useStore((s) => s.goals);
 const tasks = useStore((s) => s.tasks);
 const todos = useStore((s) => s.todos);
 const events = useStore((s) => s.events);
 const { updateTaskInGoals, updateTodoInGoals, updateMilestoneInGoals, updateEvent } = useStore(
 useShallow((s) => ({
 updateTaskInGoals: s.updateTaskInGoals,
 updateTodoInGoals: s.updateTodoInGoals,
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

 const [groupByGoal, setGroupByGoal] = React.useState(false);

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

 // Group an item bucket by goalTitle for the alternative view. Items with
 // no parent goal land in an"Unlinked" bucket so nothing is hidden.
 const groupBy = (items: CalendarItem[]) => {
 const map = new Map<string, CalendarItem[]>();
 for (const item of items) {
 const key = item.goalTitle ?? 'Unlinked';
 const arr = map.get(key) ?? [];
 arr.push(item);
 map.set(key, arr);
 }
 return Array.from(map.entries());
 };

 const totalActionable = buckets.overdue.length + buckets.dueToday.length;

 return (
 <div className="card mb-6">
 <div className="flex items-center justify-between mb-4">
 <div>
 <h3 className="text-lg font-semibold text-foreground">Today</h3>
 <p className="text-sm text-foreground dark:text-muted-foreground">
 {totalActionable === 0
 ? 'Nothing due today — focus on your goals.'
 : `${totalActionable} item${totalActionable === 1 ? '' : 's'} need${totalActionable === 1 ? 's' : ''} attention`}
 </p>
 </div>
 <div className="flex items-center space-x-3">
 <button
 onClick={() => setGroupByGoal((v) => !v)}
 className={`text-xs px-2 py-1 rounded-md border ${
 groupByGoal
 ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
 : 'border-border dark:border-border text-foreground dark:text-muted-foreground/60 hover:bg-muted dark:hover:bg-card'
 }`}
 title="Group items under each parent goal"
 >
 {groupByGoal ? 'Grouped' : 'Group by goal'}
 </button>
 <Link
 href="/calendar"
 className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
 >
 Open calendar →
 </Link>
 </div>
 </div>

 {buckets.overdue.length > 0 && (
 <Section
 title="Overdue"
 icon={<AlertCircle className="w-4 h-4 text-red-500" />}
 tone="overdue"
 items={buckets.overdue}
 onSnooze={snooze}
 groupedByGoal={groupByGoal ? groupBy(buckets.overdue) : undefined}
 />
 )}
 {buckets.dueToday.length > 0 && (
 <Section
 title="Due today"
 icon={<Clock className="w-4 h-4 text-blue-500" />}
 tone="today"
 items={buckets.dueToday}
 onSnooze={snooze}
 groupedByGoal={groupByGoal ? groupBy(buckets.dueToday) : undefined}
 />
 )}
 {buckets.dueThisWeek.length > 0 && (
 <Section
 title="This week"
 icon={<Calendar className="w-4 h-4 text-muted-foreground" />}
 tone="upcoming"
 items={buckets.dueThisWeek.slice(0, 5)}
 groupedByGoal={groupByGoal ? groupBy(buckets.dueThisWeek.slice(0, 5)) : undefined}
 />
 )}
 {totalActionable === 0 && buckets.dueThisWeek.length === 0 && (
 <div className="text-center py-6 text-muted-foreground dark:text-muted-foreground text-sm">
 You&apos;re all caught up.
 </div>
 )}
 </div>
 );
};

interface SectionProps {
 title: string;
 icon: React.ReactNode;
 tone: 'overdue' | 'today' | 'upcoming';
 items: ReturnType<typeof buildCalendarItems>;
 onSnooze?: (item: CalendarItem, days: number) => void;
 groupedByGoal?: [string, CalendarItem[]][];
}

const TONES: Record<SectionProps['tone'], string> = {
 overdue: 'border-red-200 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10',
 today: 'border-blue-200 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10',
 upcoming: 'border-border dark:border-border',
};

const Section: React.FC<SectionProps> = ({ title, icon, tone, items, onSnooze, groupedByGoal }) => {
 if (groupedByGoal) {
 return (
 <div className="mb-4 last:mb-0">
 <div className="flex items-center space-x-2 mb-2">
 {icon}
 <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
 {title}
 </h4>
 <span className="text-xs text-muted-foreground dark:text-muted-foreground">({items.length})</span>
 </div>
 <div className="space-y-2">
 {groupedByGoal.map(([goalTitle, groupItems]) => (
 <div key={goalTitle}>
 <div className="text-xs font-medium text-foreground dark:text-muted-foreground/60 mb-1 ml-1">
 {goalTitle} <span className="text-muted-foreground dark:text-muted-foreground">· {groupItems.length}</span>
 </div>
 <ul className="space-y-1 ml-2">
 {groupItems.map((item) => (
 <Row key={`${item.itemType}-${item.id}`} item={item} tone={tone} onSnooze={onSnooze} hideGoal />
 ))}
 </ul>
 </div>
 ))}
 </div>
 </div>
 );
 }
 return (
 <div className="mb-4 last:mb-0">
 <div className="flex items-center space-x-2 mb-2">
 {icon}
 <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
 {title}
 </h4>
 <span className="text-xs text-muted-foreground dark:text-muted-foreground">({items.length})</span>
 </div>
 <ul className="space-y-1">
 {items.map((item) => (
 <li
 key={`${item.itemType}-${item.id}`}
 className={`flex items-center justify-between px-3 py-2 rounded-lg border ${TONES[tone]} group`}
 >
 <div className="flex-1 min-w-0">
 <div className="text-sm font-medium text-foreground truncate">
 {item.title}
 </div>
 {(item.goalTitle || item.milestoneTitle || item.taskTitle) && (
 <div className="text-xs text-muted-foreground dark:text-muted-foreground truncate">
 {[item.goalTitle, item.milestoneTitle, item.taskTitle]
 .filter(Boolean)
 .join(' · ')}
 </div>
 )}
 </div>
 <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
 {onSnooze && item.itemType !== 'Goal' && (
 <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
 <button
 onClick={() => onSnooze(item, 1)}
 title="Snooze 1 day"
 className="p-1 text-muted-foreground hover:text-foreground dark:hover:text-muted-foreground/60 hover:bg-card dark:hover:bg-card rounded"
 >
 <Clock4 className="w-3.5 h-3.5" />
 <span className="sr-only">Snooze 1 day</span>
 </button>
 <button
 onClick={() => onSnooze(item, 7)}
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
 <span className="text-xs px-2 py-0.5 rounded-full bg-muted dark:bg-card text-foreground dark:text-muted-foreground/60">
 {item.itemType}
 </span>
 </div>
 </li>
 ))}
 </ul>
 </div>
 );
};

interface RowProps {
 item: CalendarItem;
 tone: 'overdue' | 'today' | 'upcoming';
 onSnooze?: (item: CalendarItem, days: number) => void;
 hideGoal?: boolean;
}

const Row: React.FC<RowProps> = ({ item, tone, onSnooze, hideGoal }) => (
 <li className={`flex items-center justify-between px-3 py-2 rounded-lg border ${TONES[tone]} group`}>
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
 <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
 <button onClick={() => onSnooze(item, 1)} title="Snooze 1 day" className="p-1 text-muted-foreground hover:text-foreground dark:hover:text-muted-foreground/60 hover:bg-card dark:hover:bg-card rounded">
 <Clock4 className="w-3.5 h-3.5" />
 </button>
 <button onClick={() => onSnooze(item, 7)} title="Snooze 1 week" className="text-xs text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white px-1">
 +1w
 </button>
 </div>
 )}
 <span className="text-xs text-muted-foreground dark:text-muted-foreground">
 {new Date(item.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
 </span>
 <span className="text-xs px-2 py-0.5 rounded-full bg-muted dark:bg-card text-foreground dark:text-muted-foreground/60">
 {item.itemType}
 </span>
 </div>
 </li>
);
