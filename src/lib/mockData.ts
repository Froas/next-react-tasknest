import { GoalItem as Goal, StatusType, PriorityType } from './types';

export const simulatedApiGoals: Goal[] = [
  {
    id: 'g1',
    title: 'Learn Web Development',
    description: 'Master modern web development technologies and practices',
    status: StatusType.IN_PROGRESS,
    priority: PriorityType.HIGH,
    start_datetime: '2024-01-01T00:00:00Z',
    end_datetime: '2024-12-31T23:59:59Z',
    milestones: [
      {
        id: 'm1',
        title: 'Master HTML & CSS',
        description: 'Learn modern HTML5 and CSS3 with responsive design',
        status: StatusType.FINISHED,
        priority: PriorityType.MEDIUM,
        start_datetime: '2024-01-01T00:00:00Z',
        end_datetime: '2024-03-31T23:59:59Z',
        due_date: '2024-03-31T23:59:59Z',
        goal_id: 'g1',
        position: 1,
        tasks: [
          {
            id: 't1',
            title: 'Practice Flexbox daily',
            description: 'Complete daily Flexbox challenges',
            status: StatusType.OUTSTANDING,
            priority: PriorityType.LOW,
            start_datetime: '2024-01-01T00:00:00Z',
            due_date: '2024-01-31T23:59:59Z',
            milestone_id: 'm1',
            todos: [
              {
                id: 'td1',
                title: 'Complete Flexbox Froggy',
                description: 'Finish all levels of Flexbox Froggy',
                status: StatusType.OUTSTANDING,
                priority: PriorityType.LOW,
                start_datetime: '2024-01-01T00:00:00Z',
                due_date: '2024-01-07T23:59:59Z',
                task_id: 't1',

              }
            ],
            subtasks: [],
          },
          {
            id: 't2',
            title: 'Build a responsive landing page',
            description: 'Create a modern landing page using HTML and CSS',
            status: StatusType.FINISHED,
            priority: PriorityType.MEDIUM,
            start_datetime: '2024-01-15T00:00:00Z',
            end_datetime: '2024-02-15T23:59:59Z',
            due_date: '2024-02-15T23:59:59Z',
            milestone_id: 'm1',
            todos: [],
            subtasks: []
          }
        ],
        todos: []
      },
      {
        id: 'm2',
        title: 'Learn JavaScript Fundamentals',
        description: 'Master core JavaScript concepts and modern ES6+ features',
        status: StatusType.OUTSTANDING,
        priority: PriorityType.HIGH,
        start_datetime: '2024-04-01T00:00:00Z',
        due_date: '2024-06-30T23:59:59Z',
        goal_id: 'g1',
        position: 2,
        tasks: [
          {
            id: 't3',
            title: 'Solve LeetCode daily',
            description: 'Complete one JavaScript problem daily',
            status: StatusType.OUTSTANDING,
            priority: PriorityType.MEDIUM,
            start_datetime: '2024-04-01T00:00:00Z',
            due_date: '2024-06-30T23:59:59Z',
            milestone_id: 'm2',
            todos: [],
            subtasks: [],
          }
        ],
        todos: []
      }
    ]
  },
  {
    id: 'g2',
    title: 'Write a Novel',
    description: 'Complete a 50,000-word novel',
    status: StatusType.FINISHED,
    priority: PriorityType.MEDIUM,
    start_datetime: '2023-11-01T00:00:00Z',
    end_datetime: '2024-01-31T23:59:59Z',
    milestones: [
      {
        id: 'm3',
        title: 'Outline Plot',
        description: 'Create detailed plot outline and character profiles',
        status: StatusType.FINISHED,
        priority: PriorityType.HIGH,
        start_datetime: '2023-11-01T00:00:00Z',
        end_datetime: '2023-11-15T23:59:59Z',
        due_date: '2023-11-15T23:59:59Z',
        goal_id: 'g2',
        position: 1,
        tasks: [
          {
            id: 't5',
            title: 'Write 500 words daily',
            description: 'Maintain daily writing habit',
            status: StatusType.FINISHED,
            priority: PriorityType.MEDIUM,
            start_datetime: '2023-11-01T00:00:00Z',
            end_datetime: '2024-01-31T23:59:59Z',
            due_date: '2024-01-31T23:59:59Z',
            milestone_id: 'm3',
            todos: [],
            subtasks: []
          }
        ],
        todos: []
      }
    ]
  }
];

export const fetchGoals = (): Promise<Goal[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(simulatedApiGoals);
    }, 500);
  });
}; 