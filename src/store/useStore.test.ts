import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useStore } from './useStore';
import { StatusType, PriorityType, GoalItem, MilestoneItem, TaskItem, TodoItem, SubtaskItem } from '@/lib/types';
import { goalsApi } from '@/lib/api';

const goal = (id: string, milestones: MilestoneItem[] = []): GoalItem => ({
 id,
 title: `Goal ${id}`,
 description: '',
 status: StatusType.IN_PROGRESS,
 priority: PriorityType.MEDIUM,
 milestones,
});

const milestone = (id: string, goalId: string, tasks: TaskItem[] = []): MilestoneItem => ({
 id,
 title: `Milestone ${id}`,
 description: '',
 status: StatusType.IN_PROGRESS,
 priority: PriorityType.MEDIUM,
 goal_id: goalId,
 tasks,
});

const task = (id: string, milestoneId: string, todos: TodoItem[] = []): TaskItem => ({
 id,
 title: `Task ${id}`,
 description: '',
 status: StatusType.OUTSTANDING,
 priority: PriorityType.MEDIUM,
 milestone_id: milestoneId,
 subtasks: [],
 todos,
});

const goalTask = (id: string, goalId: string, todos: TodoItem[] = []): TaskItem => ({
 id,
 title: `Goal Task ${id}`,
 description: '',
 status: StatusType.STARTED,
 priority: PriorityType.MEDIUM,
 goal_id: goalId,
 scope: 'goal',
 kind: 'routine',
 subtasks: [],
 todos,
});

const todo = (id: string, taskId: string): TodoItem => ({
 id,
 title: `Todo ${id}`,
 description: '',
 status: StatusType.OUTSTANDING,
 priority: PriorityType.MEDIUM,
 task_id: taskId,
});

const subtask = (id: string, taskId: string): SubtaskItem => ({
 id,
 title: `Subtask ${id}`,
 description: '',
 status: StatusType.OUTSTANDING,
 priority: PriorityType.MEDIUM,
 task_id: taskId,
});

