'use client';

import React, { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import {
 buildActivityCounts,
 buildHeatmapGrid,
 longestStreak,
 activeDays,
 busiestDay,
 DayBucket,
} from '@/lib/activityHeatmap';
import { calculateActivityStreak } from '@/lib/recentActivity';

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

 const grid = useMemo(() => buildHeatmapGrid(goals, weeks), [goals, weeks]);
 const stats = useMemo(() => {
 const counts = buildActivityCounts(goals);
 const longest = longestStreak(counts);
 const current = calculateActivityStreak(goals);
 return {
 longest,
 current,
 active: activeDays(grid),
 busiest: busiestDay(grid),
 };
 }, [goals, grid]);

 const cellSize = compact ? 'w-2.5 h-2.5' : 'w-3 h-3';
 const cellGap = compact ? 'gap-0.5' : 'gap-1';

 const intensity = (count: number): string => {
 if (count === 0) return 'bg-muted dark:bg-card';
 const ratio = grid.max === 0 ? 0 : count / grid.max;
 if (ratio < 0.25) return 'bg-emerald-200 dark:bg-emerald-900/50';
 if (ratio < 0.5) return 'bg-emerald-400 dark:bg-emerald-700';
 if (ratio < 0.75) return 'bg-emerald-500 dark:bg-emerald-600';
 return 'bg-emerald-600 dark:bg-emerald-500';
 };

 return (
 <div className="card">
 {!compact && (
 <div className="flex flex-wrap items-end justify-between mb-4 gap-4">
 <div>
 <h3 className="text-lg font-semibold text-foreground">Activity</h3>
 <p className="text-sm text-foreground dark:text-muted-foreground">
 {grid.total} completion{grid.total === 1 ? '' : 's'} in the last {weeks} weeks
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

 <div className="overflow-x-auto">
 <div className="inline-block">
 {!compact && grid.monthLabels.length > 0 && (
 <div className="flex mb-1 text-[10px] text-muted-foreground dark:text-muted-foreground" style={{ paddingLeft: 24 }}>
 {grid.weeks.map((_, i) => {
 const label = grid.monthLabels.find((m) => m.col === i);
 return (
 <div key={i} className={`${cellSize} ${cellGap.includes('gap-0.5') ? 'mr-0.5' : 'mr-1'}`}>
 {label ? <span>{label.label}</span> : null}
 </div>
 );
 })}
 </div>
 )}

 <div className="flex">
 {!compact && (
 <div className="flex flex-col mr-1 text-[10px] text-muted-foreground dark:text-muted-foreground justify-around" style={{ height: cellSize.includes('w-3') ? '80px' : '70px' }}>
 <span>Mon</span>
 <span>Wed</span>
 <span>Fri</span>
 </div>
 )}
 <div className={`flex ${cellGap}`}>
 {grid.weeks.map((week, w) => (
 <div key={w} className={`flex flex-col ${cellGap}`}>
 {week.map((day, d) => {
 const isFuture = day.date.getTime() > Date.now();
 return (
 <div
 key={d}
 onMouseEnter={() => !isFuture && setHover(day)}
 onMouseLeave={() => setHover(null)}
 className={`${cellSize} rounded-sm ${
 isFuture ? 'opacity-30 bg-muted dark:bg-card' : intensity(day.count)
 } ${hover === day ? 'ring-2 ring-blue-400' : ''}`}
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
 <div className={`${cellSize} rounded-sm bg-muted dark:bg-card`} />
 <div className={`${cellSize} rounded-sm bg-emerald-200 dark:bg-emerald-900/50`} />
 <div className={`${cellSize} rounded-sm bg-emerald-400 dark:bg-emerald-700`} />
 <div className={`${cellSize} rounded-sm bg-emerald-500 dark:bg-emerald-600`} />
 <div className={`${cellSize} rounded-sm bg-emerald-600 dark:bg-emerald-500`} />
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
 <div className={`font-semibold ${highlight ? 'text-orange-600 dark:text-orange-400' : 'text-foreground'}`}>
 {value}
 </div>
 </div>
);
