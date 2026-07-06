import { GoalItem as Goal, MilestoneItem as Milestone, TaskItem as Task, TodoItem as Todo, User, Event, Tag, SubtaskItem as Subtask } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Function to handle session expiration.
// Throttled so a wave of 401s from concurrent requests doesn't spam
// signOut() and trigger redirect loops. Also skips redirecting when
// already on /login or /signup (the user is in the auth flow).
let _expirationHandledAt = 0;
const handleSessionExpiration = () => {
 if (typeof window === 'undefined') return;
 const now = Date.now();
 if (now - _expirationHandledAt < 3000) return; // throttle: 3s
 _expirationHandledAt = now;

 // Clear localStorage regardless.
 try { localStorage.removeItem('access_token'); } catch { /* ignore */ }

 const onAuthPage =
 window.location.pathname === '/login' ||
 window.location.pathname === '/signup';
 if (onAuthPage) {
 // Just clean state silently; don't redirect (would loop the login page).
 return;
 }

 import('next-auth/react').then(({ signOut }) => {
 signOut({
 callbackUrl: '/login?expired=1',
 redirect: true,
 });
 });
};

// Helper function to get auth headers without session calls.
// IMPORTANT: returns null when no token (instead of throwing) so callers
// can no-op gracefully. Throwing here used to bubble an uncaught Error to
// React's dev overlay (the giant dark "Error: ..." block in the middle of
// the page) every time the user lacked a token.
const getAuthHeaders = (): { Authorization: string; 'Content-Type': string } | null => {
 if (typeof window === 'undefined') return null;
 const token = localStorage.getItem('access_token');
 if (!token) {
 handleSessionExpiration();
 return null;
 }
 return {
 Authorization: `Bearer ${token}`,
 'Content-Type': 'application/json',
 };
};

// Centralised authed JSON request. Handles 401/403 → session expiration,
// extracts error detail from the response body, and parses successful JSON.
type RequestOptions = {
 method?: string;
 body?: unknown;
 errorMessage?: string;
};

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
 const { method = 'GET', body, errorMessage } = options;
 const headers = getAuthHeaders();

 // No token → don't fire the request, throw a friendly typed error that
 // callers can recognise and ignore.
 if (!headers) {
 throw new AuthRequiredError();
 }

 let response: Response;
 try {
 response = await fetch(`${API_BASE_URL}${path}`, {
 method,
 headers,
 body: body !== undefined ? JSON.stringify(body) : undefined,
 });
 } catch (networkErr) {
 // Backend is down / CORS rejected / DNS failure. Throw a clear
 // message instead of letting the raw TypeError bubble to React.
 throw new Error(
 errorMessage
 ? `${errorMessage} (network unreachable)`
 : `Can't reach the API at ${API_BASE_URL}`,
 );
 }

 if (response.status === 401 || response.status === 403) {
 handleSessionExpiration();
 throw new AuthRequiredError('Session expired');
 }

 if (!response.ok) {
 const fallback = errorMessage || `Request failed: ${method} ${path}`;
 const detail = await response
 .json()
 .then((data) => data.detail || fallback)
 .catch(() => fallback);
 throw new Error(detail);
 }

 if (response.status === 204) {
 return undefined as T;
 }

 return response.json() as Promise<T>;
}

// Typed error so callers (Zustand actions, page effects) can swallow
// auth-required failures silently without rendering them to the user.
export class AuthRequiredError extends Error {
 constructor(message = 'Authentication required') {
 super(message);
 this.name = 'AuthRequiredError';
 }
}

// Users API
export const usersApi = {
 getAll: () => apiRequest<User[]>('/users/', { errorMessage: 'Failed to fetch users' }),

 create: (userData: Omit<User, 'id'>) =>
 apiRequest<User>('/users/', { method: 'POST', body: userData, errorMessage: 'Failed to create user' }),

 update: (userData: Partial<User>) =>
 apiRequest<User>('/users/update', { method: 'PATCH', body: userData, errorMessage: 'Failed to update user' }),

 delete: (userId: string) =>
 apiRequest<void>(`/users/${userId}/delete`, { method: 'DELETE', errorMessage: 'Failed to delete user' }),

 me: () => apiRequest<User>('/users/me', { errorMessage: 'Failed to fetch current user' }),

 saveGoogleCalendar: (googleCalendarData: any) =>
 apiRequest<{ message: string }>('/calendars/google-calendar/token', {
 method: 'POST',
 body: googleCalendarData,
 errorMessage: 'Failed to save Google Calendar token',
 }),
};

