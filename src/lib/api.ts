import { GoalItem as Goal, MilestoneItem as Milestone, TaskItem as Task, TodoItem as Todo, StatusType, PriorityType, User, Event, Tag, SubtaskItem as Subtask } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Helper function to get auth headers without session calls
const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    throw new Error('No access token found');
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// Auth API
export const authApi = {
  login: async (username: string, password: string): Promise<{ access_token: string; token_type: string }> => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${API_BASE_URL}/users/token`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to login' }));
      throw new Error(error.detail || 'Failed to login');
    }
    
    const data = await response.json();
    // Save token to localStorage
    localStorage.setItem('access_token', data.access_token);
    return data;
  },

  getCurrentUser: async (): Promise<User> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/users/me`, { headers });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to get current user' }));
      throw new Error(error.detail || 'Failed to get current user');
    }
    return response.json();
  },

  logout: () => {
    localStorage.removeItem('access_token');
  },
};

// Users API
export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/users/`, { headers });
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },

  create: async (userData: Omit<User, 'id'>): Promise<User> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/users/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error('Failed to create user');
    return response.json();
  },

  update: async (userData: Partial<User>): Promise<User> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/users/update`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error('Failed to update user');
    return response.json();
  },

  delete: async (userId: string): Promise<void> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/users/${userId}/delete`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error('Failed to delete user');
  },

  me: async (): Promise<User> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/users/me`, { headers });
    if (!response.ok) throw new Error('Failed to fetch current user');
    return response.json();
  },
  
  saveGoogleCalendar: async (googleCalendarData: any): Promise<{ message: string }> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/calendars/google-calendar/token`, {
      method: 'POST',
      headers,
      body: JSON.stringify(googleCalendarData),
    });
    if (!response.ok) throw new Error('Failed to save Google Calendar token');
    return response.json();
  },
};

// Goals API
export const goalsApi = {
  getAll: async (): Promise<Goal[]> => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/user/goals`, { headers });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to fetch goals' }));
        throw new Error(error.detail || 'Failed to fetch goals');
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching goals:', error);
      throw error;
    }
  },

  create: async (goalData: Omit<Goal, 'id' | 'milestones'>): Promise<Goal> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/goals`, {
      method: 'POST',
      headers,
      body: JSON.stringify(goalData),
    });
    if (!response.ok) throw new Error('Failed to create goal');
    return response.json();
  },

  update: async (goalData: Partial<Goal>): Promise<Goal> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/goals/update`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(goalData),
    });
    if (!response.ok) throw new Error('Failed to update goal');
    return response.json();
  },

  getById: async (goalId: string, options?: { 
    include_milestones?: boolean;
    include_tasks?: boolean;
    include_subtasks?: boolean;
    include_todos?: boolean;
  }): Promise<Goal> => {
    const headers = getAuthHeaders();
    const params = new URLSearchParams();
    if (options?.include_milestones) params.append('include_milestones', 'true');
    if (options?.include_tasks) params.append('include_tasks', 'true');
    if (options?.include_subtasks) params.append('include_subtasks', 'true');
    if (options?.include_todos) params.append('include_todos', 'true');
    
    const url = `${API_BASE_URL}/user/goals/${goalId}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch goal');
    return response.json();
  },

  delete: async (goalId: string): Promise<void> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/goals/${goalId}/delete`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error('Failed to delete goal');
  },
};

// Milestones API
export const milestonesApi = {
  getAll: async (): Promise<Milestone[]> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/milestones`, { headers });
    if (!response.ok) throw new Error('Failed to fetch milestones');
    return response.json();
  },

  create: async (milestoneData: Omit<Milestone, 'id' | 'tasks' | 'todos'>): Promise<Milestone> => {
    const headers = getAuthHeaders();
    console.log(milestoneData);
    const response = await fetch(`${API_BASE_URL}/user/milestones`, {
      method: 'POST',
      headers,
      body: JSON.stringify(milestoneData),
    });
    if (!response.ok) throw new Error('Failed to create milestone');
    return response.json();
  },

  update: async (milestoneData: Partial<Milestone>): Promise<Milestone> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/milestones/update`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(milestoneData),
    });
    if (!response.ok) throw new Error('Failed to update milestone');
    return response.json();
  },

  reorder: async (milestoneIds: string[]): Promise<void> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/milestones/reorder`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ milestone_ids: milestoneIds }),
    });
    if (!response.ok) throw new Error('Failed to reorder milestones');
  },

  getById: async (
    milestoneId: string,
    include_tasks: boolean = false,
    include_subtasks: boolean = false,
    include_todos: boolean = false
  ): Promise<Milestone> => {
    const headers = getAuthHeaders();
    const queryParams = new URLSearchParams({
      include_tasks: include_tasks.toString(),
      include_subtasks: include_subtasks.toString(),
      include_todos: include_todos.toString()
    });
    const response = await fetch(
      `${API_BASE_URL}/user/milestones/${milestoneId}?${queryParams}`,
      { headers }
    );
    if (!response.ok) throw new Error('Failed to fetch milestone');
    return response.json();
  },

  delete: async (milestoneId: string): Promise<void> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/milestones/${milestoneId}/delete`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error('Failed to delete milestone');
  },
};

