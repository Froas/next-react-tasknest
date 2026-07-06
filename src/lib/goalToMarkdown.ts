import { GoalItem as Goal, MilestoneItem as Milestone, TaskItem as Task, TodoItem as Todo, SubtaskItem as Subtask, StatusType } from './types';

const checkbox = (status: StatusType) =>
 status === StatusType.FINISHED ? '[x]' : '[ ]';

const indentLines = (text: string, prefix: string): string =>
 text
 .split('\n')
 .map((line) => `${prefix}${line}`)
 .join('\n');

const formatDateRange = (start?: string, end?: string): string => {
 const fmt = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');
 if (start && end) return ` _(${fmt(start)} → ${fmt(end)})_`;
 if (end) return ` _(due ${fmt(end)})_`;
 return '';
};

// Render a single goal as a self-contained markdown document. Useful for
// pasting into Notion / Obsidian / GitHub issues / wiki pages, or as plain
// text backup independent of our JSON export format.
export const goalToMarkdown = (goal: Goal): string => {
 const out: string[] = [];

 out.push(`# ${goal.title}`);
 out.push('');
 out.push(`> Status: ${goal.status} · Priority: ${goal.priority}${formatDateRange(goal.start_datetime, goal.end_datetime)}`);
 if (goal.description?.trim()) {
 out.push('');
 out.push(goal.description);
 }
 out.push('');

 const milestones = goal.milestones ?? [];
 milestones.forEach((m: Milestone, i) => {
 out.push(`## ${i + 1}. ${m.title}${formatDateRange(undefined, m.due_date ?? m.end_datetime)}`);
 if (m.description?.trim()) {
 out.push('');
 out.push(m.description);
 }
 out.push('');

 const tasks = m.tasks ?? [];
 if (tasks.length === 0) {
 out.push('_No tasks yet._');
 out.push('');
 return;
 }

 tasks.forEach((t: Task) => {
 out.push(`- ${checkbox(t.status)} **${t.title}**${formatDateRange(undefined, t.due_date)}`);
 if (t.description?.trim()) {
 out.push(indentLines(t.description, ' '));
 }
 const subs: Subtask[] = t.subtasks ?? [];
 subs.forEach((s) => {
 out.push(` - ${checkbox(s.status)} ${s.title}${formatDateRange(undefined, s.due_date)}`);
 });
 const todos = (t.todos as Todo[]) ?? [];
 todos.forEach((td) => {
 const recur = td.repeat_interval ? ` _(${td.repeat_interval})_` : '';
 out.push(` - ${checkbox(td.status)} ${td.title}${recur}${formatDateRange(undefined, td.due_date)}`);
 });
 });
 out.push('');
 });

 return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
};

export const downloadMarkdown = (filename: string, content: string) => {
 if (typeof window === 'undefined') return;
 const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = filename;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 URL.revokeObjectURL(url);
};
