// Enums to match backend
export enum StatusType {
 OUTSTANDING ="outstanding",
 STARTED ="started",
 IN_PROGRESS ="in progress",
 FINISHED ="finished",
 CLOSED ="closed",
 ABORTED ="aborted",
 CANCELLED ="cancelled"
}

export enum PriorityType {
 LOW = 'low',
 MEDIUM = 'medium',
 HIGH = 'high'
}

// Base interfaces
export interface BaseEntity {
 id: string;
 title: string;
 description: string;
 start_datetime?: string;
 end_datetime?: string;
 status: StatusType;
 priority: PriorityType;
}

export interface GoalEntity {
 id: string;
 title: string;
 description: string;
 start_datetime?: string;
 end_datetime?: string;
 priority: PriorityType;
 status: StatusType;
}

// Task related types
export interface SubtaskItem extends BaseEntity {
 task_id: string;
 due_date?: string;
 created_at: string;
 updated_at: string;
}

export interface TodoItem extends BaseEntity {
 task_id?: string;
 due_date?: string;
 next_due_date?: string;
 repeat_interval?: string;
}

export interface TaskItem extends BaseEntity {
 id: string;
 title: string;
 description: string;
 status: StatusType;
 priority: PriorityType;
 start_datetime?: string;
 end_datetime?: string;
 due_date?: string;
 milestone_id: string;
 parent_id?: string;
 todos: TodoItem[];
 subtasks: SubtaskItem[];
}

// Milestone type
export interface MilestoneItem extends BaseEntity {
 goal_id?: string;
 due_date?: string;
 position?: number;
 tasks: TaskItem[];
}

// Goal type
export interface GoalItem extends BaseEntity {

 milestones: MilestoneItem[];
}

// Event type
export interface Event {
 id: string;
 title: string;
 description?: string;
 start_datetime?: string;
 end_datetime?: string;
 event_type?: string;
 location?: string;
 recurrence_rule?: string;
 status: StatusType;
 goal_id?: string;
 milestone_id?: string;
 created_at: string;
 updated_at: string;
}

// Generated types for AI suggestions
export interface GeneratedTasks {
 dailyTasks: string[];
 oneTimeTodos: string[];
}

export interface GeneratedGoalIdea {
 name: string;
 description: string;
}

// API Response types
export interface GoalResponse extends Omit<GoalItem, 'user_id'> {
 milestones: MilestoneResponse[];
}

export interface MilestoneResponse extends MilestoneItem {
 tasks: TaskResponse[];
}

export interface TaskResponse extends TaskItem {
 todos: TodoResponse[];
 subtasks: SubtaskResponse[];
}

export interface TodoResponse extends TodoItem {}

export interface SubtaskResponse extends TaskItem {
 task_id: string;
 created_at: string;
 updated_at: string;
}

// Update types for API requests
export interface GoalUpdate {
 id: string;
 title?: string;
 description?: string;
 priority?: PriorityType;
 start_datetime?: string;
 end_datetime?: string;
}

export interface MilestoneUpdate {
 id: string;
 title?: string;
 description?: string;
 status?: StatusType;
 priority?: PriorityType;
 due_date?: string;
 start_datetime?: string;
 end_datetime?: string;
 goal_id?: string;
 position?: number;
}

export interface TaskUpdate {
 id: string;
 title?: string;
 description?: string;
 priority?: PriorityType;
 status?: StatusType;
 start_datetime?: string;
 end_datetime?: string;
 due_date?: string;
 milestone_id?: string;
}

export interface TodoUpdate {
 id: string;
 title?: string;
 description?: string;
 priority?: PriorityType;
 status?: StatusType;
 repeat_interval?: string;
 next_due_date?: string;
 start_datetime?: string;
 end_datetime?: string;
 due_date?: string;
 task_id?: string;
}

export interface SubtaskUpdate {
 id: string;
 title?: string;
 description?: string;
 priority?: PriorityType;
 status?: StatusType;
 start_datetime?: string;
 end_datetime?: string;
 due_date?: string;
 task_id?: string;
}

export interface EventUpdate {
 id: string;
 title?: string;
 description?: string;
 start_datetime?: string;
 end_datetime?: string;
 event_type?: string;
 location?: string;
 recurrence_rule?: string;
}

export interface User {
 id: string;
 username: string;
 email: string;
 full_name?: string;
 created_at: string;
 updated_at: string;
}

export interface Tag {
 id: string;
 name: string;
 color?: string;
 description?: string;
 created_at: string;
 updated_at: string;
} 