'use client';

import { useEffect, useState } from 'react';
import { goalsApi, metricDefinitionsApi, milestonesApi, subtasksApi, tasksApi, todosApi, type MetricDefinitionItem } from '@/lib/api';
import { GoalItem, MilestoneItem, PriorityType, StatusType, TaskItem, TaskKind } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { toast } from '@/store/useToast';
import {
 buildGoalCompletionRule,
 GoalMeasurementDraft,
 goalMeasurementNeedsMetric,
 validateGoalMeasurement,
} from './goalMeasurement';

export type GoalFlowActionMode = 'once' | 'routine';
export type GoalFlowTrackingDraft = {
 trackingMode?: 'bounded' | 'staged';
 routineSeriesKey?: string;
 stageOrder?: number;
};

const normalizeTask = (task: TaskItem): TaskItem => ({
 ...task,
 todos: task.todos ?? [],
 subtasks: task.subtasks ?? [],
});

const normalizeMilestone = (milestone: MilestoneItem): MilestoneItem => ({
 ...milestone,
 tasks: (milestone.tasks ?? []).map(normalizeTask),
});

export const toApiDateTime = (date?: string): string | undefined => {
 if (!date) return undefined;
 if (date.includes('T')) return date;
 return new Date(`${date}T12:00:00`).toISOString();
};

