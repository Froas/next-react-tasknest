import { create } from 'zustand';
import { GoalItem as Goal, MilestoneItem as Milestone, TaskItem as Task, TodoItem as Todo, Event, SubtaskItem as Subtask } from '@/lib/types';
import { goalsApi, milestonesApi, tasksApi, todosApi, eventsApi } from '@/lib/api';

interface AppStore {
 // Goals
 goals: Goal[];
 isLoadingGoals: boolean;
 goalsError: string | null;
 goalsFetchedAt: number | null;

 // Milestones
 milestones: Milestone[];
 isLoadingMilestones: boolean;
 milestonesError: string | null;
 milestonesFetchedAt: number | null;

 // Tasks
 tasks: Task[];
 isLoadingTasks: boolean;
 tasksError: string | null;
 tasksFetchedAt: number | null;

 // Todos
 todos: Todo[];
 isLoadingTodos: boolean;
 todosError: string | null;
 todosFetchedAt: number | null;

 // Events
 events: Event[];
 isLoadingEvents: boolean;
 eventsError: string | null;
 eventsFetchedAt: number | null;

 // Actions
 // Goals
 setGoals: (goals: Goal[]) => void;
 addGoal: (goal: Goal) => void;
 updateGoal: (goal: Goal) => void;
 deleteGoal: (goalId: string) => void;
 fetchGoals: (options?: { force?: boolean; silent?: boolean }) => Promise<void>;
 reorderGoals: (orderedIds: string[]) => void;

 // Milestones
 setMilestones: (milestones: Milestone[]) => void;
 addMilestone: (milestone: Milestone) => void;
 updateMilestone: (milestone: Milestone) => void;
 deleteMilestone: (milestoneId: string) => void;
 fetchMilestones: (options?: { force?: boolean }) => Promise<void>;

 // Tasks
 setTasks: (tasks: Task[]) => void;
 addTask: (task: Task) => void;
 updateTask: (task: Task) => void;
 deleteTask: (taskId: string) => void;
 fetchTasks: (options?: { force?: boolean }) => Promise<void>;

 // Todos
 setTodos: (todos: Todo[]) => void;
 addTodo: (todo: Todo) => void;
 updateTodo: (todo: Todo) => void;
 deleteTodo: (todoId: string) => void;
 fetchTodos: (options?: { force?: boolean }) => Promise<void>;

 // Events
 setEvents: (events: Event[]) => void;
 addEvent: (event: Event) => void;
 addEvents: (events: Event[]) => void;
 updateEvent: (event: Event) => void;
 deleteEvent: (eventId: string) => void;
 fetchEvents: (options?: { force?: boolean }) => Promise<void>;

 // Helper methods for nested updates (scoped to a known goalId)
 updateMilestoneInGoal: (goalId: string, milestone: Milestone) => void;
 updateTaskInMilestone: (goalId: string, milestoneId: string, task: Task) => void;

 // Nested updates that scan all goals — used when only the entity is known
 updateMilestoneInGoals: (milestone: Milestone) => void;
 updateTaskInGoals: (task: Task) => void;
 updateTodoInGoals: (todo: Todo) => void;
 updateSubtaskInGoals: (subtask: Subtask) => void;

 // Reorder milestones inside a goal. Caller persists via milestonesApi.reorder.
 reorderMilestonesInGoal: (goalId: string, orderedIds: string[]) => void;

 // Move a task from one milestone to another within the same (or a
 // different) goal. Local-only — caller must persist via tasksApi.update.
 moveTaskToMilestone: (taskId: string, toMilestoneId: string) => void;

 // Reorder tasks inside a milestone. Caller persists via tasksApi.reorder.
 reorderTasksInMilestone: (milestoneId: string, orderedIds: string[]) => void;

 // Reorder todos inside a task. Caller persists via todosApi.reorder.
 reorderTodosInTask: (taskId: string, orderedIds: string[]) => void;

 // Reorder subtasks inside a task. Caller persists via subtasksApi.reorder.
 reorderSubtasksInTask: (taskId: string, orderedIds: string[]) => void;

 // Nested deletes
 deleteMilestoneFromGoals: (milestoneId: string) => void;
 deleteTaskFromGoals: (taskId: string) => void;
 deleteTodoFromGoals: (todoId: string) => void;
 deleteSubtaskFromGoals: (subtaskId: string) => void;

 // More specific adders for optimistic updates
 addMilestoneToGoal: (milestone: Milestone, goalId: string) => void;
 addTaskToMilestoneInGoal: (task: Task, milestoneId: string, goalId: string) => void;
 addTodoToTaskInMilestoneInGoal: (todo: Todo, taskId: string, milestoneId: string, goalId: string) => void;
 addSubtaskToTaskInMilestoneInGoal: (subtask: Subtask, taskId: string, milestoneId: string, goalId: string) => void;

}

