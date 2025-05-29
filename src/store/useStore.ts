import { create } from 'zustand';
import { GoalItem as Goal, MilestoneItem as Milestone, TaskItem as Task, TodoItem as Todo } from '@/lib/types';
import { goalsApi, milestonesApi, tasksApi, todosApi } from '@/lib/api';

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
  fetchMilestones: (goalId: string) => Promise<void>;

  // Tasks
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  fetchTasks: (milestoneId: string) => Promise<void>;

  // Todos
  setTodos: (todos: Todo[]) => void;
  addTodo: (todo: Todo) => void;
  updateTodo: (todo: Todo) => void;
  deleteTodo: (todoId: string) => void;
  fetchTodos: (taskId: string) => Promise<void>;
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

  // Goals actions
  setGoals: (goals) => set({ goals }),
  addGoal: (goal) => set((state) => ({ goals: [...state.goals, goal] })),
  updateGoal: (goal) => set((state) => ({
    goals: state.goals.map((g) => (g.id === goal.id ? goal : g))
  })),
  deleteGoal: (goalId) => set((state) => ({
    goals: state.goals.filter((g) => g.id !== goalId)
  })),
  fetchGoals: async () => {
    set({ isLoadingGoals: true, goalsError: null });
    try {
      const data = await goalsApi.getAll();
      set({ goals: data, isLoadingGoals: false });
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
  fetchMilestones: async (goalId) => {
    set({ isLoadingMilestones: true, milestonesError: null });
    try {
      const data = await milestonesApi.getAll(goalId);
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
  fetchTasks: async (milestoneId) => {
    set({ isLoadingTasks: true, tasksError: null });
    try {
      const data = await tasksApi.getAll(milestoneId);
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
  fetchTodos: async (taskId) => {
    set({ isLoadingTodos: true, todosError: null });
    try {
      const data = await todosApi.getAll(taskId);
      set({ todos: data, isLoadingTodos: false });
    } catch (error) {
      set({ todosError: 'Failed to fetch todos', isLoadingTodos: false });
    }
  },
})); 