/** Owns goal-builder commands, REST payloads and shared-store synchronization. */
export function useGoalFlow(initialGoalId?: string) {
 const [goal, setGoal] = useState<GoalItem | null>(null);
 const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
 const [routines, setRoutines] = useState<TaskItem[]>([]);
 const [goalMetrics, setGoalMetrics] = useState<MetricDefinitionItem[]>([]);
 const [creatingGoal, setCreatingGoal] = useState(false);
 const [loadingGoal, setLoadingGoal] = useState(Boolean(initialGoalId));
 const [reorderingMilestones, setReorderingMilestones] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const addGoal = useStore((state) => state.addGoal);
 const updateGoalInStore = useStore((state) => state.updateGoal);
 const addMilestoneToGoal = useStore((state) => state.addMilestoneToGoal);
 const reorderMilestonesInGoal = useStore((state) => state.reorderMilestonesInGoal);
 const updateMilestoneInGoals = useStore((state) => state.updateMilestoneInGoals);
 const addTaskToMilestoneInGoal = useStore((state) => state.addTaskToMilestoneInGoal);
 const updateTaskInGoals = useStore((state) => state.updateTaskInGoals);
 const updateTodoInGoals = useStore((state) => state.updateTodoInGoals);
 const updateSubtaskInGoals = useStore((state) => state.updateSubtaskInGoals);

 useEffect(() => {
 if (!initialGoalId) return;
 let cancelled = false;
 setLoadingGoal(true);
 setError(null);

 void goalsApi.getById(initialGoalId, {
 include_milestones: true,
 include_tasks: true,
 include_subtasks: true,
 include_todos: true,
 }).then((loaded) => {
 if (cancelled) return;
 const normalizedMilestones = (loaded.milestones ?? []).map(normalizeMilestone);
 const normalizedTasks = (loaded.tasks ?? []).map(normalizeTask);
 const normalized: GoalItem = {
 ...loaded,
 description: loaded.description ?? '',
 milestones: normalizedMilestones,
 tasks: normalizedTasks,
 };
 setGoal(normalized);
 setMilestones(normalizedMilestones);
 setRoutines(normalizedTasks.filter((task) => task.kind === 'routine'));
 updateGoalInStore(normalized);
 void metricDefinitionsApi.getAll().then((metrics) => {
 if (!cancelled) setGoalMetrics(metrics.filter((metric) => metric.goal_id === initialGoalId));
 }).catch((cause) => {
 console.error('Failed to load goal metrics for builder:', cause);
 });
 }).catch((cause) => {
 if (cancelled) return;
 const message = cause instanceof Error ? cause.message : 'Failed to load goal';
 setError(message);
 toast.error(message);
 }).finally(() => {
 if (!cancelled) setLoadingGoal(false);
 });

 return () => {
 cancelled = true;
 };
 }, [initialGoalId, updateGoalInStore]);

 const createGoal = async (rawTitle: string) => {
 const title = rawTitle.trim();
 if (!title || creatingGoal) return;
 setCreatingGoal(true);
 setError(null);
 try {
 const created = await goalsApi.create({
 title,
 description: '',
 status: StatusType.OUTSTANDING,
 priority: PriorityType.HIGH,
 journey_theme_id: 'mountain',
 });
 const normalized: GoalItem = {
 ...created,
 description: created.description ?? '',
 milestones: created.milestones ?? [],
 tasks: created.tasks ?? [],
 };
 setGoal(normalized);
 setMilestones(normalized.milestones);
 setRoutines((normalized.tasks ?? []).filter((task) => task.kind === 'routine'));
 addGoal(normalized);
 } catch (cause) {
 const message = cause instanceof Error ? cause.message : 'Failed to create goal';
 setError(message);
 toast.error(message);
 throw cause;
 } finally {
 setCreatingGoal(false);
 }
 };

 const saveGoalDetails = async (successCriteria: string, endDate?: string) => {
 if (!goal) return;
 const updated = await goalsApi.update({
 id: goal.id,
 success_criteria: successCriteria,
 end_datetime: toApiDateTime(endDate),
 });
 const merged: GoalItem = { ...goal, ...updated, milestones, tasks: goal.tasks ?? routines };
 setGoal(merged);
 updateGoalInStore(merged);
 toast.success('Goal details saved');
 };

 const saveEntityMeasurement = async (
 scope: 'goal' | 'milestone' | 'task',
 entity: GoalItem | MilestoneItem | TaskItem,
 draft: GoalMeasurementDraft,
 ) => {
 if (!goal) return;
 const validationError = validateGoalMeasurement(draft);
 if (validationError) throw new Error(validationError);

 let metricDefinitionId: string | undefined;
 if (goalMeasurementNeedsMetric(draft.mode)) {
 const metricName = draft.metricName.trim();
 const metrics = await metricDefinitionsApi.getAll();
 const existing = metrics.find((metric) => (
 metric.goal_id === goal.id
 && (scope !== 'goal' || (!metric.milestone_id && !metric.task_id))
 && (scope !== 'milestone' || metric.milestone_id === entity.id)
 && (scope !== 'task' || metric.task_id === entity.id)
 && metric.name.trim().toLocaleLowerCase() === metricName.toLocaleLowerCase()
 ));
 const metric = existing
 ? await metricDefinitionsApi.update({
 id: existing.id,
 name: metricName,
 unit: draft.metricUnit.trim() || null,
 input_type: 'number',
 show_on_today: true,
 ...(scope === 'milestone' ? { milestone_id: entity.id } : {}),
 ...(scope === 'task' ? { task_id: entity.id } : {}),
 })
 : await metricDefinitionsApi.create({
 name: metricName,
 unit: draft.metricUnit.trim() || null,
 input_type: 'number',
 show_on_today: true,
 goal_id: goal.id,
 ...(scope === 'milestone' ? { milestone_id: entity.id } : {}),
 ...(scope === 'task' ? { task_id: entity.id } : {}),
 });
 metricDefinitionId = metric.id;
 setGoalMetrics((current) => {
 const withoutMetric = current.filter((item) => item.id !== metric.id);
 return [...withoutMetric, metric].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
 });
 }

 const completionRule = buildGoalCompletionRule(draft, metricDefinitionId);
 if (scope === 'goal') {
 const updated = await goalsApi.update({ id: entity.id, completion_rule: completionRule });
 const merged: GoalItem = { ...goal, ...updated, milestones, tasks: goal.tasks ?? routines };
 setGoal(merged);
 updateGoalInStore(merged);
 } else if (scope === 'milestone') {
 const milestone = entity as MilestoneItem;
 const updated = await milestonesApi.update({ id: milestone.id, completion_rule: completionRule });
 const merged = normalizeMilestone({ ...milestone, ...updated, tasks: milestone.tasks });
 setMilestones((items) => items.map((item) => item.id === merged.id ? merged : item));
 setGoal((current) => current ? { ...current, milestones: current.milestones.map((item) => item.id === merged.id ? merged : item) } : current);
 updateMilestoneInGoals(merged);
 } else {
 const task = entity as TaskItem;
 const updated = await tasksApi.update({ id: task.id, completion_rule: completionRule });
 const merged = normalizeTask({ ...task, ...updated, todos: task.todos, subtasks: task.subtasks });
 setMilestones((items) => items.map((milestone) => ({
 ...milestone,
 tasks: milestone.tasks.map((item) => item.id === merged.id ? merged : item),
 })));
 setRoutines((items) => items.map((item) => item.id === merged.id ? merged : item));
 updateTaskInGoals(merged);
 }
 toast.success(`${scope[0].toUpperCase()}${scope.slice(1)} completion rule saved`);
 };

 const saveGoalMeasurement = (draft: GoalMeasurementDraft) => goal
 ? saveEntityMeasurement('goal', goal, draft)
 : Promise.resolve();

 const saveMilestoneMeasurement = (milestone: MilestoneItem, draft: GoalMeasurementDraft) =>
 saveEntityMeasurement('milestone', milestone, draft);

 const saveTaskMeasurement = (task: TaskItem, draft: GoalMeasurementDraft) =>
 saveEntityMeasurement('task', task, draft);

 const createMilestone = async (title: string) => {
 if (!goal) return;
 const created = await milestonesApi.create({
 title,
 description: '',
 status: milestones.length === 0 ? StatusType.STARTED : StatusType.OUTSTANDING,
 priority: PriorityType.MEDIUM,
 goal_id: goal.id,
 position: milestones.length + 1,
 });
 const normalized = normalizeMilestone(created);
 setMilestones((items) => [...items, normalized]);
 setGoal((current) => current ? { ...current, milestones: [...current.milestones, normalized] } : current);
 addMilestoneToGoal(normalized, goal.id);
 };

 const reorderMilestones = async (ordered: MilestoneItem[]) => {
 if (!goal || reorderingMilestones) return;
 const previous = milestones;
 const previousIds = previous.map((item) => item.id);
 const next = ordered.map((item, index) => ({ ...item, position: index + 1 }));
 const nextIds = next.map((item) => item.id);
 if (previousIds.join(',') === nextIds.join(',')) return;

 setReorderingMilestones(true);
 setMilestones(next);
 setGoal((current) => current ? { ...current, milestones: next } : current);
 reorderMilestonesInGoal(goal.id, nextIds);
 try {
 await milestonesApi.reorder(nextIds);
 } catch (cause) {
 setMilestones(previous);
 setGoal((current) => current ? { ...current, milestones: previous } : current);
 reorderMilestonesInGoal(goal.id, previousIds);
 const message = cause instanceof Error ? cause.message : 'Failed to save milestone order';
 toast.error(message);
 throw cause;
 } finally {
 setReorderingMilestones(false);
 }
 };

 const updateMilestone = async (
 milestone: MilestoneItem,
 patch: Pick<MilestoneItem, 'success_criteria' | 'due_date'>,
 ) => {
 const updated = await milestonesApi.update({
 id: milestone.id,
 success_criteria: patch.success_criteria,
 due_date: toApiDateTime(patch.due_date),
 });
 const merged = normalizeMilestone({ ...milestone, ...updated, tasks: milestone.tasks });
 setMilestones((items) => items.map((item) => (item.id === milestone.id ? merged : item)));
 setGoal((current) => current ? {
 ...current,
 milestones: current.milestones.map((item) => (item.id === milestone.id ? merged : item)),
 } : current);
 updateMilestoneInGoals(merged);
 toast.success('Milestone details saved');
 };

 const createTask = async (milestone: MilestoneItem, title: string, kind: Extract<TaskKind, 'project' | 'challenge'> = 'project') => {
 if (!goal) return;
 const created = await tasksApi.create({
 title,
 description: '',
 status: kind === 'challenge' && [StatusType.STARTED, StatusType.IN_PROGRESS].includes(milestone.status)
 ? StatusType.STARTED
 : StatusType.OUTSTANDING,
 priority: PriorityType.MEDIUM,
 kind,
 scope: 'milestone',
 goal_id: goal.id,
 milestone_id: milestone.id,
 todos: [],
 subtasks: [],
 completion_rule: kind === 'challenge' ? {
 type: 'consistency',
 label: title,
 required_done: 7,
 window_days: 7,
 } : { type: 'structural' },
 });
 const normalized = normalizeTask(created);
 setMilestones((items) => items.map((item) => (
 item.id === milestone.id ? { ...item, tasks: [...item.tasks, normalized] } : item
 )));
 addTaskToMilestoneInGoal(normalized, milestone.id, goal.id);
 };

 const updateTask = async (
 task: TaskItem,
 patch: Pick<TaskItem, 'success_criteria' | 'due_date'>,
 ) => {
 const updated = await tasksApi.update({
 id: task.id,
 success_criteria: patch.success_criteria,
 due_date: toApiDateTime(patch.due_date),
 });
 const merged = normalizeTask({ ...task, ...updated, todos: task.todos, subtasks: task.subtasks });
 setMilestones((items) => items.map((milestone) => ({
 ...milestone,
 tasks: milestone.tasks.map((item) => (item.id === task.id ? merged : item)),
 })));
 setRoutines((items) => items.map((item) => (item.id === task.id ? merged : item)));
 updateTaskInGoals(merged);
 toast.success(`${task.kind === 'routine' ? 'Routine' : 'Task'} details saved`);
 };

 const createRoutine = async (title: string) => {
 if (!goal) return;
 const created = await tasksApi.create({
 title,
 description: '',
 status: StatusType.STARTED,
 priority: PriorityType.MEDIUM,
 kind: 'routine',
 scope: 'goal',
 goal_id: goal.id,
 todos: [],
 subtasks: [],
 });
 const normalized = normalizeTask(created);
 setRoutines((items) => [...items, normalized]);
 setGoal((current) => current ? { ...current, tasks: [...(current.tasks ?? []), normalized] } : current);
 updateTaskInGoals(normalized);
 };

 const updateTaskChildren = (taskId: string, updater: (task: TaskItem) => TaskItem) => {
 setMilestones((items) => items.map((milestone) => ({
 ...milestone,
 tasks: milestone.tasks.map((task) => (task.id === taskId ? updater(task) : task)),
 })));
 setRoutines((items) => items.map((task) => (task.id === taskId ? updater(task) : task)));
 };

 const createAction = async (
 task: TaskItem,
 title: string,
 mode: GoalFlowActionMode,
 repeatInterval: string,
 tracking: GoalFlowTrackingDraft = {},
 ) => {
 if (mode === 'routine') {
 const parentMilestone = task.milestone_id
 ? milestones.find((milestone) => milestone.id === task.milestone_id)
 : undefined;
 const trackingState = task.kind === 'routine'
 ? 'active'
 : parentMilestone && [StatusType.STARTED, StatusType.IN_PROGRESS].includes(parentMilestone.status)
 ? 'active'
 : 'planned';
 const created = await todosApi.create({
 title,
 description: '',
 status: StatusType.OUTSTANDING,
 priority: PriorityType.MEDIUM,
 repeat_interval: repeatInterval,
 task_id: task.id,
 tracking_mode: task.kind === 'routine' ? 'ongoing' : task.kind === 'challenge' ? tracking.trackingMode ?? 'bounded' : undefined,
 tracking_state: task.kind === 'routine' || task.kind === 'challenge' ? trackingState : undefined,
 routine_series_key: task.kind === 'challenge' && tracking.trackingMode === 'staged'
 ? tracking.routineSeriesKey?.trim() || task.title
 : undefined,
 stage_order: task.kind === 'challenge' && tracking.trackingMode === 'staged'
 ? Math.max(1, tracking.stageOrder ?? 1)
 : 1,
 });
 updateTodoInGoals(created);
 updateTaskChildren(task.id, (item) => ({ ...item, todos: [...item.todos, created] }));
 return;
 }

 const created = await subtasksApi.create({
 title,
 description: '',
 status: StatusType.OUTSTANDING,
 priority: PriorityType.MEDIUM,
 task_id: task.id,
 });
 updateSubtaskInGoals(created);
 updateTaskChildren(task.id, (item) => ({ ...item, subtasks: [...item.subtasks, created] }));
 };

 return {
 goal,
 milestones,
 routines,
 goalMetrics,
 creatingGoal,
 loadingGoal,
 reorderingMilestones,
 error,
 createGoal,
 saveGoalDetails,
 saveGoalMeasurement,
 saveMilestoneMeasurement,
 saveTaskMeasurement,
 createMilestone,
 reorderMilestones,
 updateMilestone,
 createTask,
 updateTask,
 createRoutine,
 createAction,
 };
}