// Goals API
export const goalsApi = {
 getAll: () => apiRequest<Goal[]>('/user/goals', { errorMessage: 'Failed to fetch goals' }),

 create: (goalData: Omit<Goal, 'id' | 'milestones'>) =>
 apiRequest<Goal>('/user/goals', { method: 'POST', body: goalData, errorMessage: 'Failed to create goal' }),

 update: (goalData: Partial<Goal>) =>
 apiRequest<Goal>('/user/goals/update', { method: 'PATCH', body: goalData, errorMessage: 'Failed to update goal' }),

 getById: (
 goalId: string,
 options?: {
 include_milestones?: boolean;
 include_tasks?: boolean;
 include_subtasks?: boolean;
 include_todos?: boolean;
 }
 ) => {
 const params = new URLSearchParams();
 if (options?.include_milestones) params.append('include_milestones', 'true');
 if (options?.include_tasks) params.append('include_tasks', 'true');
 if (options?.include_subtasks) params.append('include_subtasks', 'true');
 if (options?.include_todos) params.append('include_todos', 'true');
 const query = params.toString() ? `?${params.toString()}` : '';
 return apiRequest<Goal>(`/user/goals/${goalId}${query}`, { errorMessage: 'Failed to fetch goal' });
 },

 delete: (goalId: string) =>
 apiRequest<void>(`/user/goals/${goalId}/delete`, { method: 'DELETE', errorMessage: 'Failed to delete goal' }),
};

// Milestones API
export const milestonesApi = {
 getAll: () => apiRequest<Milestone[]>('/user/milestones', { errorMessage: 'Failed to fetch milestones' }),

 create: (milestoneData: Omit<Milestone, 'id' | 'tasks' | 'todos'>) =>
 apiRequest<Milestone>('/user/milestones', {
 method: 'POST',
 body: milestoneData,
 errorMessage: 'Failed to create milestone',
 }),

 update: (milestoneData: Partial<Milestone>) =>
 apiRequest<Milestone>('/user/milestones/update', {
 method: 'PATCH',
 body: milestoneData,
 errorMessage: 'Failed to update milestone',
 }),

 reorder: (milestoneIds: string[]) =>
 apiRequest<void>('/user/milestones/reorder', {
 method: 'PUT',
 body: { milestone_ids: milestoneIds },
 errorMessage: 'Failed to reorder milestones',
 }),

 getById: (
 milestoneId: string,
 include_tasks: boolean = false,
 include_subtasks: boolean = false,
 include_todos: boolean = false
 ) => {
 const queryParams = new URLSearchParams({
 include_tasks: include_tasks.toString(),
 include_subtasks: include_subtasks.toString(),
 include_todos: include_todos.toString(),
 });
 return apiRequest<Milestone>(`/user/milestones/${milestoneId}?${queryParams}`, {
 errorMessage: 'Failed to fetch milestone',
 });
 },

 delete: (milestoneId: string) =>
 apiRequest<void>(`/user/milestones/${milestoneId}/delete`, {
 method: 'DELETE',
 errorMessage: 'Failed to delete milestone',
 }),
};

// Tasks API
export const tasksApi = {
 getAll: (include_subtasks: boolean = true, include_todos: boolean = true) =>
 apiRequest<Task[]>(
 `/user/tasks?include_subtasks=${include_subtasks}&include_todos=${include_todos}`,
 { errorMessage: 'Failed to fetch tasks' }
 ),

 get: (taskId: string, include_subtasks: boolean = true, include_todos: boolean = true) =>
 apiRequest<Task>(
 `/user/tasks/${taskId}?include_subtasks=${include_subtasks}&include_todos=${include_todos}`,
 { errorMessage: 'Failed to fetch task' }
 ),

 create: (taskData: Omit<Task, 'id'>) =>
 apiRequest<Task>('/user/tasks', { method: 'POST', body: taskData, errorMessage: 'Failed to create task' }),

 update: (taskData: Partial<Task> & { id: string }) =>
 apiRequest<Task>('/user/tasks/update', {
 method: 'PATCH',
 body: taskData,
 errorMessage: 'Failed to update task',
 }),

 delete: (taskId: string) =>
 apiRequest<void>(`/user/tasks/${taskId}/delete`, { method: 'DELETE', errorMessage: 'Failed to delete task' }),
};