// Considered"fresh" within this window — fetch* skips network if data was
// loaded recently. Tweak via `force: true` argument when you need a refresh.
const STALE_TTL_MS = 30_000;
const isFresh = (timestamp: number | null) =>
 timestamp !== null && Date.now() - timestamp < STALE_TTL_MS;

let goalsFetchPromise: Promise<void> | null = null;
let queuedGoalsFetchOptions: { force?: boolean; silent?: boolean } | null = null;

const upsertById = <T extends { id: string }>(items: T[], item: T): T[] =>
 items.some((existing) => existing.id === item.id)
 ? items.map((existing) => (existing.id === item.id ? { ...existing, ...item } : existing))
 : [...items, item];

const upsertManyById = <T extends { id: string }>(items: T[], incoming: T[]): T[] =>
 incoming.reduce((acc, item) => upsertById(acc, item), items);

const withoutId = <T extends { id: string }>(items: T[] | undefined, id: string): T[] =>
 (items ?? []).filter((item) => item.id !== id);

const upsertTaskTodo = (task: Task, todo: Todo): Task => ({
 ...task,
 todos: upsertById(task.todos ?? [], todo),
});

const upsertTaskSubtask = (task: Task, subtask: Subtask): Task => ({
 ...task,
 subtasks: upsertById(task.subtasks ?? [], subtask),
});

const arrayOrExisting = <T>(next: T[] | undefined, existing: T[] | undefined): T[] =>
 Array.isArray(next) ? next : existing ?? [];

const normalizeGoal = (goal: Goal, existing?: Goal): Goal => ({
 ...goal,
 tasks: arrayOrExisting((goal as Partial<Goal>).tasks, existing?.tasks),
 milestones: arrayOrExisting((goal as Partial<Goal>).milestones, existing?.milestones),
});

const normalizeMilestone = (milestone: Milestone, existing?: Milestone): Milestone => ({
 ...milestone,
 goal_id: milestone.goal_id ?? existing?.goal_id,
 tasks: arrayOrExisting((milestone as Partial<Milestone>).tasks, existing?.tasks),
});

const normalizeTask = (task: Task, existing?: Task): Task => ({
 ...task,
 goal_id: task.goal_id ?? existing?.goal_id,
 milestone_id: task.milestone_id ?? existing?.milestone_id,
 kind: task.kind ?? existing?.kind ?? 'project',
 scope: task.scope ?? existing?.scope ?? (task.milestone_id || existing?.milestone_id ? 'milestone' : 'goal'),
 todos: arrayOrExisting((task as Partial<Task>).todos, existing?.todos),
 subtasks: arrayOrExisting((task as Partial<Task>).subtasks, existing?.subtasks),
});

const flattenGoalTree = (goals: Goal[]): { milestones: Milestone[]; tasks: Task[]; todos: Todo[] } => {
 const milestones: Milestone[] = [];
 const tasks: Task[] = [];
 const todos: Todo[] = [];

 for (const goal of goals) {
 for (const task of goal.tasks ?? []) {
 const normalizedTask = normalizeTask({
 ...task,
 goal_id: task.goal_id ?? goal.id,
 scope: task.scope ?? 'goal',
 milestone_id: task.milestone_id,
 });
 tasks.push(normalizedTask);

 for (const todo of normalizedTask.todos ?? []) {
 todos.push({ ...todo, task_id: todo.task_id ?? normalizedTask.id });
 }
 }

 for (const milestone of goal.milestones ?? []) {
 const normalizedMilestone = normalizeMilestone({
 ...milestone,
 goal_id: milestone.goal_id ?? goal.id,
 });
 milestones.push(normalizedMilestone);

 for (const task of normalizedMilestone.tasks ?? []) {
 const normalizedTask = normalizeTask({
 ...task,
 goal_id: task.goal_id ?? goal.id,
 milestone_id: task.milestone_id ?? normalizedMilestone.id,
 scope: task.scope ?? 'milestone',
 });
 tasks.push(normalizedTask);

 for (const todo of normalizedTask.todos ?? []) {
 todos.push({ ...todo, task_id: todo.task_id ?? normalizedTask.id });
 }
 }
 }
 }

 return { milestones, tasks, todos };
};

