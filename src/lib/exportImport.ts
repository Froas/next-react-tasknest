import { GoalItem as Goal, MilestoneItem as Milestone, TaskItem as Task, TodoItem as Todo, SubtaskItem as Subtask, Event } from './types';

export interface ExportPayload {
 version: 1;
 exportedAt: string;
 goals: Goal[];
 milestones: Milestone[];
 tasks: Task[];
 todos: Todo[];
 subtasks: Subtask[];
 events: Event[];
 daily_logs?: Array<{
 id: string;
 date: string;
 color?: 'green' | 'yellow' | 'red' | 'black' | null;
 note?: string | null;
 trigger?: string | null;
 what_helped?: string | null;
 tomorrow_minimum?: string | null;
 finalized_at?: string | null;
 finalized_by?: string | null;
 }>;
 todo_occurrences?: Array<{
 id?: string | null;
 date: string;
 status?: 'open' | 'done' | 'minimum' | 'skipped' | 'missed' | 'excused' | null;
 value?: string | null;
 note?: string | null;
 completed_at?: string | null;
 todo_id?: string | null;
 daily_log_id?: string | null;
 }>;
 metric_definitions?: Array<{
 id?: string | null;
 name: string;
 unit?: string | null;
 input_type?: 'number' | 'text' | 'boolean' | null;
 show_on_today?: boolean | null;
 goal_id?: string | null;
 task_id?: string | null;
 position?: number | null;
 }>;
 metric_entries?: Array<{
 id?: string | null;
 date: string;
 value?: string | null;
 numeric_value?: number | null;
 note?: string | null;
 metric_definition_id?: string | null;
 daily_log_id?: string | null;
 }>;
}

const uniqueById = <T extends { id: string }>(items: T[]): T[] => {
 const seen = new Set<string>();
 return items.filter((item) => {
 if (seen.has(item.id)) return false;
 seen.add(item.id);
 return true;
 });
};

const collectTasks = (goals: Goal[], milestones: Milestone[], tasks: Task[]): Task[] => uniqueById([
 ...tasks,
 ...milestones.flatMap((milestone) => milestone.tasks ?? []),
 ...goals.flatMap((goal) => goal.tasks ?? []),
 ...goals.flatMap((goal) =>
 (goal.milestones ?? []).flatMap((milestone) => milestone.tasks ?? [])
 ),
]);

const collectTodos = (goals: Goal[], milestones: Milestone[], tasks: Task[], todos: Todo[]): Todo[] =>
 uniqueById([
 ...todos,
 ...collectTasks(goals, milestones, tasks).flatMap((task) => task.todos ?? []),
 ]);

const collectSubtasks = (goals: Goal[], milestones: Milestone[], tasks: Task[]): Subtask[] =>
 uniqueById(collectTasks(goals, milestones, tasks).flatMap((task) => task.subtasks ?? []));

// Serialize the entire goal-tree + supporting collections to a downloadable
// JSON file. Stringify in pretty form so the user can read/edit it.
export const buildExportPayload = (
 goals: Goal[],
 milestones: Milestone[],
 tasks: Task[],
 todos: Todo[],
 events: Event[]
): ExportPayload => ({
 version: 1,
 exportedAt: new Date().toISOString(),
 goals,
 milestones,
 tasks: collectTasks(goals, milestones, tasks),
 todos: collectTodos(goals, milestones, tasks, todos),
 subtasks: collectSubtasks(goals, milestones, tasks),
 events,
});

export const downloadJsonFile = (filename: string, data: unknown) => {
 if (typeof window === 'undefined') return;
 const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = filename;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 URL.revokeObjectURL(url);
};

export const parseImportFile = (file: File): Promise<ExportPayload> =>
 new Promise((resolve, reject) => {
 const reader = new FileReader();
 reader.onerror = () => reject(new Error('Failed to read file'));
 reader.onload = () => {
 try {
 const text = reader.result as string;
 const parsed = JSON.parse(text) as ExportPayload;
 if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) {
 reject(new Error('Unsupported or invalid export file'));
 return;
 }
 parsed.goals = parsed.goals ?? [];
 parsed.milestones = parsed.milestones ?? [];
 parsed.tasks = parsed.tasks ?? [];
 parsed.todos = parsed.todos ?? [];
 parsed.subtasks = parsed.subtasks ?? [];
 parsed.events = parsed.events ?? [];
 parsed.daily_logs = parsed.daily_logs ?? [];
 parsed.todo_occurrences = parsed.todo_occurrences ?? [];
 parsed.metric_definitions = parsed.metric_definitions ?? [];
 parsed.metric_entries = parsed.metric_entries ?? [];
 resolve(parsed);
 } catch (err) {
 reject(err instanceof Error ? err : new Error('Invalid JSON'));
 }
 };
 reader.readAsText(file);
 });