// Todos API
export const todosApi = {
 getAll: () => apiRequest<Todo[]>('/user/todos', { errorMessage: 'Failed to fetch todos' }),

 create: (todoData: Omit<Todo, 'id'>) =>
 apiRequest<Todo>('/user/todos', { method: 'POST', body: todoData, errorMessage: 'Failed to create todo' }),

 update: (todoData: Partial<Todo> & { id: string }) =>
 apiRequest<Todo>('/user/todos/update', {
 method: 'PATCH',
 body: todoData,
 errorMessage: 'Failed to update todo',
 }),

 getById: (todoId: string) =>
 apiRequest<Todo>(`/user/todos/${todoId}`, { errorMessage: 'Failed to fetch todo' }),

 delete: (todoId: string) =>
 apiRequest<void>(`/user/todos/${todoId}/delete`, { method: 'DELETE', errorMessage: 'Failed to delete todo' }),
};

// Events API
export const eventsApi = {
 getAll: () => apiRequest<Event[]>('/user/events', { errorMessage: 'Failed to fetch events' }),

 create: (eventData: Omit<Event, 'id'>) =>
 apiRequest<Event>('/user/events', { method: 'POST', body: eventData, errorMessage: 'Failed to create event' }),

 update: (eventData: Partial<Event>) =>
 apiRequest<Event>('/user/events/update', {
 method: 'PATCH',
 body: eventData,
 errorMessage: 'Failed to update event',
 }),

 getById: (eventId: string) =>
 apiRequest<Event>(`/user/events/${eventId}`, { errorMessage: 'Failed to fetch event' }),

 delete: (eventId: string) =>
 apiRequest<void>(`/user/events/${eventId}/delete`, { method: 'DELETE', errorMessage: 'Failed to delete event' }),
};

// Tags API
export const tagsApi = {
 getAll: () => apiRequest<Tag[]>('/tags', { errorMessage: 'Failed to fetch tags' }),

 create: (tagData: Omit<Tag, 'id'>) =>
 apiRequest<Tag>('/tags', { method: 'POST', body: tagData, errorMessage: 'Failed to create tag' }),

 update: (tagData: Partial<Tag>) =>
 apiRequest<Tag>('/tags/update', { method: 'PATCH', body: tagData, errorMessage: 'Failed to update tag' }),

 getById: (tagId: string) =>
 apiRequest<Tag>(`/tags/${tagId}`, { errorMessage: 'Failed to fetch tag' }),

 delete: (tagId: string) =>
 apiRequest<void>(`/tags/delete/${tagId}`, { method: 'DELETE', errorMessage: 'Failed to delete tag' }),
};

// Subtasks API
export const subtasksApi = {
 getAll: () => apiRequest<Subtask[]>('/user/task/subtasks', { errorMessage: 'Failed to fetch subtasks' }),

 create: (subtaskData: Omit<Subtask, 'id'>) =>
 apiRequest<Subtask>('/user/task/subtasks', {
 method: 'POST',
 body: subtaskData,
 errorMessage: 'Failed to create subtask',
 }),

 update: (subtaskData: Partial<Subtask>) =>
 apiRequest<Subtask>('/user/task/subtasks/update', {
 method: 'PATCH',
 body: subtaskData,
 errorMessage: 'Failed to update subtask',
 }),

 getById: (subtaskId: string) =>
 apiRequest<Subtask>(`/user/task/subtasks/${subtaskId}`, { errorMessage: 'Failed to fetch subtask' }),

 delete: (subtaskId: string) =>
 apiRequest<void>(`/user/task/subtasks/${subtaskId}/delete`, {
 method: 'DELETE',
 errorMessage: 'Failed to delete subtask',
 }),
};

