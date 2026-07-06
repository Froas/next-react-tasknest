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
 fetchGoals: (options?: { force?: boolean }) => Promise<void>;

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

 // Reorder milestones inside a goal (does not call API; do that separately)
 reorderMilestonesInGoal: (goalId: string, orderedIds: string[]) => void;

 // Move a task from one milestone to another within the same (or a
 // different) goal. Local-only — caller must persist via tasksApi.update.
 moveTaskToMilestone: (taskId: string, toMilestoneId: string) => void;

 // Reorder tasks inside a milestone. Client-only — schema has no `position`
 // field on tasks, so this only affects the in-memory array order.
 reorderTasksInMilestone: (milestoneId: string, orderedIds: string[]) => void;

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
 setGoals: (goals) => set({
 goals: goals.map((g) => ({ ...g, milestones: g.milestones ?? [] })),
 }),
 addGoal: (goal) =>
 set((state) => ({
 goals: [...state.goals, { ...goal, milestones: goal.milestones ?? [] }],
 })),
 updateGoal: (goal) => set((state) => ({
 goals: state.goals.map((g) => (g.id === goal.id ? { ...g, ...goal } : g))
 })),
 deleteGoal: (goalId) => set((state) => ({
 goals: state.goals.filter((g) => g.id !== goalId)
 })),
 
 fetchGoals: async (options = {}) => {
 if (!options.force && isFresh(get().goalsFetchedAt)) return;
 if (get().isLoadingGoals) return;
 set({ isLoadingGoals: true, goalsError: null });
 try {
 const rawGoals = await goalsApi.getAll();
 const goals = await Promise.all(
 rawGoals.map(async (goal) => {
 try {
 return await goalsApi.getById(goal.id, { include_milestones: true });
 } catch (error) {
 console.error(`Failed to fetch milestones for goal ${goal.id}:`, error);
 return { ...goal, milestones: goal.milestones ?? [] };
 }
 })
 );
 set({ goals, isLoadingGoals: false, goalsFetchedAt: Date.now() });
 } catch (error) {
 set({ goalsError: 'Failed to fetch goals', isLoadingGoals: false });
 }
 },

 // Milestones actions
 setMilestones: (milestones) => set({ milestones }),
 addMilestone: (milestone) => set((state) => ({ milestones: [...state.milestones, milestone] })),
 updateMilestone: (milestone) => set((state) => ({
 milestones: state.milestones.map((m) => (m.id === milestone.id ? milestone : m))
 })),
 deleteMilestone: (milestoneId) => set((state) => ({
 milestones: state.milestones.filter((m) => m.id !== milestoneId)
 })),
 
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
 addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
 updateTask: (task) => set((state) => ({
 tasks: state.tasks.map((t) => (t.id === task.id ? task : t))
 })),
 deleteTask: (taskId) => set((state) => ({
 tasks: state.tasks.filter((t) => t.id !== taskId)
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
 addTodo: (todo) => set((state) => ({ todos: [...state.todos, todo] })),
 updateTodo: (todo) => set((state) => ({
 todos: state.todos.map((t) => (t.id === todo.id ? todo : t))
 })),
 deleteTodo: (todoId) => set((state) => ({
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
 updateMilestoneInGoal: (goalId: string, milestone: Milestone) => set((state) => ({
 goals: state.goals.map((g) => 
 g.id === goalId 
 ? {
 ...g,
 milestones: g.milestones?.map((m) => 
 m.id === milestone.id ? { ...m, ...milestone } : m
 ) || []
 }
 : g
 )
 })),
 // Helper method to update task within a milestone
 updateTaskInMilestone: (goalId: string, milestoneId: string, task: Task) => set((state) => ({
 goals: state.goals.map((g) => 
 g.id === goalId 
 ? {
 ...g,
 milestones: g.milestones?.map((m) => 
 m.id === milestoneId
 ? {
 ...m,
 tasks: m.tasks?.map((t) => 
 t.id === task.id ? { ...t, ...task } : t
 ) || []
 }
 : m
 ) || []
 }
 : g
 )
 })),

 // Specific adders implementations
 addMilestoneToGoal: (milestone, goalId) => set((state) => ({
 goals: state.goals.map((g) =>
 g.id === goalId
 ? {
 ...g,
 milestones: [...(g.milestones || []), milestone],
 }
 : g
 ),
 })),

 addTaskToMilestoneInGoal: (task, milestoneId, goalId) => set((state) => ({
 goals: state.goals.map((g) =>
 g.id === goalId
 ? {
 ...g,
 milestones: g.milestones?.map((m) =>
 m.id === milestoneId
 ? {
 ...m,
 tasks: [...(m.tasks || []), task],
 }
 : m
 ) || [],
 }
 : g
 ),
 })),

 addTodoToTaskInMilestoneInGoal: (todo, taskId, milestoneId, goalId) => set((state) => ({
 goals: state.goals.map((g) =>
 g.id === goalId
 ? {
 ...g,
 milestones: g.milestones?.map((m) =>
 m.id === milestoneId
 ? {
 ...m,
 tasks: m.tasks?.map((t) =>
 t.id === taskId
 ? {
 ...t,
 todos: [...(t.todos || []), todo],
 }
 : t
 ) || [],
 }
 : m
 ) || [],
 }
 : g
 ),
 })),

 addSubtaskToTaskInMilestoneInGoal: (subtask, taskId, milestoneId, goalId) => set((state) => ({
 goals: state.goals.map((g) =>
 g.id === goalId
 ? {
 ...g,
 milestones: g.milestones?.map((m) =>
 m.id === milestoneId
 ? {
 ...m,
 tasks: m.tasks?.map((t) =>
 t.id === taskId
 ? {
 ...t,
 subtasks: [...(t.subtasks || []), subtask as any],
 }
 : t
 ) || [],
 }
 : m
 ) || [],
 }
 : g
 ),
 })),

 // Nested updates that scan all goals — keep store in sync after mutating
 // a deeply-nested entity even when we only have the entity itself.
 updateMilestoneInGoals: (milestone) => set((state) => ({
 goals: state.goals.map((g) => ({
 ...g,
 milestones: (g.milestones || []).map((m) =>
 m.id === milestone.id ? { ...m, ...milestone } : m
 ),
 })),
 milestones: state.milestones.map((m) =>
 m.id === milestone.id ? { ...m, ...milestone } : m
 ),
 })),

 updateTaskInGoals: (task) => set((state) => ({
 goals: state.goals.map((g) => ({
 ...g,
 milestones: (g.milestones || []).map((m) => ({
 ...m,
 tasks: (m.tasks || []).map((t) =>
 t.id === task.id ? { ...t, ...task } : t
 ),
 })),
 })),
 tasks: state.tasks.map((t) => (t.id === task.id ? { ...t, ...task } : t)),
 })),

 updateTodoInGoals: (todo) => set((state) => ({
 goals: state.goals.map((g) => ({
 ...g,
 milestones: (g.milestones || []).map((m) => ({
 ...m,
 tasks: (m.tasks || []).map((t) => ({
 ...t,
 todos: (t.todos || []).map((td) =>
 td.id === todo.id ? { ...td, ...todo } : td
 ),
 })),
 })),
 })),
 todos: state.todos.map((td) => (td.id === todo.id ? { ...td, ...todo } : td)),
 })),

 updateSubtaskInGoals: (subtask) => set((state) => ({
 goals: state.goals.map((g) => ({
 ...g,
 milestones: (g.milestones || []).map((m) => ({
 ...m,
 tasks: (m.tasks || []).map((t) => ({
 ...t,
 subtasks: (t.subtasks || []).map((s: any) =>
 s.id === subtask.id ? { ...s, ...subtask } : s
 ),
 })),
 })),
 })),
 })),

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

 reorderTasksInMilestone: (milestoneId, orderedIds) => set((state) => ({
 goals: state.goals.map((g) => ({
 ...g,
 milestones: (g.milestones ?? []).map((m) => {
 if (m.id !== milestoneId) return m;
 const byId = new Map((m.tasks ?? []).map((t) => [t.id, t]));
 const reordered = orderedIds
 .map((id) => byId.get(id))
 .filter((t): t is Task => !!t);
 const remainder = (m.tasks ?? []).filter((t) => !orderedIds.includes(t.id));
 return { ...m, tasks: [...reordered, ...remainder] };
 }),
 })),
 })),

 reorderMilestonesInGoal: (goalId, orderedIds) => set((state) => ({
 goals: state.goals.map((g) => {
 if (g.id !== goalId) return g;
 const byId = new Map((g.milestones ?? []).map((m) => [m.id, m]));
 const reordered = orderedIds
 .map((id) => byId.get(id))
 .filter((m): m is Milestone => !!m)
 .map((m, idx) => ({ ...m, position: idx }));
 // Append any milestones that weren't in orderedIds (defensive).
 const remainder = (g.milestones ?? []).filter((m) => !orderedIds.includes(m.id));
 return { ...g, milestones: [...reordered, ...remainder] };
 }),
 })),

 deleteMilestoneFromGoals: (milestoneId) => set((state) => ({
 goals: state.goals.map((g) => ({
 ...g,
 milestones: (g.milestones || []).filter((m) => m.id !== milestoneId),
 })),
 milestones: state.milestones.filter((m) => m.id !== milestoneId),
 })),

 deleteTaskFromGoals: (taskId) => set((state) => ({
 goals: state.goals.map((g) => ({
 ...g,
 milestones: (g.milestones || []).map((m) => ({
 ...m,
 tasks: (m.tasks || []).filter((t) => t.id !== taskId),
 })),
 })),
 tasks: state.tasks.filter((t) => t.id !== taskId),
 })),

 deleteTodoFromGoals: (todoId) => set((state) => ({
 goals: state.goals.map((g) => ({
 ...g,
 milestones: (g.milestones || []).map((m) => ({
 ...m,
 tasks: (m.tasks || []).map((t) => ({
 ...t,
 todos: (t.todos || []).filter((td) => td.id !== todoId),
 })),
 })),
 })),
 todos: state.todos.filter((td) => td.id !== todoId),
 })),

 deleteSubtaskFromGoals: (subtaskId) => set((state) => ({
 goals: state.goals.map((g) => ({
 ...g,
 milestones: (g.milestones || []).map((m) => ({
 ...m,
 tasks: (m.tasks || []).map((t) => ({
 ...t,
 subtasks: (t.subtasks || []).filter((s: any) => s.id !== subtaskId),
 })),
 })),
 })),
 })),
}));
