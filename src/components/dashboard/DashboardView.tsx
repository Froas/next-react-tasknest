'use client';

import React from 'react';
import { GoalItem as Goal, StatusType } from '@/lib/types';
import GoalCard from './GoalCard';
import { useStore } from '@/store/useStore';

interface DashboardViewProps {
  onSelectGoal: (goalId: string) => void;
  onGoalUpdate: (updatedGoals: Goal[]) => void;
  onCreateGoal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  onSelectGoal, 
  onGoalUpdate,
  onCreateGoal,
}) => {
  const { goals, isLoadingGoals, goalsError, fetchGoals } = useStore();

  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.status === StatusType.FINISHED).length;
  const overallProgress = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

  // Get active goals (not completed or cancelled)
  const activeGoals = goals.filter(
    goal => goal.status !== StatusType.FINISHED && goal.status !== StatusType.CANCELLED
  );

  if (isLoadingGoals) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
      </div>
    );
  }

  if (goalsError) {
    return (
      <div className="bg-red-50 text-red-800 p-4 rounded-lg">
        <p className="font-medium">Error loading goals</p>
        <p className="text-sm mt-1">{goalsError}</p>
        <button
          onClick={fetchGoals}
          className="mt-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Dashboard Overview</h2>
        <button
          onClick={onCreateGoal}
          className="px-4 py-2 rounded-xl font-medium cursor-pointer transition-colors duration-200 bg-gray-800 text-white hover:bg-gray-900"
        >
          Create New Goal
        </button>
      </div>

      {/* Daily Check-in Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6 flex flex-col sm:flex-row items-center justify-between">
        <div className="flex items-center space-x-4 mb-4 sm:mb-0">
          <div className="bg-gray-100 p-3 rounded-full">
            <svg
              className="w-6 h-6 text-gray-800"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 3v1m0 16v1m9-9h1M3 12H2m8.003-9.997l-.707.707M19.003 19.003l.707.707M3.707 3.707l-.707-.707m15.656 15.656l.707.707M12 7a5 5 0 110 10 5 5 0 010-10z"
              ></path>
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium">Daily Check-in</h3>
            <p className="text-gray-600 text-sm">Start your day right!</p>
          </div>
        </div>
        <button className="px-4 py-2 rounded-xl font-medium cursor-pointer transition-colors duration-200 bg-gray-800 text-white hover:bg-gray-900">
          Complete Today's Tasks
        </button>
      </div>

      {/* Overall Progress Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h3 className="text-lg font-medium mb-3">Overall Goal Progress</h3>
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-700">Total Goals Completed:</span>
          <span className="font-semibold text-gray-800">
            {completedGoals} / {totalGoals}
          </span>
        </div>
        <div className="bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gray-800 h-full rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${overallProgress}%` }}
          ></div>
        </div>
      </div>

      {/* Goals List */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold mb-4">Active Goals</h3>
        {activeGoals.length > 0 ? (
          activeGoals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onClick={() => onSelectGoal(goal.id)}
            />
          ))
        ) : (
          <div className="text-center py-8 bg-white rounded-xl shadow-sm">
            <p className="text-gray-500">No active goals. Create a new goal to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}; 