// ============================================================
// Notes API
// ============================================================
export interface NoteItem {
 id: string;
 title: string;
 body?: string | null;
 tag?: string | null;
 pinned: boolean;
 created_at: string;
 updated_at: string;
}

export const notesApi = {
 getAll: () => apiRequest<NoteItem[]>('/user/notes', { errorMessage: 'Failed to fetch notes' }),

 create: (data: { title: string; body?: string | null; tag?: string | null; pinned?: boolean }) =>
 apiRequest<NoteItem>('/user/notes', { method: 'POST', body: data, errorMessage: 'Failed to create note' }),

 update: (data: { id: string; title?: string; body?: string | null; tag?: string | null; pinned?: boolean }) =>
 apiRequest<NoteItem>('/user/notes/update', { method: 'PATCH', body: data, errorMessage: 'Failed to update note' }),

 getById: (id: string) => apiRequest<NoteItem>(`/user/notes/${id}`, { errorMessage: 'Failed to fetch note' }),

 delete: (id: string) =>
 apiRequest<{ message: string }>(`/user/notes/${id}/delete`, { method: 'DELETE', errorMessage: 'Failed to delete note' }),
};

// ============================================================
// Templates API (goal blueprints)
// ============================================================
export interface TemplateItem {
 id: string;
 title: string;
 description?: string | null;
 emoji?: string | null;
 tags?: string[] | null;
 blueprint?: {
 milestones?: Array<{
 title: string;
 description?: string;
 tasks?: Array<{ title: string; description?: string }>;
 }>;
 } | null;
 created_at: string;
 user_id: string | null;
}

export const templatesApi = {
 getAll: () => apiRequest<TemplateItem[]>('/user/templates', { errorMessage: 'Failed to fetch templates' }),

 create: (data: Omit<TemplateItem, 'id' | 'created_at' | 'user_id'>) =>
 apiRequest<TemplateItem>('/user/templates', { method: 'POST', body: data, errorMessage: 'Failed to create template' }),

 update: (data: Partial<TemplateItem> & { id: string }) =>
 apiRequest<TemplateItem>('/user/templates/update', { method: 'PATCH', body: data, errorMessage: 'Failed to update template' }),

 getById: (id: string) => apiRequest<TemplateItem>(`/user/templates/${id}`, { errorMessage: 'Failed to fetch template' }),

 delete: (id: string) =>
 apiRequest<{ message: string }>(`/user/templates/${id}/delete`, { method: 'DELETE', errorMessage: 'Failed to delete template' }),

 /** Materialise a template into a real Goal owned by the user. */
 instantiate: (id: string, overrides?: { title_override?: string; start_datetime?: string; end_datetime?: string }) =>
 apiRequest<Goal>(`/user/templates/${id}/instantiate`, { method: 'POST', body: overrides ?? {}, errorMessage: 'Failed to instantiate template' }),
};

// ============================================================
// Trash API (soft-deleted items across all entities)
// ============================================================
export type TrashKind = 'goal' | 'milestone' | 'task' | 'todo' | 'event' | 'note';

export interface TrashItemBE {
 id: string;
 kind: TrashKind;
 title: string;
 deleted_at: string;
}

export const trashApi = {
 list: () => apiRequest<TrashItemBE[]>('/user/trash', { errorMessage: 'Failed to fetch trash' }),

 restore: (kind: TrashKind, id: string) =>
 apiRequest<{ message: string }>(`/user/trash/${kind}/${id}/restore`, { method: 'POST', errorMessage: 'Failed to restore' }),

 purge: (kind: TrashKind, id: string) =>
 apiRequest<{ message: string }>(`/user/trash/${kind}/${id}`, { method: 'DELETE', errorMessage: 'Failed to purge' }),

 empty: () =>
 apiRequest<{ message: string; removed: number }>('/user/trash', { method: 'DELETE', errorMessage: 'Failed to empty trash' }),
};

// ============================================================
// User preferences (preferred_theme, etc.)
// ============================================================
export const userPrefsApi = {
 updateMe: (data: { preferred_theme?: string | null }) =>
 apiRequest<User>('/users/me', { method: 'PATCH', body: data, errorMessage: 'Failed to update profile' }),
};
