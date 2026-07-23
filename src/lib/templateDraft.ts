import type { TemplateBlueprint, TemplateBlueprintTask } from './api';

export type TemplateDraftTask = {
 title: string;
 description: string;
 kind: 'project' | 'routine' | 'challenge';
 priority: 'low' | 'medium' | 'high';
 subtaskTitles: string;
 todoTitles: string;
 trackingMode?: 'bounded' | 'staged';
 requiredCompletions?: number;
 windowDays?: number;
 routineSeriesKey?: string;
 stageOrder?: number;
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

export const emptyDraftTask = (kind: TemplateDraftTask['kind'] = 'project'): TemplateDraftTask => ({
 title: '',
 description: '',
 kind,
 priority: 'medium',
 subtaskTitles: '',
 todoTitles: '',
 trackingMode: 'bounded',
 requiredCompletions: 7,
 windowDays: 7,
 routineSeriesKey: '',
 stageOrder: 1,
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

const buildTask = (task: TemplateDraftTask, scope: 'goal' | 'milestone', active = true): TemplateBlueprintTask => {
 const includeSubtasks = task.kind === 'project' || task.kind === 'challenge';
 const includeTodos = task.kind === 'routine' || task.kind === 'challenge';

 const isChallenge = task.kind === 'challenge';
 return {
 title: task.title.trim(),
 description: task.description.trim(),
 kind: task.kind,
 scope,
 priority: task.priority,
 status: task.kind === 'project'
 ? 'outstanding'
 : task.kind === 'routine' || active
 ? 'started'
 : 'outstanding',
 ...(includeSubtasks
 ? { subtasks: splitTitles(task.subtaskTitles).map((title) => ({ title, priority: task.priority })) }
 : {}),
 ...(includeTodos
 ? { todos: splitTitles(task.todoTitles).map((title) => ({
 title,
 repeat_interval: 'daily',
 priority: task.priority,
 tracking_mode: task.kind === 'routine' ? 'ongoing' as const : (task.trackingMode ?? 'bounded'),
 tracking_state: task.kind === 'routine' || active ? 'active' as const : 'planned' as const,
 ...(isChallenge && task.trackingMode === 'staged' ? {
 routine_series_key: task.routineSeriesKey?.trim() || task.title.trim(),
 stage_order: Math.max(1, Number(task.stageOrder) || 1),
 } : {}),
 })) }
 : {}),
 ...(isChallenge ? {
 completion_rule: {
 type: 'consistency' as const,
 label: task.title.trim(),
 required_done: Math.max(1, Number(task.requiredCompletions) || 7),
 window_days: Math.max(1, Number(task.windowDays) || 7),
 },
 } : {}),
 };
};

export const templateDraftToBlueprint = (draft: TemplateDraft): TemplateBlueprint => ({
 schema_version: 3,
 source: { type: 'scratch' },
 status: 'started',
 priority: draft.priority,
 duration_days: Math.max(1, Number(draft.durationDays) || 84),
 goal_tasks: draft.goalTasks
 .filter((task) => task.title.trim() && task.kind === 'routine')
 .map((task) => buildTask(task, 'goal')),
 milestones: draft.milestones
 .filter((milestone) => milestone.title.trim())
 .map((milestone, milestoneIndex) => ({
 title: milestone.title.trim(),
 description: milestone.description.trim(),
 status: milestoneIndex === 0 ? 'started' : 'outstanding',
 priority: draft.priority,
 due_date_offset_days: Math.max(1, Number(milestone.dueDateOffsetDays) || 1),
 tasks: milestone.tasks
 .filter((task) => task.title.trim())
 .map((task) => buildTask(task, 'milestone', milestoneIndex === 0)),
 })),
});

export const parseTemplateTags = (value: string) =>
 Array.from(new Set(splitTitles(value).map((tag) => tag.replace(/^#/, '').toLowerCase())));
