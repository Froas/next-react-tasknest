import { GoalItem as Goal, MilestoneItem as Milestone, TaskItem as Task, TodoItem as Todo, Event } from './types';

export interface ExportPayload {
 version: 1;
 exportedAt: string;
 goals: Goal[];
 milestones: Milestone[];
 tasks: Task[];
 todos: Todo[];
 events: Event[];
}

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
 tasks,
 todos,
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
 resolve(parsed);
 } catch (err) {
 reject(err instanceof Error ? err : new Error('Invalid JSON'));
 }
 };
 reader.readAsText(file);
 });
