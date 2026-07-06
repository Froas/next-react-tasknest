'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { StatusType } from '@/lib/types';
import { buildCalendarItems } from '@/lib/calendarItems';

const startOfDay = (d: Date) => {
 const x = new Date(d);
 x.setHours(0, 0, 0, 0);
 return x;
};

// Compact badge for the global header. Shows"N overdue" when the user has
// past-due items so there's a constant low-friction nudge to act on them.
// Hidden when nothing is overdue.
export const OverdueBadge: React.FC = () => {
 const goals = useStore((s) => s.goals);
 const tasks = useStore((s) => s.tasks);
 const todos = useStore((s) => s.todos);
 const events = useStore((s) => s.events);

 const overdue = useMemo(() => {
 const items = buildCalendarItems(goals, tasks, todos, events).filter(
 (i) => i.status !== StatusType.FINISHED && i.status !== StatusType.CANCELLED
 );
 const today = startOfDay(new Date()).getTime();
 return items.filter((i) => startOfDay(new Date(i.due_date)).getTime() < today).length;
 }, [goals, tasks, todos, events]);

 if (overdue === 0) return null;

 return (
 <Link
 href="/calendar"
 title="Items overdue — open calendar"
 className="hidden sm:inline-flex items-center px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-semibold hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
 >
 <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 animate-pulse" />
 {overdue} overdue
 </Link>
 );
};
