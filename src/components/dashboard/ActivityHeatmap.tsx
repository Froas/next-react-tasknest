'use client';

import React, { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useStore } from '@/store/useStore';
import {
 buildActivityCounts,
 buildHeatmapGrid,
 longestStreak,
 currentStreak,
 activeDays,
 busiestDay,
 DayBucket,
} from '@/lib/activityHeatmap';
import { AuthRequiredError, TodoOccurrenceItem, todoOccurrencesApi } from '@/lib/api';
import { TODAY_DATA_CHANGED_EVENT } from '@/lib/todaySync';

interface ActivityHeatmapProps {
 weeks?: number;
 compact?: boolean;
}

// GitHub-style contribution heatmap, but counting *completions* across the
// goal tree rather than commits. Each cell is one day; intensity scales to
// the busiest day in the window. Hover any cell for breakdown by kind.
export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ weeks = 53, compact = false }) => {
 const goals = useStore((s) => s.goals);
 const [hover, setHover] = useState<DayBucket | null>(null);
 const [routineOccurrences, setRoutineOccurrences] = useState<TodoOccurrenceItem[]>([]);
 const [routineLoading, setRoutineLoading] = useState(true);

 useEffect(() => {
 let cancelled = false;
 const loadRoutineActivity = async () => {
 const end = new Date();
 const start = new Date(end);
 start.setDate(start.getDate() - weeks * 7);
 const localDate = (date: Date) => {
 const year = date.getFullYear();
 const month = String(date.getMonth() + 1).padStart(2, '0');
 const day = String(date.getDate()).padStart(2, '0');
 return `${year}-${month}-${day}`;
 };
 try {
 const rows = await todoOccurrencesApi.history({
 startDate: localDate(start),
 endDate: localDate(end),
 statuses: ['done', 'minimum'],
 });
 if (!cancelled) setRoutineOccurrences(rows);
 } catch (error) {
 if (!(error instanceof AuthRequiredError)) console.error('Failed to load routine heatmap activity:', error);
 } finally {
 if (!cancelled) setRoutineLoading(false);
 }
 };

 void loadRoutineActivity();
 window.addEventListener(TODAY_DATA_CHANGED_EVENT, loadRoutineActivity);
 return () => {
 cancelled = true;
 window.removeEventListener(TODAY_DATA_CHANGED_EVENT, loadRoutineActivity);
 };
 }, [weeks]);

 const grid = useMemo(
 () => buildHeatmapGrid(goals, weeks, routineOccurrences),
 [goals, routineOccurrences, weeks],
 );
 const stats = useMemo(() => {
 const counts = buildActivityCounts(goals, routineOccurrences);
 const longest = longestStreak(counts);
 const current = currentStreak(counts);
 return {
 longest,
 current,
 active: activeDays(grid),
 busiest: busiestDay(grid),
 };
 }, [goals, grid, routineOccurrences]);

 const cellSize = compact ? 'w-2.5 h-2.5' : 'w-3 h-3';
 const minCellWidth = compact ? '8px' : '8px';
 const gapPx = compact ? 2 : 3;
 const graphColumns = `repeat(${grid.weeks.length}, minmax(${minCellWidth}, 1fr))`;

 const intensityLevel = (level: 0 | 1 | 2 | 3 | 4): CSSProperties => {
 if (level === 0) {
 return {
 background: 'var(--tn-surface-2, var(--tn-hover))',
 border: 'var(--tn-line)',
 };
 }
 const amount = [0, 24, 42, 60, 78][level];
 return {
 background: `color-mix(in srgb, var(--tn-good, #2f7d50) ${amount}%, var(--tn-card))`,
 border: `1px solid color-mix(in srgb, var(--tn-good, #2f7d50) ${Math.min(amount + 14, 88)}%, var(--tn-card))`,
 };
 };

 const intensity = (count: number): CSSProperties => {
 if (count === 0) return intensityLevel(0);
 const ratio = grid.max === 0 ? 0 : count / grid.max;
 if (ratio < 0.25) return intensityLevel(1);
 if (ratio < 0.5) return intensityLevel(2);
 if (ratio < 0.75) return intensityLevel(3);
 return intensityLevel(4);
 };

 return (
 <div className="card">
 {!compact && (
 <div className="flex flex-wrap items-end justify-between mb-4 gap-4">
 <div>
 <h3 className="text-lg font-semibold text-foreground">Activity</h3>
 <p className="text-sm text-foreground dark:text-muted-foreground">
 {routineLoading && grid.total === 0
 ? 'Loading activity…'
 : `${grid.total} completion${grid.total === 1 ? '' : 's'} in the last ${weeks} weeks`}
 </p>
 </div>
 <div className="flex flex-wrap gap-4 text-xs">
 <Stat label="Active days" value={stats.active.toString()} />
 <Stat label="Current streak" value={`${stats.current}d`} highlight={stats.current >= 2} />
 <Stat label="Longest streak" value={`${stats.longest}d`} />
 {stats.busiest && (
 <Stat
 label="Busiest"
 value={`${stats.busiest.count} on ${stats.busiest.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
 />
 )}
 </div>
 </div>
 )}

 <div className="w-full overflow-x-auto md:overflow-x-visible pb-1">
 <div className={`${compact ? 'min-w-[320px]' : 'min-w-[520px]'} md:min-w-0 w-full`}>
 {!compact && grid.monthLabels.length > 0 && (
 <div
 className="grid mb-1 text-[11px] text-muted-foreground dark:text-muted-foreground"
 style={{ gridTemplateColumns: graphColumns, columnGap: gapPx }}
 >
 {grid.weeks.map((_, i) => {
 const label = grid.monthLabels.find((m) => m.col === i);
 return (
 <div key={i} className="h-4 min-w-0 overflow-visible whitespace-nowrap">
 {label ? <span>{label.label}</span> : null}
 </div>
 );
 })}
 </div>
 )}

 <div
 className="grid items-start"
 style={{ gridTemplateColumns: graphColumns, columnGap: gapPx }}
 >
 {grid.weeks.map((week, w) => (
 <div key={w} className="grid grid-rows-7 min-w-0" style={{ rowGap: gapPx }}>
 {week.map((day, d) => {
 const isFuture = day.date.getTime() > Date.now();
 return (
 <div
 key={d}
 onMouseEnter={() => !isFuture && setHover(day)}
 onMouseLeave={() => setHover(null)}
 className="w-full aspect-square rounded-[4px]"
 style={{
 ...(isFuture ? { ...intensityLevel(0), opacity: 0.5 } : intensity(day.count)),
 boxShadow: hover === day ? '0 0 0 2px var(--tn-accent)' : undefined,
 }}
 title={
 isFuture
 ? ''
 : `${day.date.toDateString()} — ${day.count} completion${day.count === 1 ? '' : 's'}`
 }
 />
 );
 })}
 </div>
 ))}
 </div>

 {!compact && (
 <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground dark:text-muted-foreground">
 <div className="min-h-[20px]">
 {hover && hover.count > 0 && (
 <span>
 <strong className="text-foreground">{hover.count}</strong> on{' '}
 {hover.date.toLocaleDateString(undefined, {
 weekday: 'short',
 month: 'short',
 day: 'numeric',
 })}
 {Object.keys(hover.byKind).length > 0 && (
 <span className="ml-2 text-muted-foreground">
 ({Object.entries(hover.byKind).map(([k, v]) => `${v} ${k.toLowerCase()}`).join(', ')})
 </span>
 )}
 </span>
 )}
 </div>
 <div className="flex items-center space-x-1">
 <span>Less</span>
 <div className={`${cellSize} rounded-sm`} style={intensityLevel(0)} />
 <div className={`${cellSize} rounded-sm`} style={intensityLevel(1)} />
 <div className={`${cellSize} rounded-sm`} style={intensityLevel(2)} />
 <div className={`${cellSize} rounded-sm`} style={intensityLevel(3)} />
 <div className={`${cellSize} rounded-sm`} style={intensityLevel(4)} />
 <span>More</span>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 );
};

const Stat: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
 <div>
 <div className="text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">{label}</div>
 <div className="font-semibold text-foreground" style={highlight ? { color: 'var(--tn-warn, #c8932a)' } : undefined}>
 {value}
 </div>
 </div>
);
