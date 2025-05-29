export enum StatusType {
//   NOT_STARTED = 'NOT_STARTED',
    OUTSTANDING = "outstanding",
    STARTED = "started",
    IN_PROGRESS = "in progress",
    FINISHED = "finished",
    CLOSED = "closed",
    ABORTED = "aborted",
    CANCELLED = "cancelled"
}

export enum PriorityType {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high'
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  status: StatusType;
  priority: PriorityType;
  due_date?: string;
  task_id: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: StatusType;
  priority: PriorityType;
  due_date?: string;
  milestone_id: string;
  todos: Todo[];
  subtasks: Task[];
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  status: StatusType;
  priority: PriorityType;
  due_date?: string;
  goal_id: string;
  position: number;
  tasks: Task[];
  todos: Todo[];
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  status: StatusType;
  priority: PriorityType;
  due_date?: string;
  end_datetime?: string;
  milestones: Milestone[];
  created_at: string;
  updated_at: string;
} 