describe('useStore — nested updates', () => {
 beforeEach(() => {
 useStore.setState({
 goals: [],
 isLoadingGoals: false,
 goalsError: null,
 milestones: [],
 tasks: [],
 todos: [],
 events: [],
 goalsFetchedAt: null,
 milestonesFetchedAt: null,
 tasksFetchedAt: null,
 todosFetchedAt: null,
 eventsFetchedAt: null,
 });
 });

 afterEach(() => {
 vi.restoreAllMocks();
 });

 it('refreshes goals silently without enabling the global loading state', async () => {
 vi.spyOn(goalsApi, 'getAll').mockResolvedValue([goal('g1')]);
 vi.spyOn(goalsApi, 'getById').mockResolvedValue(goal('g1'));

 const refresh = useStore.getState().fetchGoals({ force: true, silent: true });

 expect(useStore.getState().isLoadingGoals).toBe(false);
 await refresh;
 expect(useStore.getState().isLoadingGoals).toBe(false);
 expect(useStore.getState().goals.map((item) => item.id)).toEqual(['g1']);
 });

 it('runs a trailing forced refresh when another mutation invalidates an in-flight request', async () => {
 let resolveFirst: ((value: GoalItem[]) => void) | undefined;
 vi.spyOn(goalsApi, 'getAll')
 .mockImplementationOnce(() => new Promise<GoalItem[]>((resolve) => { resolveFirst = resolve; }))
 .mockResolvedValueOnce([goal('g2')]);
 vi.spyOn(goalsApi, 'getById').mockImplementation(async (id) => goal(id));

 const firstRefresh = useStore.getState().fetchGoals({ force: true, silent: true });
 void useStore.getState().fetchGoals({ force: true, silent: true });
 expect(goalsApi.getAll).toHaveBeenCalledTimes(1);

 resolveFirst?.([goal('g1')]);
 await firstRefresh;
 await vi.waitFor(() => expect(goalsApi.getAll).toHaveBeenCalledTimes(2));
 await vi.waitFor(() => expect(useStore.getState().goals.map((item) => item.id)).toEqual(['g2']));
 expect(useStore.getState().isLoadingGoals).toBe(false);
 });

 it('addGoal normalises milestones to empty array', () => {
 useStore.getState().addGoal({ ...goal('g1'), milestones: undefined as any });
 expect(useStore.getState().goals[0].milestones).toEqual([]);
 });

 it('setGoals hydrates flat milestone/task/todo slices from nested goal data', () => {
 const td = todo('td1', 't1');
 const t = task('t1', 'm1', [td]);
 const m = milestone('m1', 'g1', [t]);
 useStore.getState().setGoals([goal('g1', [m])]);

 expect(useStore.getState().milestones.map((item) => item.id)).toEqual(['m1']);
 expect(useStore.getState().tasks.map((item) => item.id)).toEqual(['t1']);
 expect(useStore.getState().todos.map((item) => item.id)).toEqual(['td1']);
 });

 it('setGoals hydrates goal-level routine tasks and todos', () => {
 const td = todo('td1', 'rt1');
 const routine = goalTask('rt1', 'g1', [td]);
 useStore.getState().setGoals([{ ...goal('g1'), tasks: [routine] }]);

 expect(useStore.getState().goals[0].tasks?.[0]).toMatchObject({ id: 'rt1', scope: 'goal', goal_id: 'g1' });
 expect(useStore.getState().tasks[0]).toMatchObject({ id: 'rt1', scope: 'goal', goal_id: 'g1' });
 expect(useStore.getState().todos[0]).toMatchObject({ id: 'td1', task_id: 'rt1' });
 });

 it('updateGoal hydrates flat slices when a full goal is fetched later', () => {
 const td = todo('td1', 't1');
 const t = task('t1', 'm1', [td]);
 useStore.getState().addGoal(goal('g1'));
 useStore.getState().updateGoal(goal('g1', [milestone('m1', 'g1', [t])]));

 expect(useStore.getState().milestones[0]).toMatchObject({ id: 'm1', goal_id: 'g1' });
 expect(useStore.getState().tasks[0]).toMatchObject({ id: 't1', milestone_id: 'm1' });
 expect(useStore.getState().todos[0]).toMatchObject({ id: 'td1', task_id: 't1' });
 });

 it('updateTaskInGoals updates nested task across the tree', () => {
 const t = task('t1', 'm1');
 useStore.getState().setGoals([goal('g1', [milestone('m1', 'g1', [t])])]);
 useStore.getState().updateTaskInGoals({ ...t, status: StatusType.FINISHED });
 const updated = useStore.getState().goals[0].milestones[0].tasks[0];
 expect(updated.status).toBe(StatusType.FINISHED);
 });

 it('updateTaskInGoals upserts fetched direct-route tasks', () => {
 const t = task('t1', 'm1');
 useStore.getState().updateTaskInGoals(t);
 expect(useStore.getState().tasks[0]).toMatchObject({ id: 't1', milestone_id: 'm1' });
 });

 it('updateTaskInGoals preserves loaded children from flat API responses', () => {
 const td = todo('td1', 't1');
 const st = subtask('s1', 't1');
 const t = { ...task('t1', 'm1', [td]), subtasks: [st] };
 useStore.setState({
 goals: [goal('g1', [milestone('m1', 'g1', [t])])],
 tasks: [t],
 todos: [td],
 });
 useStore.getState().updateTaskInGoals({
 id: 't1',
 title: 'Task t1 updated',
 description: '',
 status: StatusType.FINISHED,
 priority: PriorityType.MEDIUM,
 milestone_id: 'm1',
 } as any);
 expect(useStore.getState().goals[0].milestones[0].tasks[0].todos).toEqual([td]);
 expect(useStore.getState().goals[0].milestones[0].tasks[0].subtasks).toEqual([st]);
 expect(useStore.getState().tasks[0].todos).toEqual([td]);
 expect(useStore.getState().tasks[0].subtasks).toEqual([st]);
 });

 it('addTaskToMilestoneInGoal syncs goal tree and flat tasks', () => {
 const t = task('t1', 'm1');
 useStore.getState().setGoals([goal('g1', [milestone('m1', 'g1')])]);
 useStore.getState().addTaskToMilestoneInGoal(t, 'm1', 'g1');
 useStore.getState().addTaskToMilestoneInGoal(t, 'm1', 'g1');
 expect(useStore.getState().goals[0].milestones[0].tasks.map((task) => task.id)).toEqual(['t1']);
 expect(useStore.getState().tasks.map((task) => task.id)).toEqual(['t1']);
 });

 it('updateTodoInGoals updates a nested todo', () => {
 const td = todo('td1', 't1');
 const t = task('t1', 'm1', [td]);
 useStore.getState().setGoals([goal('g1', [milestone('m1', 'g1', [t])])]);
 useStore.getState().updateTodoInGoals({ ...td, status: StatusType.FINISHED });
 const updated = useStore.getState().goals[0].milestones[0].tasks[0].todos[0];
 expect(updated.status).toBe(StatusType.FINISHED);
 });

 it('updateTodoInGoals upserts fetched direct todo data', () => {
 const td = todo('td1', 't1');
 useStore.getState().updateTodoInGoals(td);
 expect(useStore.getState().todos[0]).toMatchObject({ id: 'td1', task_id: 't1' });
 });

 it('updateTodoInGoals moves todos between tasks without stale duplicates', () => {
 const td = todo('td1', 't1');
 const source = task('t1', 'm1', [td]);
 const target = task('t2', 'm1');
 useStore.setState({
 goals: [goal('g1', [milestone('m1', 'g1', [source, target])])],
 tasks: [source, target],
 todos: [td],
 });
 useStore.getState().updateTodoInGoals({ ...td, task_id: 't2' });
 expect(useStore.getState().goals[0].milestones[0].tasks[0].todos).toHaveLength(0);
 expect(useStore.getState().goals[0].milestones[0].tasks[1].todos.map((item) => item.id)).toEqual(['td1']);
 expect(useStore.getState().tasks[0].todos).toHaveLength(0);
 expect(useStore.getState().tasks[1].todos.map((item) => item.id)).toEqual(['td1']);
 });

 it('updateTodoInGoals updates todos inside goal-level routines', () => {
 const td = todo('td1', 'rt1');
 const routine = goalTask('rt1', 'g1', [td]);
 useStore.setState({
 goals: [{ ...goal('g1'), tasks: [routine] }],
 tasks: [routine],
 todos: [td],
 });

 useStore.getState().updateTodoInGoals({ ...td, status: StatusType.FINISHED });

 expect(useStore.getState().goals[0].tasks?.[0].todos[0].status).toBe(StatusType.FINISHED);
 expect(useStore.getState().tasks[0].todos[0].status).toBe(StatusType.FINISHED);
 expect(useStore.getState().todos[0].status).toBe(StatusType.FINISHED);
 });

 it('addTodoToTaskInMilestoneInGoal syncs nested task and flat lists', () => {
 const t = task('t1', 'm1');
 const td = todo('td1', 't1');
 useStore.setState({
 goals: [goal('g1', [milestone('m1', 'g1', [t])])],
 tasks: [t],
 });
 useStore.getState().addTodoToTaskInMilestoneInGoal(td, 't1', 'm1', 'g1');
 expect(useStore.getState().goals[0].milestones[0].tasks[0].todos[0].id).toBe('td1');
 expect(useStore.getState().tasks[0].todos[0].id).toBe('td1');
 expect(useStore.getState().todos[0].id).toBe('td1');
 });

 it('updateSubtaskInGoals updates flat task subtasks too', () => {
 const st = subtask('s1', 't1');
 const t = { ...task('t1', 'm1'), subtasks: [st] };
 useStore.setState({
 goals: [goal('g1', [milestone('m1', 'g1', [t])])],
 tasks: [t],
 });
 useStore.getState().updateSubtaskInGoals({ ...st, status: StatusType.FINISHED });
 expect(useStore.getState().goals[0].milestones[0].tasks[0].subtasks[0].status).toBe(StatusType.FINISHED);
 expect(useStore.getState().tasks[0].subtasks[0].status).toBe(StatusType.FINISHED);
 });

 it('deleteTaskFromGoals removes from tree and flat list', () => {
 const t = task('t1', 'm1');
 const td = todo('td1', 't1');
 useStore.setState({
 goals: [goal('g1', [milestone('m1', 'g1', [t])])],
 tasks: [t],
 todos: [td],
 });
 useStore.getState().deleteTaskFromGoals('t1');
 expect(useStore.getState().goals[0].milestones[0].tasks).toHaveLength(0);
 expect(useStore.getState().tasks).toHaveLength(0);
 expect(useStore.getState().todos).toHaveLength(0);
 });

 it('deleteTask also removes nested task and child todos', () => {
 const td = todo('td1', 't1');
 const t = task('t1', 'm1', [td]);
 useStore.setState({
 goals: [goal('g1', [milestone('m1', 'g1', [t])])],
 tasks: [t],
 todos: [td],
 });
 useStore.getState().deleteTask('t1');
 expect(useStore.getState().goals[0].milestones[0].tasks).toHaveLength(0);
 expect(useStore.getState().tasks).toHaveLength(0);
 expect(useStore.getState().todos).toHaveLength(0);
 });

 it('deleteTodo also removes nested todos from goal tree and flat tasks', () => {
 const td = todo('td1', 't1');
 const t = task('t1', 'm1', [td]);
 useStore.setState({
 goals: [goal('g1', [milestone('m1', 'g1', [t])])],
 tasks: [t],
 todos: [td],
 });
 useStore.getState().deleteTodo('td1');
 expect(useStore.getState().goals[0].milestones[0].tasks[0].todos).toHaveLength(0);
 expect(useStore.getState().tasks[0].todos).toHaveLength(0);
 expect(useStore.getState().todos).toHaveLength(0);
 });

 it('deleteTodo also removes goal-level routine todos', () => {
 const td = todo('td1', 'rt1');
 const routine = goalTask('rt1', 'g1', [td]);
 useStore.setState({
 goals: [{ ...goal('g1'), tasks: [routine] }],
 tasks: [routine],
 todos: [td],
 });

 useStore.getState().deleteTodo('td1');

 expect(useStore.getState().goals[0].tasks?.[0].todos).toHaveLength(0);
 expect(useStore.getState().tasks[0].todos).toHaveLength(0);
 expect(useStore.getState().todos).toHaveLength(0);
 });

 it('moveTaskToMilestone relocates a task between milestones', () => {
 const t = task('t1', 'm1');
 useStore.getState().setGoals([
 goal('g1', [milestone('m1', 'g1', [t]), milestone('m2', 'g1')]),
 ]);
 useStore.getState().moveTaskToMilestone('t1', 'm2');
 const milestones = useStore.getState().goals[0].milestones;
 expect(milestones.find((m) => m.id === 'm1')!.tasks).toHaveLength(0);
 expect(milestones.find((m) => m.id === 'm2')!.tasks[0].id).toBe('t1');
 expect(milestones.find((m) => m.id === 'm2')!.tasks[0].milestone_id).toBe('m2');
 });

 it('updateMilestoneInGoals upserts fetched direct-route milestones', () => {
 const m = milestone('m1', 'g1');
 useStore.getState().updateMilestoneInGoals(m);
 expect(useStore.getState().milestones[0]).toMatchObject({ id: 'm1', goal_id: 'g1' });
 });

 it('updateMilestoneInGoals preserves loaded tasks from flat API responses', () => {
 const t = task('t1', 'm1');
 useStore.setState({
 goals: [goal('g1', [milestone('m1', 'g1', [t])])],
 milestones: [milestone('m1', 'g1', [t])],
 tasks: [t],
 });
 useStore.getState().updateMilestoneInGoals({
 id: 'm1',
 title: 'Milestone m1 updated',
 description: '',
 status: StatusType.FINISHED,
 priority: PriorityType.MEDIUM,
 goal_id: 'g1',
 } as any);
 expect(useStore.getState().goals[0].milestones[0].tasks).toEqual([t]);
 expect(useStore.getState().milestones[0].tasks).toEqual([t]);
 });

 it('addMilestoneToGoal syncs goal tree and flat milestones without duplicates', () => {
 const m = milestone('m1', 'g1');
 useStore.getState().setGoals([goal('g1')]);
 useStore.getState().addMilestoneToGoal(m, 'g1');
 useStore.getState().addMilestoneToGoal(m, 'g1');
 expect(useStore.getState().goals[0].milestones.map((milestone) => milestone.id)).toEqual(['m1']);
 expect(useStore.getState().milestones.map((milestone) => milestone.id)).toEqual(['m1']);
 });

 it('deleteMilestoneFromGoals removes child flat tasks and todos', () => {
 const td = todo('td1', 't1');
 const t = task('t1', 'm1', [td]);
 useStore.setState({
 goals: [goal('g1', [milestone('m1', 'g1', [t])])],
 milestones: [milestone('m1', 'g1')],
 tasks: [t],
 todos: [td],
 });
 useStore.getState().deleteMilestoneFromGoals('m1');
 expect(useStore.getState().goals[0].milestones).toHaveLength(0);
 expect(useStore.getState().milestones).toHaveLength(0);
 expect(useStore.getState().tasks).toHaveLength(0);
 expect(useStore.getState().todos).toHaveLength(0);
 });

 it('deleteMilestone also removes nested milestone with child tasks and todos', () => {
 const td = todo('td1', 't1');
 const t = task('t1', 'm1', [td]);
 useStore.setState({
 goals: [goal('g1', [milestone('m1', 'g1', [t])])],
 milestones: [milestone('m1', 'g1')],
 tasks: [t],
 todos: [td],
 });
 useStore.getState().deleteMilestone('m1');
 expect(useStore.getState().goals[0].milestones).toHaveLength(0);
 expect(useStore.getState().milestones).toHaveLength(0);
 expect(useStore.getState().tasks).toHaveLength(0);
 expect(useStore.getState().todos).toHaveLength(0);
 });

 it('reorderGoals reorders top-level goals and updates positions', () => {
 useStore.getState().setGoals([goal('g1'), goal('g2'), goal('g3')]);
 useStore.getState().reorderGoals(['g3', 'g1', 'g2']);
 const ordered = useStore.getState().goals;
 expect(ordered.map((g) => g.id)).toEqual(['g3', 'g1', 'g2']);
 expect(ordered.map((g) => g.position)).toEqual([1, 2, 3]);
 });

 it('reorderMilestonesInGoal reorders within a goal', () => {
 const milestones = [milestone('m1', 'g1'), milestone('m2', 'g1'), milestone('m3', 'g1')];
 useStore.getState().setGoals([goal('g1', milestones)]);
 useStore.getState().setMilestones(milestones);
 useStore.getState().reorderMilestonesInGoal('g1', ['m3', 'm1', 'm2']);
 const ordered = useStore.getState().goals[0].milestones;
 expect(ordered.map((m) => m.id)).toEqual(['m3', 'm1', 'm2']);
 expect(ordered.map((m) => m.position)).toEqual([1, 2, 3]);
 expect(useStore.getState().milestones.map((m) => [m.id, m.position])).toEqual([
 ['m1', 2],
 ['m2', 3],
 ['m3', 1],
 ]);
 });

 it('reorderTasksInMilestone reorders tasks and updates positions', () => {
 const tasks = [task('t1', 'm1'), task('t2', 'm1'), task('t3', 'm1')];
 useStore.setState({
 goals: [goal('g1', [milestone('m1', 'g1', tasks)])],
 tasks,
 });
 useStore.getState().reorderTasksInMilestone('m1', ['t3', 't1', 't2']);
 const ordered = useStore.getState().goals[0].milestones[0].tasks;
 expect(ordered.map((t) => t.id)).toEqual(['t3', 't1', 't2']);
 expect(ordered.map((t) => t.position)).toEqual([1, 2, 3]);
 expect(useStore.getState().tasks.find((t) => t.id === 't3')!.position).toBe(1);
 });

 it('reorderTodosInTask reorders nested todos and updates positions', () => {
 const todos = [todo('td1', 't1'), todo('td2', 't1'), todo('td3', 't1')];
 const t = task('t1', 'm1', todos);
 useStore.setState({
 goals: [goal('g1', [milestone('m1', 'g1', [t])])],
 tasks: [t],
 todos,
 });
 useStore.getState().reorderTodosInTask('t1', ['td3', 'td1', 'td2']);
 const ordered = useStore.getState().goals[0].milestones[0].tasks[0].todos;
 expect(ordered.map((td) => td.id)).toEqual(['td3', 'td1', 'td2']);
 expect(ordered.map((td) => td.position)).toEqual([1, 2, 3]);
 expect(useStore.getState().todos.find((td) => td.id === 'td3')!.position).toBe(1);
 });

 it('reorderTodosInTask reorders goal-level routine todos', () => {
 const todos = [todo('td1', 'rt1'), todo('td2', 'rt1'), todo('td3', 'rt1')];
 const routine = goalTask('rt1', 'g1', todos);
 useStore.setState({
 goals: [{ ...goal('g1'), tasks: [routine] }],
 tasks: [routine],
 todos,
 });

 useStore.getState().reorderTodosInTask('rt1', ['td2', 'td3', 'td1']);

 const ordered = useStore.getState().goals[0].tasks?.[0].todos ?? [];
 expect(ordered.map((td) => td.id)).toEqual(['td2', 'td3', 'td1']);
 expect(ordered.map((td) => td.position)).toEqual([1, 2, 3]);
 expect(useStore.getState().tasks[0].todos.map((td) => td.id)).toEqual(['td2', 'td3', 'td1']);
 expect(useStore.getState().todos.find((td) => td.id === 'td2')!.position).toBe(1);
 });

 it('reorderSubtasksInTask reorders nested subtasks and updates positions', () => {
 const subtasks = [subtask('s1', 't1'), subtask('s2', 't1'), subtask('s3', 't1')];
 const t = { ...task('t1', 'm1'), subtasks };
 useStore.setState({
 goals: [goal('g1', [milestone('m1', 'g1', [t])])],
 tasks: [t],
 });
 useStore.getState().reorderSubtasksInTask('t1', ['s3', 's1', 's2']);
 const ordered = useStore.getState().goals[0].milestones[0].tasks[0].subtasks;
 expect(ordered.map((s) => s.id)).toEqual(['s3', 's1', 's2']);
 expect(ordered.map((s) => s.position)).toEqual([1, 2, 3]);
 expect(useStore.getState().tasks[0].subtasks.find((s) => s.id === 's3')!.position).toBe(1);
 });

 it('addEvents appends multiple events in one update', () => {
 useStore.getState().addEvents([
 { id: 'e1', title: 'a', status: StatusType.OUTSTANDING, created_at: '', updated_at: '' },
 { id: 'e2', title: 'b', status: StatusType.OUTSTANDING, created_at: '', updated_at: '' },
 ]);
 expect(useStore.getState().events).toHaveLength(2);
 });
});
