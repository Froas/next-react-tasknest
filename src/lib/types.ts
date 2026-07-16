import type { AnimalId } from './journeyAnimals';

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

export type TaskKind = 'project' | 'routine' | 'challenge';
export type TaskScope = 'goal' | 'milestone';
export type JourneyThemeId = 'mountain' | 'world-tree' | 'cosmic' | 'volcano' | 'ocean' | 'castle';

export type CompletionRule =
 | { type: 'structural'; auto_completed?: boolean }
 | {
 type: 'metric_target';
 metric_name?: string;
 start_value?: number;
 current_value?: number;
 target_value?: number;
 direction?: 'increase' | 'decrease' | 'at_least' | 'at_most';
 auto_completed?: boolean;
 }
 | {
 type: 'consistency';
 label?: string;
 current_done?: number;
 required_done?: number;
 window_days?: number;
 auto_completed?: boolean;
 }
 | {
 type: 'hybrid';
 structural_weight?: number;
 outcome_weight?: number;
 consistency_weight?: number;
 outcome?: Extract<CompletionRule, { type: 'metric_target' }>;
 consistency?: Extract<CompletionRule, { type: 'consistency' }>;
 current_progress?: number | null;
 auto_completed?: boolean;
 };

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
 position?: number;
 completion_rule?: CompletionRule | null;
 journey_theme_id?: JourneyThemeId;
 journey_character_id?: AnimalId;
}

// Task related types
export interface SubtaskItem extends BaseEntity {
 task_id: string;
 due_date?: string;
 created_at?: string;
 updated_at?: string;
 position?: number;
}

export interface TodoItem extends BaseEntity {
 task_id?: string;
 due_date?: string;
 next_due_date?: string;
 repeat_interval?: string;
 position?: number;
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
 scheduled_date?: string;
 goal_id?: string;
 milestone_id?: string;
 kind?: TaskKind;
 scope?: TaskScope;
 parent_id?: string;
 position?: number;
 completion_rule?: CompletionRule | null;
 todos: TodoItem[];
 subtasks: SubtaskItem[];
}

// Milestone type
export interface MilestoneItem extends BaseEntity {
 goal_id?: string;
 due_date?: string;
 position?: number;
 completion_rule?: CompletionRule | null;
 tasks: TaskItem[];
}

// Goal type
export interface GoalItem extends BaseEntity {
 position?: number;
 completion_rule?: CompletionRule | null;
 enforce_sequential_milestones?: boolean;
 journey_theme_id?: JourneyThemeId;
 journey_character_id?: AnimalId;
 tasks?: TaskItem[];
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
 created_at?: string;
 updated_at?: string;
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
 tasks?: TaskResponse[];
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
 completion_rule?: CompletionRule | null;
 journey_theme_id?: JourneyThemeId;
 journey_character_id?: AnimalId;
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
 scheduled_date?: string;
 goal_id?: string;
 milestone_id?: string;
 kind?: TaskKind;
 scope?: TaskScope;
 position?: number;
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
 position?: number;
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
 position?: number;
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
 preferred_theme?: string | null;
 nav_preferences?: unknown;
 dashboard_preferences?: unknown;
 pinned_goal_ids?: string[] | null;
 recent_goal_ids?: string[] | null;
 goal_color_overrides?: Record<string, string> | null;
 full_name?: string;
 created_at?: string;
 updated_at?: string;
}

export interface Tag {
 id: string;
 name: string;
 color?: string;
 description?: string;
 created_at?: string;
 updated_at?: string;
 goal_id?: string | null;
 milestone_id?: string | null;
 task_id?: string | null;
 subtask_id?: string | null;
 todo_id?: string | null;
 event_id?: string | null;
}
