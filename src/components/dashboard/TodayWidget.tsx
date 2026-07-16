'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { AlertCircle, Calendar } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { StatusType } from '@/lib/types';
import { buildCalendarItems, parseCalendarDate } from '@/lib/calendarItems';
import { DailyLogPanel } from './DailyLogPanel';
import { RadarTodayPanel } from './RadarTodayPanel';

const startOfDay = (date: Date) => {
 const value = new Date(date);
 value.setHours(0, 0, 0, 0);
 return value;
};

export const TodayWidget: React.FC = () => {
 const goals = useStore((state) => state.goals);
 const tasks = useStore((state) => state.tasks);
 const todos = useStore((state) => state.todos);
 const events = useStore((state) => state.events);

 const attention = useMemo(() => {
 const today = startOfDay(new Date());
 const items = buildCalendarItems(goals, tasks, todos, events).filter((item) => (
 item.status !== StatusType.FINISHED && item.status !== StatusType.CANCELLED
 ));
 const overdue = items.filter((item) => startOfDay(parseCalendarDate(item.due_date)) < today).length;
 const dueToday = items.filter((item) => startOfDay(parseCalendarDate(item.due_date)).getTime() === today.getTime()).length;
 return { overdue, dueToday, total: overdue + dueToday };
 }, [events, goals, tasks, todos]);

 return (
 <div id="today-dashboard" tabIndex={-1} className="card scroll-mt-24 focus:outline-none">
 <div className="flex items-start justify-between gap-3">
 <div>
 <h3 className="text-lg font-semibold text-foreground">Today</h3>
 <p className="hidden text-sm text-foreground dark:text-muted-foreground sm:block">
 Daily log, routines, metrics, and your selected focus.
 </p>
 </div>
 <Link
 href="/attention"
 aria-label={attention.total > 0 ? `${attention.overdue} overdue, ${attention.dueToday} due today` : 'No due work today'}
 className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-transform hover:-translate-y-0.5 sm:h-auto sm:w-auto sm:px-3 sm:py-2"
 style={{ border: 'var(--tn-line)', background: 'var(--tn-hover)', color: 'var(--tn-fg)' }}
 >
 {attention.total > 0 ? <AlertCircle className="h-4 w-4" style={{ color: 'var(--tn-bad, #c25d63)' }} /> : <Calendar className="h-4 w-4" style={{ color: 'var(--tn-accent)' }} />}
 <span className="hidden sm:inline">
 {attention.total > 0
 ? `${attention.overdue} overdue · ${attention.dueToday} today`
 : 'No due work today'}
 </span>
 <span className="hidden sm:inline" aria-hidden="true">→</span>
 </Link>
 </div>

 <div className="mt-4">
 <DailyLogPanel />
 <RadarTodayPanel />
 </div>
 </div>
 );
};