export const useStore = create<AppStore>((set, get) => ({
 // Initial state
 goals: [],
 isLoadingGoals: false,
 goalsError: null,
 goalsFetchedAt: null,

 milestones: [],
 isLoadingMilestones: false,
 milestonesError: null,
 milestonesFetchedAt: null,

 tasks: [],
 isLoadingTasks: false,
 tasksError: null,
 tasksFetchedAt: null,

 todos: [],
 isLoadingTodos: false,
 todosError: null,
 todosFetchedAt: null,

 events: [],
 isLoadingEvents: false,
 eventsError: null,
 eventsFetchedAt: null,

 // Goals actions
 setGoals: (goals) => set((state) => {
 const normalizedGoals = goals.map((g) => normalizeGoal(g));
 const flat = flattenGoalTree(normalizedGoals);
 return {
 goals: normalizedGoals,
 milestones: upsertManyById(state.milestones, flat.milestones),
 tasks: upsertManyById(state.tasks, flat.tasks),
 todos: upsertManyById(state.todos, flat.todos),
 };
 }),
 addGoal: (goal) =>
 set((state) => {
 const normalizedGoal = normalizeGoal({ ...goal, milestones: goal.milestones ?? [] });
 const flat = flattenGoalTree([normalizedGoal]);
 return {
 goals: upsertById(state.goals, normalizedGoal),
 milestones: upsertManyById(state.milestones, flat.milestones),
 tasks: upsertManyById(state.tasks, flat.tasks),
 todos: upsertManyById(state.todos, flat.todos),
 };
 }),
 updateGoal: (goal) => set((state) => {
 const existingGoal = state.goals.find((g) => g.id === goal.id);
 const normalizedGoal = normalizeGoal(goal, existingGoal);
 const exists = !!existingGoal;
 const nextGoals = exists
 ? state.goals.map((g) => (g.id === goal.id ? { ...g, ...normalizedGoal } : g))
 : [...state.goals, normalizedGoal];
 const flat = flattenGoalTree([normalizedGoal]);
 return {
 goals: nextGoals,
 milestones: upsertManyById(state.milestones, flat.milestones),
 tasks: upsertManyById(state.tasks, flat.tasks),
 todos: upsertManyById(state.todos, flat.todos),
 };
 }),
 deleteGoal: (goalId) => set((state) => {
 const deletedGoal = state.goals.find((g) => g.id === goalId);
 const milestoneIds = new Set([
 ...state.milestones.filter((m) => m.goal_id === goalId).map((m) => m.id),
 ...((deletedGoal?.milestones ?? []).map((m) => m.id)),
 ]);
 const taskIds = new Set([
 ...state.tasks.filter((t) => t.milestone_id && milestoneIds.has(t.milestone_id)).map((t) => t.id),
 ...state.tasks.filter((t) => t.goal_id === goalId).map((t) => t.id),
 ...((deletedGoal?.tasks ?? []).map((t) => t.id)),
 ...((deletedGoal?.milestones ?? []).flatMap((m) => (m.tasks ?? []).map((t) => t.id))),
 ]);
 return {
 goals: state.goals.filter((g) => g.id !== goalId),
 milestones: state.milestones.filter((m) => !milestoneIds.has(m.id)),
 tasks: state.tasks.filter((t) => !taskIds.has(t.id)),
 todos: state.todos.filter((td) => !td.task_id || !taskIds.has(td.task_id)),
 };
 }),

 reorderGoals: (orderedIds) => set((state) => {
 const nextPositions = new Map(orderedIds.map((id, index) => [id, index + 1]));
 const byId = new Map(state.goals.map((goal) => [goal.id, goal]));
 const reordered = orderedIds
 .map((id) => byId.get(id))
 .filter((goal): goal is Goal => !!goal)
 .map((goal) => ({ ...goal, position: nextPositions.get(goal.id) ?? goal.position }));
 const remainder = state.goals.filter((goal) => !orderedIds.includes(goal.id));
 return { goals: [...reordered, ...remainder] };
 }),
 
 fetchGoals: (options = {}) => {
 if (!options.force && isFresh(get().goalsFetchedAt)) return Promise.resolve();
 if (goalsFetchPromise) {
 if (options.force) {
 queuedGoalsFetchOptions = {
 force: true,
 silent: (queuedGoalsFetchOptions?.silent ?? true) && Boolean(options.silent),
 };
 }
 return goalsFetchPromise;
 }
 if (!options.silent) set({ isLoadingGoals: true, goalsError: null });

 goalsFetchPromise = (async () => {
 try {
 const rawGoals = await goalsApi.getAll();
 const goals = await Promise.all(
 rawGoals.map(async (goal) => {
 try {
 return await goalsApi.getById(goal.id, {
 include_milestones: true,
 include_tasks: true,
 include_subtasks: true,
 include_todos: true,
 });
 } catch (error) {
 console.error(`Failed to fetch milestones for goal ${goal.id}:`, error);
 return { ...goal, milestones: goal.milestones ?? [] };
 }
 })
 );
 set((state) => {
 const normalizedGoals = goals.map((goal) => normalizeGoal(goal, state.goals.find((existing) => existing.id === goal.id)));
 const flat = flattenGoalTree(normalizedGoals);
 return {
 goals: normalizedGoals,
 milestones: upsertManyById(state.milestones, flat.milestones),
 tasks: upsertManyById(state.tasks, flat.tasks),
 todos: upsertManyById(state.todos, flat.todos),
 ...(!options.silent ? { isLoadingGoals: false } : {}),
 goalsFetchedAt: Date.now(),
 };
 });
 } catch (error) {
 if (options.silent) {
 console.error('Failed to refresh goals in the background:', error);
 } else {
 set({ goalsError: 'Failed to fetch goals', isLoadingGoals: false });
 }
 } finally {
 goalsFetchPromise = null;
 const queuedOptions = queuedGoalsFetchOptions;
 queuedGoalsFetchOptions = null;
 if (queuedOptions) void get().fetchGoals(queuedOptions);
 }
 })();

 return goalsFetchPromise;
 },

 // Milestones actions
 setMilestones: (milestones) => set({ milestones }),
 addMilestone: (milestone) => set((state) => ({ milestones: upsertById(state.milestones, milestone) })),
 updateMilestone: (milestone) => set((state) => {
 const existingMilestone = state.milestones.find((m) => m.id === milestone.id);
 return {
 milestones: upsertById(state.milestones, normalizeMilestone(milestone, existingMilestone)),
 };
 }),
 deleteMilestone: (milestoneId) => set((state) => {
 const nestedTaskIds = state.goals.flatMap((g) =>
 (g.milestones ?? [])
 .filter((m) => m.id === milestoneId)
 .flatMap((m) => (m.tasks ?? []).map((t) => t.id))
 );
 const taskIds = new Set([
 ...state.tasks.filter((t) => t.milestone_id === milestoneId).map((t) => t.id),
 ...nestedTaskIds,
 ]);
 return {
 goals: state.goals.map((g) => ({
 ...g,
 milestones: (g.milestones ?? []).filter((m) => m.id !== milestoneId),
 })),
 milestones: state.milestones.filter((m) => m.id !== milestoneId),
 tasks: state.tasks.filter((t) => t.milestone_id !== milestoneId && !taskIds.has(t.id)),
 todos: state.todos.filter((td) => !td.task_id || !taskIds.has(td.task_id)),
 };
 }),
 
 fetchMilestones: async (options = {}) => {
 if (!options.force && isFresh(get().milestonesFetchedAt)) return;
 if (get().isLoadingMilestones) return;
 set({ isLoadingMilestones: true, milestonesError: null });
 try {
 const data = await milestonesApi.getAll();
 set({ milestones: data, isLoadingMilestones: false, milestonesFetchedAt: Date.now() });
 } catch (error) {
 set({ milestonesError: 'Failed to fetch milestones', isLoadingMilestones: false });
 }
 },

 // Tasks actions
 setTasks: (tasks) => set({ tasks }),
 addTask: (task) => set((state) => ({ tasks: upsertById(state.tasks, task) })),
 updateTask: (task) => set((state) => {
 const existingTask = state.tasks.find((t) => t.id === task.id);
 return {
 tasks: upsertById(state.tasks, normalizeTask(task, existingTask)),
 };
 }),
 deleteTask: (taskId) => set((state) => ({
 goals: state.goals.map((g) => ({
 ...g,
 tasks: (g.tasks ?? []).filter((t) => t.id !== taskId),
 milestones: (g.milestones ?? []).map((m) => ({
 ...m,
 tasks: (m.tasks ?? []).filter((t) => t.id !== taskId),
 })),
 })),
 tasks: state.tasks.filter((t) => t.id !== taskId),
 todos: state.todos.filter((td) => td.task_id !== taskId),
 })),
 
 fetchTasks: async (options = {}) => {
 if (!options.force && isFresh(get().tasksFetchedAt)) return;
 if (get().isLoadingTasks) return;
 set({ isLoadingTasks: true, tasksError: null });
 try {
 const data = await tasksApi.getAll();
 set({ tasks: data, isLoadingTasks: false, tasksFetchedAt: Date.now() });
 } catch (error) {
 set({ tasksError: 'Failed to fetch tasks', isLoadingTasks: false });
 }
 },

 // Todos actions
 setTodos: (todos) => set({ todos }),
 addTodo: (todo) => set((state) => ({ todos: upsertById(state.todos, todo) })),
 updateTodo: (todo) => set((state) => ({
 todos: upsertById(state.todos, todo)
 })),
 deleteTodo: (todoId) => set((state) => ({
 goals: state.goals.map((g) => ({
 ...g,
 tasks: (g.tasks ?? []).map((t) => ({
 ...t,
 todos: withoutId(t.todos, todoId),
 })),
 milestones: (g.milestones ?? []).map((m) => ({
 ...m,
 tasks: (m.tasks ?? []).map((t) => ({
 ...t,
 todos: withoutId(t.todos, todoId),
 })),
 })),
 })),
 tasks: state.tasks.map((t) => ({
 ...t,
 todos: withoutId(t.todos, todoId),
 })),
 todos: state.todos.filter((t) => t.id !== todoId)
 })),
 
 fetchTodos: async (options = {}) => {
 if (!options.force && isFresh(get().todosFetchedAt)) return;
 if (get().isLoadingTodos) return;
 set({ isLoadingTodos: true, todosError: null });
 try {
 const data = await todosApi.getAll();
 set({ todos: data, isLoadingTodos: false, todosFetchedAt: Date.now() });
 } catch (error) {
 set({ todosError: 'Failed to fetch todos', isLoadingTodos: false });
 }
 },

 // Events actions
 setEvents: (events) => set({ events }),
 addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
 addEvents: (events) => set((state) => ({ events: [...state.events, ...events] })),
 updateEvent: (event) => set((state) => ({
 events: state.events.map((e) => (e.id === event.id ? event : e))
 })),
 deleteEvent: (eventId) => set((state) => ({
 events: state.events.filter((e) => e.id !== eventId)
 })),
 
 fetchEvents: async (options = {}) => {
 if (!options.force && isFresh(get().eventsFetchedAt)) return;
 if (get().isLoadingEvents) return;
 set({ isLoadingEvents: true, eventsError: null });
 try {
 const data = await eventsApi.getAll();
 set({ events: data, isLoadingEvents: false, eventsFetchedAt: Date.now() });
 } catch (error) {
 set({ eventsError: 'Failed to fetch events', isLoadingEvents: false });
 }
 },

 // Helper method to update milestone within a goal
 updateMilestoneInGoal: (goalId: string, milestone: Milestone) => set((state) => {
 const existingMilestone =
 state.goals.find((g) => g.id === goalId)?.milestones?.find((m) => m.id === milestone.id) ??
 state.milestones.find((m) => m.id === milestone.id);
 const normalizedMilestone = normalizeMilestone(milestone, existingMilestone);
 return {
 goals: state.goals.map((g) =>
 g.id === goalId
 ? {
 ...g,
 milestones: upsertById(g.milestones ?? [], normalizedMilestone),
 }
 : g
 ),
 milestones: upsertById(state.milestones, normalizedMilestone),
 };
 }),
 // Helper method to update task within a milestone
 updateTaskInMilestone: (goalId: string, milestoneId: string, task: Task) => set((state) => {
 const existingTask =
 state.goals
 .find((g) => g.id === goalId)
 ?.milestones?.find((m) => m.id === milestoneId)
 ?.tasks?.find((t) => t.id === task.id) ??
 state.tasks.find((t) => t.id === task.id);
 const normalizedTask = normalizeTask({ ...task, milestone_id: task.milestone_id ?? milestoneId }, existingTask);
 return {
 goals: state.goals.map((g) =>
 g.id === goalId
 ? {
 ...g,
 tasks: (g.tasks ?? []).filter((t) => t.id !== task.id),
 milestones: (g.milestones ?? []).map((m) =>
 m.id === milestoneId
 ? {
 ...m,
 tasks: upsertById(m.tasks ?? [], normalizedTask),
 }
 : m
 ),
 }
 : g
 ),
 tasks: upsertById(state.tasks, normalizedTask),
 };
 }),

 // Specific adders implementations
 addMilestoneToGoal: (milestone, goalId) => set((state) => {
 const normalizedMilestone = { ...milestone, goal_id: milestone.goal_id ?? goalId, tasks: milestone.tasks ?? [] };
 return {
 goals: state.goals.map((g) =>
 g.id === goalId
 ? {
 ...g,
 milestones: upsertById(g.milestones ?? [], normalizedMilestone),
 }
 : g
 ),
 milestones: upsertById(state.milestones, normalizedMilestone),
 };
 }),

 addTaskToMilestoneInGoal: (task, milestoneId, goalId) => set((state) => {
 const normalizedTask = { ...task, milestone_id: task.milestone_id ?? milestoneId, subtasks: task.subtasks ?? [], todos: task.todos ?? [] };
 return {
 goals: state.goals.map((g) =>
 g.id === goalId
 ? {
 ...g,
 tasks: (g.tasks ?? []).filter((t) => t.id !== task.id),
 milestones: (g.milestones ?? []).map((m) =>
 m.id === milestoneId
 ? {
 ...m,
 tasks: upsertById(m.tasks ?? [], normalizedTask),
 }
 : m
 ),
 }
 : g
 ),
 tasks: upsertById(state.tasks, normalizedTask),
 };
 }),

 addTodoToTaskInMilestoneInGoal: (todo, taskId, milestoneId, goalId) => set((state) => ({
 goals: state.goals.map((g) =>
 g.id === goalId
 ? {
 ...g,
 milestones: (g.milestones ?? []).map((m) =>
 m.id === milestoneId
 ? {
 ...m,
 tasks: (m.tasks ?? []).map((t) =>
 t.id === taskId ? upsertTaskTodo(t, todo) : t
 ),
 }
 : m
 ),
 }
 : g
 ),
 tasks: state.tasks.map((t) => (t.id === taskId ? upsertTaskTodo(t, todo) : t)),
 todos: upsertById(state.todos, todo),
 })),

 addSubtaskToTaskInMilestoneInGoal: (subtask, taskId, milestoneId, goalId) => set((state) => ({
 goals: state.goals.map((g) =>
 g.id === goalId
 ? {
 ...g,
 milestones: (g.milestones ?? []).map((m) =>
 m.id === milestoneId
 ? {
 ...m,
 tasks: (m.tasks ?? []).map((t) =>
 t.id === taskId ? upsertTaskSubtask(t, subtask) : t
 ),
 }
 : m
 ),
 }
 : g
 ),
 tasks: state.tasks.map((t) => (t.id === taskId ? upsertTaskSubtask(t, subtask) : t)),
 })),

 // Nested updates that scan all goals — keep store in sync after mutating
 // a deeply-nested entity even when we only have the entity itself.
 updateMilestoneInGoals: (milestone) => set((state) => {
 const existingMilestone =
 state.goals.flatMap((g) => g.milestones ?? []).find((m) => m.id === milestone.id) ??
 state.milestones.find((m) => m.id === milestone.id);
 const normalizedMilestone = normalizeMilestone(milestone, existingMilestone);
 const targetGoalId = normalizedMilestone.goal_id;
 return {
 goals: state.goals.map((g) => ({
 ...g,
 milestones: g.id === targetGoalId
 ? upsertById(g.milestones ?? [], normalizedMilestone)
 : (g.milestones ?? []).filter((m) => m.id !== milestone.id),
 })),
 milestones: upsertById(state.milestones, normalizedMilestone),
 };
 }),

 updateTaskInGoals: (task) => set((state) => {
 const existingTask =
 state.goals.flatMap((g) => g.tasks ?? []).find((t) => t.id === task.id) ??
 state.goals.flatMap((g) => g.milestones ?? []).flatMap((m) => m.tasks ?? []).find((t) => t.id === task.id) ??
 state.tasks.find((t) => t.id === task.id);
 const normalizedTask = normalizeTask(task, existingTask);
 const targetGoalId = normalizedTask.goal_id;
 const targetMilestoneId = normalizedTask.milestone_id;
 const isGoalTask = normalizedTask.scope === 'goal' || !targetMilestoneId;
 return {
 goals: state.goals.map((g) => ({
 ...g,
 tasks: isGoalTask && g.id === targetGoalId
 ? upsertById(g.tasks ?? [], { ...normalizedTask, milestone_id: undefined, scope: 'goal' })
 : (g.tasks ?? []).filter((t) => t.id !== task.id),
 milestones: (g.milestones || []).map((m) => ({
 ...m,
 tasks: !isGoalTask && m.id === targetMilestoneId
 ? upsertById(m.tasks ?? [], normalizedTask)
 : (m.tasks ?? []).filter((t) => t.id !== task.id),
 })),
 })),
 tasks: upsertById(state.tasks, normalizedTask),
 };
 }),

 updateTodoInGoals: (todo) => set((state) => {
 const existingTodo =
 state.goals
 .flatMap((g) => g.milestones ?? [])
 .flatMap((m) => m.tasks ?? [])
 .flatMap((t) => t.todos ?? [])
 .find((td) => td.id === todo.id) ??
 state.tasks.flatMap((t) => t.todos ?? []).find((td) => td.id === todo.id) ??
 state.todos.find((td) => td.id === todo.id);
 const normalizedTodo = { ...todo, task_id: todo.task_id ?? existingTodo?.task_id };
 const targetTaskId = normalizedTodo.task_id;
 return {
 goals: state.goals.map((g) => ({
 ...g,
 tasks: (g.tasks ?? []).map((t) => ({
 ...t,
 todos: t.id === targetTaskId
 ? upsertById(t.todos ?? [], normalizedTodo)
 : (t.todos ?? []).filter((td) => td.id !== todo.id),
 })),
 milestones: (g.milestones || []).map((m) => ({
 ...m,
 tasks: (m.tasks || []).map((t) => ({
 ...t,
 todos: t.id === targetTaskId
 ? upsertById(t.todos ?? [], normalizedTodo)
 : (t.todos ?? []).filter((td) => td.id !== todo.id),
 })),
 })),
 })),
 tasks: state.tasks.map((t) => (t.id === targetTaskId ? upsertTaskTodo(t, normalizedTodo) : {
 ...t,
 todos: (t.todos ?? []).filter((td) => td.id !== todo.id),
 })),
 todos: upsertById(state.todos, normalizedTodo),
 };
 }),

 updateSubtaskInGoals: (subtask) => set((state) => {
 const existingSubtask =
 state.goals
 .flatMap((g) => g.milestones ?? [])
 .flatMap((m) => m.tasks ?? [])
 .flatMap((t) => t.subtasks ?? [])
 .find((s) => s.id === subtask.id) ??
 state.tasks.flatMap((t) => t.subtasks ?? []).find((s) => s.id === subtask.id);
 const normalizedSubtask = { ...subtask, task_id: subtask.task_id ?? existingSubtask?.task_id };
 const targetTaskId = normalizedSubtask.task_id;
 return {
 goals: state.goals.map((g) => ({
 ...g,
 tasks: (g.tasks ?? []).map((t) => ({
 ...t,
 subtasks: t.id === targetTaskId
 ? upsertById(t.subtasks ?? [], normalizedSubtask)
 : (t.subtasks ?? []).filter((s) => s.id !== subtask.id),
 })),
 milestones: (g.milestones || []).map((m) => ({
 ...m,
 tasks: (m.tasks || []).map((t) => ({
 ...t,
 subtasks: t.id === targetTaskId
 ? upsertById(t.subtasks ?? [], normalizedSubtask)
 : (t.subtasks ?? []).filter((s) => s.id !== subtask.id),
 })),
 })),
 })),
 tasks: state.tasks.map((t) => (t.id === targetTaskId ? upsertTaskSubtask(t, normalizedSubtask) : {
 ...t,
 subtasks: (t.subtasks ?? []).filter((s) => s.id !== subtask.id),
 })),
 };
 }),

 moveTaskToMilestone: (taskId, toMilestoneId) => set((state) => {
 let movingTask: Task | null = null;
 // First pass: locate and remove the task from its current milestone.
 const goalsAfterRemoval = state.goals.map((g) => ({
 ...g,
 milestones: (g.milestones ?? []).map((m) => {
 const found = m.tasks?.find((t) => t.id === taskId);
 if (!found) return m;
 movingTask = { ...found, milestone_id: toMilestoneId };
 return { ...m, tasks: (m.tasks ?? []).filter((t) => t.id !== taskId) };
 }),
 }));
 if (!movingTask) return state;
 // Second pass: insert into the target milestone (in any goal).
 const goalsAfterInsert = goalsAfterRemoval.map((g) => ({
 ...g,
 milestones: (g.milestones ?? []).map((m) =>
 m.id === toMilestoneId
 ? { ...m, tasks: [...(m.tasks ?? []), movingTask as Task] }
 : m
 ),
 }));
 return {
 goals: goalsAfterInsert,
 tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, milestone_id: toMilestoneId } : t)),
 };
 }),

 reorderTasksInMilestone: (milestoneId, orderedIds) => set((state) => {
 const nextPositions = new Map(orderedIds.map((id, index) => [id, index + 1]));
 return {
 goals: state.goals.map((g) => ({
 ...g,
 milestones: (g.milestones ?? []).map((m) => {
 if (m.id !== milestoneId) return m;
 const byId = new Map((m.tasks ?? []).map((t) => [t.id, t]));
 const reordered = orderedIds
 .map((id) => byId.get(id))
 .filter((t): t is Task => !!t)
 .map((t) => ({ ...t, position: nextPositions.get(t.id) ?? t.position }));
 const remainder = (m.tasks ?? []).filter((t) => !orderedIds.includes(t.id));
 return { ...m, tasks: [...reordered, ...remainder] };
 }),
 })),
 tasks: state.tasks.map((t) =>
 t.milestone_id === milestoneId && nextPositions.has(t.id)
 ? { ...t, position: nextPositions.get(t.id) }
 : t
 ),
 };
 }),

 reorderTodosInTask: (taskId, orderedIds) => set((state) => {
 const nextPositions = new Map(orderedIds.map((id, index) => [id, index + 1]));
 const reorderTodoList = (items: Todo[] | undefined): Todo[] => {
 const todos = items ?? [];
 const byId = new Map(todos.map((todo) => [todo.id, todo]));
 const reordered = orderedIds
 .map((id) => byId.get(id))
 .filter((todo): todo is Todo => !!todo)
 .map((todo) => ({ ...todo, position: nextPositions.get(todo.id) ?? todo.position }));
 const remainder = todos.filter((todo) => !orderedIds.includes(todo.id));
 return [...reordered, ...remainder];
 };
 return {
 goals: state.goals.map((g) => ({
 ...g,
 tasks: (g.tasks ?? []).map((t) =>
 t.id === taskId
 ? { ...t, todos: reorderTodoList(t.todos) }
 : t
 ),
 milestones: (g.milestones ?? []).map((m) => ({
 ...m,
 tasks: (m.tasks ?? []).map((t) =>
 t.id === taskId
 ? { ...t, todos: reorderTodoList(t.todos) }
 : t
 ),
 })),
 })),
 tasks: state.tasks.map((t) =>
 t.id === taskId
 ? { ...t, todos: reorderTodoList(t.todos) }
 : t
 ),
 todos: state.todos.map((todo) =>
 todo.task_id === taskId && nextPositions.has(todo.id)
 ? { ...todo, position: nextPositions.get(todo.id) }
 : todo
 ),
 };
 }),

 reorderSubtasksInTask: (taskId, orderedIds) => set((state) => {
 const nextPositions = new Map(orderedIds.map((id, index) => [id, index + 1]));
 const reorderSubtaskList = (items: Subtask[] | undefined): Subtask[] => {
 const subtasks = items ?? [];
 const byId = new Map(subtasks.map((subtask) => [subtask.id, subtask]));
 const reordered = orderedIds
 .map((id) => byId.get(id))
 .filter((subtask): subtask is Subtask => !!subtask)
 .map((subtask) => ({ ...subtask, position: nextPositions.get(subtask.id) ?? subtask.position }));
 const remainder = subtasks.filter((subtask) => !orderedIds.includes(subtask.id));
 return [...reordered, ...remainder];
 };
 return {
 goals: state.goals.map((g) => ({
 ...g,
 tasks: (g.tasks ?? []).map((t) =>
 t.id === taskId
 ? { ...t, subtasks: reorderSubtaskList(t.subtasks) }
 : t
 ),
 milestones: (g.milestones ?? []).map((m) => ({
 ...m,
 tasks: (m.tasks ?? []).map((t) =>
 t.id === taskId
 ? { ...t, subtasks: reorderSubtaskList(t.subtasks) }
 : t
 ),
 })),
 })),
 tasks: state.tasks.map((t) =>
 t.id === taskId
 ? { ...t, subtasks: reorderSubtaskList(t.subtasks) }
 : t
 ),
 };
 }),

 reorderMilestonesInGoal: (goalId, orderedIds) => set((state) => {
 const orderedSet = new Set(orderedIds);
 const nextPosition = new Map(orderedIds.map((id, idx) => [id, idx + 1]));
 const reorderList = (list: Milestone[] = []) => {
 const byId = new Map(list.map((m) => [m.id, m]));
 const reordered = orderedIds
 .map((id) => byId.get(id))
 .filter((m): m is Milestone => !!m)
 .map((m) => ({ ...m, position: nextPosition.get(m.id) ?? m.position }));
 const remainder = list.filter((m) => !orderedSet.has(m.id));
 return [...reordered, ...remainder];
 };
 const flatMilestones = state.milestones.map((m) => (
 nextPosition.has(m.id) && m.goal_id === goalId
 ? { ...m, position: nextPosition.get(m.id) ?? m.position }
 : m
 ));
 return {
 goals: state.goals.map((g) => {
 if (g.id !== goalId) return g;
 return { ...g, milestones: reorderList(g.milestones ?? []) };
 }),
 milestones: flatMilestones,
 };
 }),

 deleteMilestoneFromGoals: (milestoneId) => set((state) => {
 const nestedTaskIds = state.goals.flatMap((g) =>
 (g.milestones ?? [])
 .filter((m) => m.id === milestoneId)
 .flatMap((m) => (m.tasks ?? []).map((t) => t.id))
 );
 const taskIds = new Set([
 ...state.tasks.filter((t) => t.milestone_id === milestoneId).map((t) => t.id),
 ...nestedTaskIds,
 ]);
 return {
 goals: state.goals.map((g) => ({
 ...g,
 milestones: (g.milestones || []).filter((m) => m.id !== milestoneId),
 })),
 milestones: state.milestones.filter((m) => m.id !== milestoneId),
 tasks: state.tasks.filter((t) => t.milestone_id !== milestoneId && !taskIds.has(t.id)),
 todos: state.todos.filter((td) => !td.task_id || !taskIds.has(td.task_id)),
 };
 }),

 deleteTaskFromGoals: (taskId) => set((state) => ({
 goals: state.goals.map((g) => ({
 ...g,
 tasks: (g.tasks || []).filter((t) => t.id !== taskId),
 milestones: (g.milestones || []).map((m) => ({
 ...m,
 tasks: (m.tasks || []).filter((t) => t.id !== taskId),
 })),
 })),
 tasks: state.tasks.filter((t) => t.id !== taskId),
 todos: state.todos.filter((td) => td.task_id !== taskId),
 })),

 deleteTodoFromGoals: (todoId) => set((state) => ({
 goals: state.goals.map((g) => ({
 ...g,
 tasks: (g.tasks || []).map((t) => ({
 ...t,
 todos: withoutId(t.todos, todoId),
 })),
 milestones: (g.milestones || []).map((m) => ({
 ...m,
 tasks: (m.tasks || []).map((t) => ({
 ...t,
 todos: withoutId(t.todos, todoId),
 })),
 })),
 })),
 tasks: state.tasks.map((t) => ({
 ...t,
 todos: withoutId(t.todos, todoId),
 })),
 todos: state.todos.filter((td) => td.id !== todoId),
 })),

 deleteSubtaskFromGoals: (subtaskId) => set((state) => ({
 goals: state.goals.map((g) => ({
 ...g,
 tasks: (g.tasks || []).map((t) => ({
 ...t,
 subtasks: withoutId(t.subtasks, subtaskId),
 })),
 milestones: (g.milestones || []).map((m) => ({
 ...m,
 tasks: (m.tasks || []).map((t) => ({
 ...t,
 subtasks: withoutId(t.subtasks, subtaskId),
 })),
 })),
 })),
 tasks: state.tasks.map((t) => ({
 ...t,
 subtasks: withoutId(t.subtasks, subtaskId),
 })),
 })),
}));
