import { create } from 'zustand';
import { GoalItem as Goal, MilestoneItem as Milestone, TaskItem as Task, TodoItem as Todo, Event, SubtaskItem as Subtask } from '@/lib/types';
import { goalsApi, milestonesApi, tasksApi, todosApi, eventsApi } from '@/lib/api';

interface AppStore {
  // Goals
  goals: Goal[];
  isLoadingGoals: boolean;
  goalsError: string | null;
  
  // Milestones
  milestones: Milestone[];
  isLoadingMilestones: boolean;
  milestonesError: string | null;
  
  // Tasks
  tasks: Task[];
  isLoadingTasks: boolean;
  tasksError: string | null;
  
  // Todos
  todos: Todo[];
  isLoadingTodos: boolean;
  todosError: string | null;
  
  // Events
  events: Event[];
  isLoadingEvents: boolean;
  eventsError: string | null;

  // Actions
  // Goals
  setGoals: (goals: Goal[]) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (goal: Goal) => void;
  deleteGoal: (goalId: string) => void;
  fetchGoals: () => Promise<void>;

  // Milestones
  setMilestones: (milestones: Milestone[]) => void;
  addMilestone: (milestone: Milestone) => void;
  updateMilestone: (milestone: Milestone) => void;
  deleteMilestone: (milestoneId: string) => void;
  fetchMilestones: () => Promise<void>;

  // Tasks
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  fetchTasks: () => Promise<void>;

  // Todos
  setTodos: (todos: Todo[]) => void;
  addTodo: (todo: Todo) => void;
  updateTodo: (todo: Todo) => void;
  deleteTodo: (todoId: string) => void;
  fetchTodos: () => Promise<void>;

  // Events
  setEvents: (events: Event[]) => void;
  addEvent: (event: Event) => void;
  updateEvent: (event: Event) => void;
  deleteEvent: (eventId: string) => void;
  fetchEvents: () => Promise<void>;

  // Helper methods for nested updates
  updateMilestoneInGoal: (goalId: string, milestone: Milestone) => void;
  updateTaskInMilestone: (goalId: string, milestoneId: string, task: Task) => void;
  
  // More specific adders for optimistic updates
  addMilestoneToGoal: (milestone: Milestone, goalId: string) => void;
  addTaskToMilestoneInGoal: (task: Task, milestoneId: string, goalId: string) => void;
  addTodoToTaskInMilestoneInGoal: (todo: Todo, taskId: string, milestoneId: string, goalId: string) => void;
  addSubtaskToTaskInMilestoneInGoal: (subtask: Subtask, taskId: string, milestoneId: string, goalId: string) => void;

}

export const useStore = create<AppStore>((set, get) => ({
  // Initial state
  goals: [],
  isLoadingGoals: false,
  goalsError: null,
  
  milestones: [],
  isLoadingMilestones: false,
  milestonesError: null,
  
  tasks: [],
  isLoadingTasks: false,
  tasksError: null,
  
  todos: [],
  isLoadingTodos: false,
  todosError: null,
  
  events: [],
  isLoadingEvents: false,
  eventsError: null,

  // Goals actions
  setGoals: (goals) => set({ goals }),
  addGoal: (goal) => set((state) => ({ goals: [...state.goals, goal] })),
  updateGoal: (goal) => set((state) => ({
    goals: state.goals.map((g) => (g.id === goal.id ? { ...g, ...goal } : g))
  })),
  deleteGoal: (goalId) => set((state) => ({
    goals: state.goals.filter((g) => g.id !== goalId)
  })),
  
  fetchGoals: async () => {
    set({ isLoadingGoals: true, goalsError: null });
    try {
      const goals = await Promise.all(
        (await goalsApi.getAll()).map(async (goal) => {
          try {
            return await goalsApi.getById(goal.id, { include_milestones: true });
          } catch (error) {
            console.error(`Failed to fetch milestones for goal ${goal.id}:`, error);
            return goal;
          }
        })
      );
      set({ goals, isLoadingGoals: false });
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
  
  fetchMilestones: async () => {
    set({ isLoadingMilestones: true, milestonesError: null });
    try {
      const data = await milestonesApi.getAll();
      set({ milestones: data, isLoadingMilestones: false });
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
  
  fetchTasks: async () => {
    set({ isLoadingTasks: true, tasksError: null });
    try {
      const data = await tasksApi.getAll();
      set({ tasks: data, isLoadingTasks: false });
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
  
  fetchTodos: async () => {
    set({ isLoadingTodos: true, todosError: null });
    try {
      const data = await todosApi.getAll();
      set({ todos: data, isLoadingTodos: false });
    } catch (error) {
      set({ todosError: 'Failed to fetch todos', isLoadingTodos: false });
    }
  },

  // Events actions
  setEvents: (events) => set({ events }),
  addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
  updateEvent: (event) => set((state) => ({
    events: state.events.map((e) => (e.id === event.id ? event : e))
  })),
  deleteEvent: (eventId) => set((state) => ({
    events: state.events.filter((e) => e.id !== eventId)
  })),
  
  fetchEvents: async () => {
    set({ isLoadingEvents: true, eventsError: null });
    try {
      const data = await eventsApi.getAll();
      set({ events: data, isLoadingEvents: false });
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
                            subtasks: [...(t.subtasks || []), subtask],
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
}));
