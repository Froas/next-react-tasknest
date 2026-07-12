import { GoalItem as Goal, TaskItem as Task, TodoItem as Todo, Event, StatusType } from './types';

export type CalendarItemType = 'Goal' | 'Milestone' | 'Task' | 'Todo' | 'Subtask' | 'Event';

export interface CalendarItem {
 id: string;
 title: string;
 due_date: string;
 end_date?: string;
 status: StatusType;
 itemType: CalendarItemType;
 goalId?: string;
 milestoneId?: string;
 taskId?: string;
 goalTitle?: string;
 milestoneTitle?: string;
 taskTitle?: string;
}

export function parseCalendarDate(value: string): Date {
 if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
 const [year, month, day] = value.split('-').map(Number);
 return new Date(year, month - 1, day);
 }
 return new Date(value);
}

export function calendarDateKey(value: Date): string {
 return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
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
 goalId: goal.id,
 });
 }

 (goal.tasks ?? []).forEach((task) => {
 const taskDate = task.scheduled_date || task.due_date;
 if (taskDate) {
 push({
 id: task.id,
 title: task.title,
 due_date: taskDate,
 end_date: task.end_datetime,
 status: task.status,
 itemType: 'Task',
 goalId: goal.id,
 taskId: task.id,
 goalTitle: goal.title,
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
 goalId: goal.id,
 taskId: task.id,
 goalTitle: goal.title,
 taskTitle: task.title,
 });
 }
 });

 task.subtasks?.forEach((subtask) => {
 if (subtask.due_date) {
 push({
 id: subtask.id,
 title: subtask.title,
 due_date: subtask.due_date,
 status: subtask.status,
 itemType: 'Subtask',
 goalId: goal.id,
 taskId: task.id,
 goalTitle: goal.title,
 taskTitle: task.title,
 });
 }
 });
 });

 goal.milestones?.forEach((milestone) => {
 const milestoneDue = milestone.due_date || milestone.end_datetime;
 if (milestoneDue) {
 push({
 id: milestone.id,
 title: milestone.title,
 due_date: milestoneDue,
 end_date: milestone.end_datetime,
 status: milestone.status,
 itemType: 'Milestone',
 goalId: goal.id,
 milestoneId: milestone.id,
 goalTitle: goal.title,
 });
 }

 milestone.tasks?.forEach((task) => {
 const taskDate = task.scheduled_date || task.due_date;
 if (taskDate) {
 push({
 id: task.id,
 title: task.title,
 due_date: taskDate,
 end_date: task.end_datetime,
 status: task.status,
 itemType: 'Task',
 goalId: goal.id,
 milestoneId: milestone.id,
 taskId: task.id,
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
 goalId: goal.id,
 milestoneId: milestone.id,
 taskId: task.id,
 goalTitle: goal.title,
 milestoneTitle: milestone.title,
 taskTitle: task.title,
 });
 }
 });

 task.subtasks?.forEach((subtask) => {
 if (subtask.due_date) {
 push({
 id: subtask.id,
 title: subtask.title,
 due_date: subtask.due_date,
 status: subtask.status,
 itemType: 'Subtask',
 goalId: goal.id,
 milestoneId: milestone.id,
 taskId: task.id,
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
 const taskDate = task.scheduled_date || task.due_date;
 if (taskDate) {
 push({
 id: task.id,
 title: task.title,
 due_date: taskDate,
 end_date: task.end_datetime,
 status: task.status,
 itemType: 'Task',
 taskId: task.id,
 });
 }

 task.subtasks?.forEach((subtask) => {
 if (subtask.due_date) {
 push({
 id: subtask.id,
 title: subtask.title,
 due_date: subtask.due_date,
 status: subtask.status,
 itemType: 'Subtask',
 taskId: task.id,
 taskTitle: task.title,
 });
 }
 });
 });

 flatTodos.forEach((todo) => {
 if (todo.due_date) {
 push({
 id: todo.id,
 title: todo.title,
 due_date: todo.due_date,
 status: todo.status,
 itemType: 'Todo',
 taskId: todo.task_id,
 });
 }
 });

 events.forEach((event) => {
 if (event.start_datetime) {
 push({
 id: event.id,
 title: event.title,
 due_date: event.start_datetime,
 end_date: event.end_datetime,
 status: event.status,
 itemType: 'Event',
 });
 }
 });

 return items;
};

export const filterItemsByDate = (items: CalendarItem[], date: Date): CalendarItem[] => {
 const target = calendarDateKey(date);
 return items.filter((item) => calendarDateKey(parseCalendarDate(item.due_date)) === target);
};

export const calendarItemHref = (item: CalendarItem): string => {
 switch (item.itemType) {
 case 'Goal':
 return `/goal/${item.goalId ?? item.id}`;
 case 'Milestone':
 return `/milestone/${item.milestoneId ?? item.id}`;
 case 'Task':
 return `/task/${item.taskId ?? item.id}`;
 case 'Subtask':
 case 'Todo':
 return item.taskId ? `/task/${item.taskId}` : `/${item.itemType.toLowerCase()}`;
 case 'Event':
 return '/calendar';
 default:
 return '/calendar';
 }
};

export const isCalendarItemActionable = (item: CalendarItem): boolean =>
 item.status !== StatusType.FINISHED && item.status !== StatusType.CANCELLED;

export const sortCalendarItemsByDate = (items: CalendarItem[]): CalendarItem[] =>
 [...items].sort((a, b) => parseCalendarDate(a.due_date).getTime() - parseCalendarDate(b.due_date).getTime());

// Pre-build a map keyed by local YYYY-MM-DD for O(1) lookup per cell.
// Use this when rendering a full month / year calendar grid so we avoid
// re-filtering the full items list on every tile.
export const groupItemsByDate = (items: CalendarItem[]): Map<string, CalendarItem[]> => {
 const map = new Map<string, CalendarItem[]>();
 items.forEach((item) => {
 const key = calendarDateKey(parseCalendarDate(item.due_date));
 const bucket = map.get(key);
 if (bucket) bucket.push(item);
 else map.set(key, [item]);
 });
 return map;
};
