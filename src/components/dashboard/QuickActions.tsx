import React from 'react';
import { GoalItem as Goal, StatusType, PriorityType } from '@/lib/types';

interface QuickActionsProps {
  onAddGoal?: () => void;
  onAddTask?: () => void;
  onAddTodo?: () => void;
  onAddMilestone?: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onAddGoal,
  onAddTask,
  onAddTodo,
  onAddMilestone,
}) => {
  const actions = [
    {
      title: 'Add Goal',
      description: 'Create a new goal with milestones and tasks',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      onClick: onAddGoal,
    },
     {
      title: 'Add Milestone',
      description: 'Create a new milestone for a goal',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      onClick: onAddMilestone,
    },
    {
      title: 'Add Task',
      description: 'Create a new task for a milestone',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      onClick: onAddTask,
    },
    {
      title: 'Add Todo',
      description: 'Create a new one-time todo item',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      onClick: onAddTodo,
    },
   
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`
              p-4 rounded-lg 
              border border-gray-200 
              bg-white
              hover:bg-gray-50 
              hover:border-gray-300 
              active:bg-gray-100
              transition-all duration-200 
              flex items-start space-x-3
              group
              ${action.onClick ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
            `}
            disabled={!action.onClick}
          >
            <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-gray-200 transition-colors duration-200">
              <div className="text-gray-900">
                {action.icon}
              </div>
            </div>
            <div className="text-left">
              <h4 className="font-medium text-gray-900 group-hover:text-gray-800 transition-colors duration-200">
                {action.title}
              </h4>
              <p className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors duration-200">
                {action.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}; 