// Tasks API
export const tasksApi = {
  getAll: async (include_subtasks: boolean = true, include_todos: boolean = true): Promise<Task[]> => {
    const headers = getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/user/tasks?include_subtasks=${include_subtasks}&include_todos=${include_todos}`,
      { headers }
    );
    if (!response.ok) throw new Error('Failed to fetch tasks');
    return response.json();
  },

  get: async (taskId: string, include_subtasks: boolean = true, include_todos: boolean = true): Promise<Task> => {
    const headers = getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/user/tasks/${taskId}?include_subtasks=${include_subtasks}&include_todos=${include_todos}`,
      { headers }
    );
    if (!response.ok) throw new Error('Failed to fetch task');
    return response.json();
  },

  create: async (taskData: Omit<Task, 'id'>): Promise<Task> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(taskData),
    });
    if (!response.ok) throw new Error('Failed to create task');
    return response.json();
  },

  update: async (taskData: Partial<Task> & { id: string }): Promise<Task> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/tasks/update`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(taskData),
    });
    if (!response.ok) throw new Error('Failed to update task');
    return response.json();
  },

  delete: async (taskId: string): Promise<void> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/tasks/${taskId}/delete`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error('Failed to delete task');
  }
};

// Todos API
export const todosApi = {
  getAll: async (): Promise<Todo[]> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/todos`, { headers });
    if (!response.ok) throw new Error('Failed to fetch todos');
    return response.json();
  },

  create: async (todoData: Omit<Todo, 'id'>): Promise<Todo> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/todos`, {
      method: 'POST',
      headers,
      body: JSON.stringify(todoData),
    });
    if (!response.ok) throw new Error('Failed to create todo');
    return response.json();
  },

  update: async (todoData: Partial<Todo> & { id: string }): Promise<Todo> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/todos/update`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(todoData),
    });
    if (!response.ok) throw new Error('Failed to update todo');
    return response.json();
  },

  getById: async (todoId: string): Promise<Todo> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/todos/${todoId}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch todo');
    return response.json();
  },

  delete: async (todoId: string): Promise<void> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/todos/${todoId}/delete`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error('Failed to delete todo');
  },
};

// Events API
export const eventsApi = {
  getAll: async (): Promise<Event[]> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/events`, { headers });
    if (!response.ok) throw new Error('Failed to fetch events');
    return response.json();
  },

  create: async (eventData: Omit<Event, 'id'>): Promise<Event> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify(eventData),
    });
    if (!response.ok) throw new Error('Failed to create event');
    return response.json();
  },

  update: async (eventData: Partial<Event>): Promise<Event> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/events/update`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(eventData),
    });
    if (!response.ok) throw new Error('Failed to update event');
    return response.json();
  },

  getById: async (eventId: string): Promise<Event> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/events/${eventId}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch event');
    return response.json();
  },

  delete: async (eventId: string): Promise<void> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/events/${eventId}/delete`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error('Failed to delete event');
  },
};

// Tags API
export const tagsApi = {
  getAll: async (): Promise<Tag[]> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tags`, { headers });
    if (!response.ok) throw new Error('Failed to fetch tags');
    return response.json();
  },

  create: async (tagData: Omit<Tag, 'id'>): Promise<Tag> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tags`, {
      method: 'POST',
      headers,
      body: JSON.stringify(tagData),
    });
    if (!response.ok) throw new Error('Failed to create tag');
    return response.json();
  },

  update: async (tagData: Partial<Tag>): Promise<Tag> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tags/update`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(tagData),
    });
    if (!response.ok) throw new Error('Failed to update tag');
    return response.json();
  },

  getById: async (tagId: string): Promise<Tag> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tags/${tagId}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch tag');
    return response.json();
  },

  delete: async (tagId: string): Promise<void> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tags/delete/${tagId}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error('Failed to delete tag');
  },
};

// Subtasks API
export const subtasksApi = {
  getAll: async (): Promise<Subtask[]> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/task/subtasks`, { headers });
    if (!response.ok) throw new Error('Failed to fetch subtasks');
    return response.json();
  },

  create: async (subtaskData: Omit<Subtask, 'id'>): Promise<Subtask> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/task/subtasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(subtaskData),
    });
    if (!response.ok) throw new Error('Failed to create subtask');
    return response.json();
  },

  update: async (subtaskData: Partial<Subtask>): Promise<Subtask> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/task/subtasks/update`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(subtaskData),
    });
    if (!response.ok) throw new Error('Failed to update subtask');
    return response.json();
  },

  getById: async (subtaskId: string): Promise<Subtask> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/task/subtasks/${subtaskId}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch subtask');
    return response.json();
  },

  delete: async (subtaskId: string): Promise<void> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/user/task/subtasks/${subtaskId}/delete`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error('Failed to delete subtask');
  },
};
