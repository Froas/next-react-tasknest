import type { TemplateBlueprint, TemplateBlueprintTask } from './api';

export type TemplateDraftTask = {
 title: string;
 description: string;
 kind: 'project' | 'routine' | 'challenge';
 priority: 'low' | 'medium' | 'high';
 subtaskTitles: string;
 todoTitles: string;
};

export type TemplateDraftMilestone = {
 title: string;
 description: string;
 dueDateOffsetDays: number;
 tasks: TemplateDraftTask[];
};

export type TemplateDraft = {
 title: string;
 description: string;
 tags: string;
 durationDays: number;
 priority: 'low' | 'medium' | 'high';
 goalTasks: TemplateDraftTask[];
 milestones: TemplateDraftMilestone[];
};

export const emptyDraftTask = (): TemplateDraftTask => ({
 title: '',
 description: '',
 kind: 'project',
 priority: 'medium',
 subtaskTitles: '',
 todoTitles: '',
});

export const emptyTemplateDraft = (): TemplateDraft => ({
 title: '',
 description: '',
 tags: '',
 durationDays: 84,
 priority: 'medium',
 goalTasks: [],
 milestones: [],
});

const splitTitles = (value: string) =>
 value
 .split(/\n|,/)
 .map((title) => title.trim())
 .filter(Boolean);

const buildTask = (task: TemplateDraftTask, scope: 'goal' | 'milestone'): TemplateBlueprintTask => {
 const includeSubtasks = task.kind === 'project' || task.kind === 'challenge';
 const includeTodos = task.kind === 'routine' || task.kind === 'challenge';

 return {
 title: task.title.trim(),
 description: task.description.trim(),
 kind: task.kind,
 scope,
 priority: task.priority,
 status: task.kind === 'project' ? 'outstanding' : 'started',
 ...(includeSubtasks
 ? { subtasks: splitTitles(task.subtaskTitles).map((title) => ({ title, priority: task.priority })) }
 : {}),
 ...(includeTodos
 ? { todos: splitTitles(task.todoTitles).map((title) => ({ title, repeat_interval: 'daily', priority: task.priority })) }
 : {}),
 };
};

export const templateDraftToBlueprint = (draft: TemplateDraft): TemplateBlueprint => ({
 schema_version: 1,
 source: { type: 'scratch' },
 status: 'outstanding',
 priority: draft.priority,
 duration_days: Math.max(1, Number(draft.durationDays) || 84),
 goal_tasks: draft.goalTasks
 .filter((task) => task.title.trim())
 .map((task) => buildTask(task, 'goal')),
 milestones: draft.milestones
 .filter((milestone) => milestone.title.trim())
 .map((milestone) => ({
 title: milestone.title.trim(),
 description: milestone.description.trim(),
 status: 'outstanding',
 priority: draft.priority,
 due_date_offset_days: Math.max(1, Number(milestone.dueDateOffsetDays) || 1),
 tasks: milestone.tasks
 .filter((task) => task.title.trim())
 .map((task) => buildTask(task, 'milestone')),
 })),
});

export const parseTemplateTags = (value: string) =>
 Array.from(new Set(splitTitles(value).map((tag) => tag.replace(/^#/, '').toLowerCase())));
