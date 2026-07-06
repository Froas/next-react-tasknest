import { GoalItem as Goal, TaskItem as Task, TodoItem as Todo, Event, StatusType } from './types';

export type CalendarItemType = 'Goal' | 'Milestone' | 'Task' | 'Todo' | 'Event';

export interface CalendarItem {
 id: string;
 title: string;
 due_date: string;
 status: StatusType;
 itemType: CalendarItemType;
 goalTitle?: string;
 milestoneTitle?: string;
 taskTitle?: string;
}

export const buildCalendarItems = (
 goals: Goal[],
 flatTasks: Task[],
 flatTodos: Todo[],
 events: Event[]
): CalendarItem[] => {
 const items: CalendarItem[] = [];
 const seenIds = new Set<string>();

 const push = (item: CalendarItem) => {
 const key = `${item.itemType}:${item.id}`;
 if (seenIds.has(key)) return;
 seenIds.add(key);
 items.push(item);
 };

 goals.forEach((goal) => {
 if (goal.end_datetime) {
 push({
 id: goal.id,
 title: goal.title,
 due_date: goal.end_datetime,
 status: goal.status,
 itemType: 'Goal',
 });
 }

 goal.milestones?.forEach((milestone) => {
 const milestoneDue = milestone.due_date || milestone.end_datetime;
 if (milestoneDue) {
 push({
 id: milestone.id,
 title: milestone.title,
 due_date: milestoneDue,
 status: milestone.status,
 itemType: 'Milestone',
 goalTitle: goal.title,
 });
 }

 milestone.tasks?.forEach((task) => {
 if (task.due_date) {
 push({
 id: task.id,
 title: task.title,
 due_date: task.due_date,
 status: task.status,
 itemType: 'Task',
 goalTitle: goal.title,
 milestoneTitle: milestone.title,
 });
 }

 task.todos?.forEach((todo) => {
 if (todo.due_date) {
 push({
 id: todo.id,
 title: todo.title,
 due_date: todo.due_date,
 status: todo.status,
 itemType: 'Todo',
 goalTitle: goal.title,
 milestoneTitle: milestone.title,
 taskTitle: task.title,
 });
 }
 });
 });
 });
 });

 flatTasks.forEach((task) => {
 if (task.due_date) {
 push({
 id: task.id,
 title: task.title,
 due_date: task.due_date,
 status: task.status,
 itemType: 'Task',
 });
 }
 });

 flatTodos.forEach((todo) => {
 if (todo.due_date) {
 push({
 id: todo.id,
 title: todo.title,
 due_date: todo.due_date,
 status: todo.status,
 itemType: 'Todo',
 });
 }
 });

 events.forEach((event) => {
 if (event.start_datetime) {
 push({
 id: event.id,
 title: event.title,
 due_date: event.start_datetime,
 status: event.status,
 itemType: 'Event',
 });
 }
 });

 return items;
};

export const filterItemsByDate = (items: CalendarItem[], date: Date): CalendarItem[] => {
 const target = date.toDateString();
 return items.filter((item) => new Date(item.due_date).toDateString() === target);
};

// Pre-build a map keyed by `Date.toDateString()` for O(1) lookup per cell.
// Use this when rendering a full month / year calendar grid so we avoid
// re-filtering the full items list on every tile.
export const groupItemsByDate = (items: CalendarItem[]): Map<string, CalendarItem[]> => {
 const map = new Map<string, CalendarItem[]>();
 items.forEach((item) => {
 const key = new Date(item.due_date).toDateString();
 const bucket = map.get(key);
 if (bucket) bucket.push(item);
 else map.set(key, [item]);
 });
 return map;
};
