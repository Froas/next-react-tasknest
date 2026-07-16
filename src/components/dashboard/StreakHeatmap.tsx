'use client';

import React, { type CSSProperties, useEffect, useMemo } from 'react';
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

const cellStyle = (count: number, max: number, isFuture = false): CSSProperties => {
 const base: CSSProperties = {
 border: 'var(--tn-line)',
 background: 'var(--tn-surface-2, var(--tn-hover))',
 opacity: isFuture ? 0.35 : 1,
 };
 if (count === 0) return base;
 const ratio = max === 0 ? 0 : count / max;
 const amount = ratio < 0.25 ? 22 : ratio < 0.5 ? 42 : ratio < 0.75 ? 62 : 82;
 return {
 ...base,
 background: `color-mix(in srgb, var(--tn-accent) ${amount}%, var(--tn-card))`,
 borderColor: `color-mix(in srgb, var(--tn-accent) ${Math.min(amount + 12, 90)}%, var(--tn-card))`,
 };
};

// 12-week streak heatmap. Aggregates completion counts across all tracked
// todos by date and renders a GitHub-style grid so the user can eyeball
// their consistency over the last quarter.
export const StreakHeatmap: React.FC = () => {
 const completions = useTodoStreaks((s) => s.completions);

 useEffect(() => {
 void useTodoStreaks.getState().hydrate().catch(() => undefined);
 }, []);

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

 return (
 <div className="card">
 <div className="flex items-center justify-between mb-3">
 <div>
 <h3 className="text-sm font-semibold text-foreground">Activity (last 12 weeks)</h3>
 {total === 0 && (
 <p className="text-xs text-muted-foreground dark:text-muted-foreground">
 Complete a recurring todo to start your streak.
 </p>
 )}
 </div>
 <span className="text-xs text-muted-foreground dark:text-muted-foreground">{total} completions</span>
 </div>
 <div className="w-full overflow-x-auto sm:overflow-x-visible pb-2">
 <div className="mx-auto flex w-max max-w-full space-x-1">
 {grid.map((week, wIdx) => (
 <div key={wIdx} className="flex flex-col space-y-1">
 {week.map(({ date, count, isFuture }, dIdx) => (
 <div
 key={dIdx}
 title={isFuture ? '' : `${dateKey(date)} — ${count} completion${count === 1 ? '' : 's'}`}
 className="w-3 h-3 rounded-sm"
 style={cellStyle(count, max, isFuture)}
 />
 ))}
 </div>
 ))}
 </div>
 </div>
 <div className="flex items-center justify-center mt-2 space-x-1 text-xs text-muted-foreground dark:text-muted-foreground">
 <span>Less</span>
 <div className="w-3 h-3 rounded-sm" style={cellStyle(0, 4)} />
 <div className="w-3 h-3 rounded-sm" style={cellStyle(1, 4)} />
 <div className="w-3 h-3 rounded-sm" style={cellStyle(2, 4)} />
 <div className="w-3 h-3 rounded-sm" style={cellStyle(3, 4)} />
 <div className="w-3 h-3 rounded-sm" style={cellStyle(4, 4)} />
 <span>More</span>
 </div>
 </div>
 );
};
