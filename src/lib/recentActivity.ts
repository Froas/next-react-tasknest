import { GoalItem as Goal, MilestoneItem as Milestone, TaskItem as Task, TodoItem as Todo, SubtaskItem as Subtask, StatusType } from './types';

export type ActivityKind = 'Goal' | 'Milestone' | 'Task' | 'Subtask' | 'Todo';

export interface ActivityItem {
 id: string;
 kind: ActivityKind;
 title: string;
 finishedAt: string;
 goalTitle?: string;
 milestoneTitle?: string;
 taskTitle?: string;
}

// Walk the full goal-tree and pick out everything with status=FINISHED that
// has a recorded end_datetime. Sorted descending so most recent first.
// Used by the dashboard"Recently finished" widget and any consumer that
// wants a timeline of completions without a backend activity feed.
export const collectRecentActivity = (goals: Goal[], limit = 10): ActivityItem[] => {
 const items: ActivityItem[] = [];

 const pushIfFinished = (entity: { id: string; title: string; status: StatusType; end_datetime?: string }, kind: ActivityKind, ctx: Partial<ActivityItem> = {}) => {
 if (entity.status !== StatusType.FINISHED || !entity.end_datetime) return;
 items.push({
 id: entity.id,
 kind,
 title: entity.title,
 finishedAt: entity.end_datetime,
 ...ctx,
 });
 };

 goals.forEach((goal) => {
 pushIfFinished(goal as Goal, 'Goal');
 goal.milestones?.forEach((milestone: Milestone) => {
 pushIfFinished(milestone, 'Milestone', { goalTitle: goal.title });
 milestone.tasks?.forEach((task: Task) => {
 pushIfFinished(task, 'Task', { goalTitle: goal.title, milestoneTitle: milestone.title });
 task.subtasks?.forEach((subtask: Subtask) =>
 pushIfFinished(subtask, 'Subtask', {
 goalTitle: goal.title,
 milestoneTitle: milestone.title,
 taskTitle: task.title,
 })
 );
 task.todos?.forEach((todo: Todo) =>
 pushIfFinished(todo, 'Todo', {
 goalTitle: goal.title,
 milestoneTitle: milestone.title,
 taskTitle: task.title,
 })
 );
 });
 });
 });

 items.sort((a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime());
 return items.slice(0, limit);
};

// Build a per-day completion count for a single goal across the last `days`
// days, ending today. Used by the sparkline on goal cards.
export const goalCompletionSeries = (goal: Goal, days = 30): number[] => {
 const counts: Record<string, number> = {};
 const dateKey = (iso: string) => {
 const d = new Date(iso);
 const y = d.getFullYear();
 const m = String(d.getMonth() + 1).padStart(2, '0');
 const day = String(d.getDate()).padStart(2, '0');
 return `${y}-${m}-${day}`;
 };

 const visit = (entity: { status: StatusType; end_datetime?: string }) => {
 if (entity.status === StatusType.FINISHED && entity.end_datetime) {
 const k = dateKey(entity.end_datetime);
 counts[k] = (counts[k] ?? 0) + 1;
 }
 };

 goal.milestones?.forEach((m) => {
 visit(m);
 m.tasks?.forEach((t) => {
 visit(t);
 t.subtasks?.forEach(visit as any);
 t.todos?.forEach(visit);
 });
 });

 const series: number[] = [];
 const today = new Date();
 today.setHours(0, 0, 0, 0);
 for (let i = days - 1; i >= 0; i--) {
 const d = new Date(today);
 d.setDate(d.getDate() - i);
 series.push(counts[dateKey(d.toISOString())] ?? 0);
 }
 return series;
};

// Daily streak: how many consecutive days (ending today, or yesterday with
// 1-day grace) had at least one finished entity in the goal tree.
export const calculateActivityStreak = (goals: Goal[]): number => {
 const dates = new Set<string>();
 const dateKey = (iso: string) => {
 const d = new Date(iso);
 const y = d.getFullYear();
 const m = String(d.getMonth() + 1).padStart(2, '0');
 const day = String(d.getDate()).padStart(2, '0');
 return `${y}-${m}-${day}`;
 };

 const visit = (entity: { status: StatusType; end_datetime?: string }) => {
 if (entity.status === StatusType.FINISHED && entity.end_datetime) {
 dates.add(dateKey(entity.end_datetime));
 }
 };

 goals.forEach((goal) => {
 visit(goal);
 goal.milestones?.forEach((m) => {
 visit(m);
 m.tasks?.forEach((t) => {
 visit(t);
 t.subtasks?.forEach(visit);
 t.todos?.forEach(visit);
 });
 });
 });

 if (dates.size === 0) return 0;

 const today = new Date();
 today.setHours(0, 0, 0, 0);
 const todayKey = dateKey(today.toISOString());
 const yesterday = new Date(today);
 yesterday.setDate(yesterday.getDate() - 1);
 const yesterdayKey = dateKey(yesterday.toISOString());

 let cursor: Date;
 if (dates.has(todayKey)) cursor = today;
 else if (dates.has(yesterdayKey)) cursor = yesterday;
 else return 0;

 let streak = 0;
 while (dates.has(dateKey(cursor.toISOString()))) {
 streak += 1;
 cursor.setDate(cursor.getDate() - 1);
 }
 return streak;
};
