'use client';

import React, { useMemo } from 'react';
import { useTodoStreaks } from '@/store/useTodoStreaks';

const WEEKS = 12;
const DAYS_PER_WEEK = 7;

const startOfDay = (d: Date) => {
 const x = new Date(d);
 x.setHours(0, 0, 0, 0);
 return x;
};

const dateKey = (d: Date) => {
 const y = d.getFullYear();
 const m = String(d.getMonth() + 1).padStart(2, '0');
 const day = String(d.getDate()).padStart(2, '0');
 return `${y}-${m}-${day}`;
};

const intensity = (count: number, max: number): string => {
 if (count === 0) return 'bg-muted dark:bg-card';
 const ratio = max === 0 ? 0 : count / max;
 if (ratio < 0.25) return 'bg-orange-200 dark:bg-orange-900/40';
 if (ratio < 0.5) return 'bg-orange-300 dark:bg-orange-800/60';
 if (ratio < 0.75) return 'bg-orange-400 dark:bg-orange-700';
 return 'bg-orange-500 dark:bg-orange-600';
};

// 12-week streak heatmap. Aggregates completion counts across all tracked
// todos by date and renders a GitHub-style grid so the user can eyeball
// their consistency over the last quarter.
export const StreakHeatmap: React.FC = () => {
 const completions = useTodoStreaks((s) => s.completions);

 const { grid, max, total } = useMemo(() => {
 const counts: Record<string, number> = {};
 let max = 0;
 Object.values(completions).forEach((dates) => {
 dates.forEach((d) => {
 counts[d] = (counts[d] ?? 0) + 1;
 if (counts[d] > max) max = counts[d];
 });
 });

 const today = startOfDay(new Date());
 // Anchor on the most recent Sunday so columns align to weeks.
 const lastDay = new Date(today);
 const daysAfterSunday = lastDay.getDay();
 lastDay.setDate(lastDay.getDate() + (6 - daysAfterSunday)); // Saturday of this week
 const firstDay = new Date(lastDay);
 firstDay.setDate(firstDay.getDate() - WEEKS * DAYS_PER_WEEK + 1);

 const grid: { date: Date; count: number; isFuture: boolean }[][] = [];
 let cursor = new Date(firstDay);
 let total = 0;

 for (let w = 0; w < WEEKS; w++) {
 const week: { date: Date; count: number; isFuture: boolean }[] = [];
 for (let d = 0; d < DAYS_PER_WEEK; d++) {
 const day = new Date(cursor);
 const count = counts[dateKey(day)] ?? 0;
 total += count;
 week.push({ date: day, count, isFuture: day > today });
 cursor.setDate(cursor.getDate() + 1);
 }
 grid.push(week);
 }
 return { grid, max, total };
 }, [completions]);

 if (total === 0) {
 return (
 <div className="card">
 <h3 className="text-sm font-semibold text-foreground mb-1">Activity</h3>
 <p className="text-xs text-muted-foreground dark:text-muted-foreground">
 Complete a recurring todo to start your streak. The last 12 weeks will appear here.
 </p>
 </div>
 );
 }

 return (
 <div className="card">
 <div className="flex items-center justify-between mb-3">
 <h3 className="text-sm font-semibold text-foreground">Activity (last 12 weeks)</h3>
 <span className="text-xs text-muted-foreground dark:text-muted-foreground">{total} completions</span>
 </div>
 <div className="flex space-x-1 overflow-x-auto pb-2">
 {grid.map((week, wIdx) => (
 <div key={wIdx} className="flex flex-col space-y-1">
 {week.map(({ date, count, isFuture }, dIdx) => (
 <div
 key={dIdx}
 title={isFuture ? '' : `${dateKey(date)} — ${count} completion${count === 1 ? '' : 's'}`}
 className={`w-3 h-3 rounded-sm ${isFuture ? 'opacity-30 bg-muted dark:bg-card' : intensity(count, max)}`}
 />
 ))}
 </div>
 ))}
 </div>
 <div className="flex items-center justify-end mt-2 space-x-1 text-xs text-muted-foreground dark:text-muted-foreground">
 <span>less</span>
 <div className="w-3 h-3 rounded-sm bg-muted dark:bg-card" />
 <div className="w-3 h-3 rounded-sm bg-orange-200 dark:bg-orange-900/40" />
 <div className="w-3 h-3 rounded-sm bg-orange-300 dark:bg-orange-800/60" />
 <div className="w-3 h-3 rounded-sm bg-orange-400 dark:bg-orange-700" />
 <div className="w-3 h-3 rounded-sm bg-orange-500 dark:bg-orange-600" />
 <span>more</span>
 </div>
 </div>
 );
};
