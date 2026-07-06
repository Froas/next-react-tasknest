import { GoalItem as Goal, StatusType } from './types';
import { ActivityKind } from './recentActivity';

export interface DayBucket {
 date: Date;
 count: number;
 byKind: Partial<Record<ActivityKind, number>>;
}

const dateKey = (d: Date) => {
 const y = d.getFullYear();
 const m = String(d.getMonth() + 1).padStart(2, '0');
 const day = String(d.getDate()).padStart(2, '0');
 return `${y}-${m}-${day}`;
};

const startOfDay = (d: Date) => {
 const x = new Date(d);
 x.setHours(0, 0, 0, 0);
 return x;
};

interface BucketAccumulator {
 count: number;
 byKind: Partial<Record<ActivityKind, number>>;
}

// Walk the entire goal-tree, picking up every entity that has
// status=FINISHED and an end_datetime, and tally them by day. Keyed by
// YYYY-MM-DD so the heatmap can render a year-long grid in O(items + days).
export const buildActivityCounts = (goals: Goal[]): Map<string, BucketAccumulator> => {
 const counts = new Map<string, BucketAccumulator>();

 const bump = (entity: { status: StatusType; end_datetime?: string }, kind: ActivityKind) => {
 if (entity.status !== StatusType.FINISHED || !entity.end_datetime) return;
 const key = dateKey(new Date(entity.end_datetime));
 const slot = counts.get(key) ?? { count: 0, byKind: {} };
 slot.count += 1;
 slot.byKind[kind] = (slot.byKind[kind] ?? 0) + 1;
 counts.set(key, slot);
 };

 goals.forEach((goal) => {
 bump(goal, 'Goal');
 goal.milestones?.forEach((m) => {
 bump(m, 'Milestone');
 m.tasks?.forEach((t) => {
 bump(t, 'Task');
 t.subtasks?.forEach((s) => bump(s, 'Subtask'));
 t.todos?.forEach((td) => bump(td, 'Todo'));
 });
 });
 });

 return counts;
};

export interface HeatmapGrid {
 weeks: DayBucket[][]; // weeks[col][row], col=0 oldest, row=0 Sunday
 total: number;
 max: number;
 monthLabels: { col: number; label: string }[];
}

// Build a `weeks × 7` grid ending on the current week's Saturday so columns
// align to Sun-Sat weeks. Default window is 53 weeks ≈ 1 year.
export const buildHeatmapGrid = (goals: Goal[], weeks = 53): HeatmapGrid => {
 const counts = buildActivityCounts(goals);
 const today = startOfDay(new Date());
 // Anchor: this week's Saturday (last column).
 const anchor = new Date(today);
 anchor.setDate(anchor.getDate() + (6 - anchor.getDay()));
 const start = new Date(anchor);
 start.setDate(start.getDate() - weeks * 7 + 1);

 const grid: DayBucket[][] = [];
 let total = 0;
 let max = 0;
 const monthLabels: { col: number; label: string }[] = [];
 let prevMonth = -1;

 const cursor = new Date(start);
 for (let w = 0; w < weeks; w++) {
 const week: DayBucket[] = [];
 for (let d = 0; d < 7; d++) {
 const day = new Date(cursor);
 const slot = counts.get(dateKey(day));
 const count = slot?.count ?? 0;
 total += count;
 if (count > max) max = count;
 week.push({ date: day, count, byKind: slot?.byKind ?? {} });
 cursor.setDate(cursor.getDate() + 1);
 }
 // Tag the column with a month label when the week starts a new month.
 const firstOfWeek = week[0].date;
 if (firstOfWeek.getMonth() !== prevMonth && firstOfWeek.getDate() <= 7) {
 monthLabels.push({
 col: w,
 label: firstOfWeek.toLocaleString('en-US', { month: 'short' }),
 });
 prevMonth = firstOfWeek.getMonth();
 }
 grid.push(week);
 }

 return { weeks: grid, total, max, monthLabels };
};

// Longest consecutive-day streak of any completion in the given window.
export const longestStreak = (counts: Map<string, BucketAccumulator>): number => {
 if (counts.size === 0) return 0;
 const dates = Array.from(counts.keys()).sort();
 let longest = 1;
 let current = 1;
 for (let i = 1; i < dates.length; i++) {
 const prev = new Date(dates[i - 1]);
 const next = new Date(dates[i]);
 const diff = Math.round((next.getTime() - prev.getTime()) / 86_400_000);
 if (diff === 1) {
 current += 1;
 if (current > longest) longest = current;
 } else {
 current = 1;
 }
 }
 return longest;
};

// Count of unique active days within window covered by the grid.
export const activeDays = (grid: HeatmapGrid): number => {
 let n = 0;
 grid.weeks.forEach((week) => week.forEach((d) => { if (d.count > 0) n += 1; }));
 return n;
};

// Highest single-day count plus its date (for"Busiest day" stat).
export const busiestDay = (grid: HeatmapGrid): DayBucket | null => {
 let best: DayBucket | null = null;
 grid.weeks.forEach((week) =>
 week.forEach((d) => {
 const current: DayBucket | null = best;
 if (current === null || d.count > current.count) best = d;
 })
 );
 if (best === null) return null;
 const winner: DayBucket = best;
 return winner.count > 0 ? winner : null;
};
