export interface Goal {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    start_datetime: string;
    end_datetime: string;
    user_id: string;
  }

  export interface NewGoal {
    title: string;
    description: string;
    priority: string; 
  }

  export interface Milestone {
    id: string;
    title: string;
    description: string;
    due_date?: string;
    user_id: string;
    position: number;
    priority: 'low' | 'medium' | 'high';
    status: 'outstanding' | 'in progress' | 'started' | 'completed' | 'finished' | 'closed' | 'aborted';
  }