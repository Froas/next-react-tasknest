'use client';

import React from 'react';
import { GoalItem as Goal, StatusType } from '@/lib/types';
import GoalCard from './GoalCard';
import { useStore } from '@/store/useStore';
import { CalendarWidget } from './CalendarWidget';

interface DashboardViewProps {
  onSelectGoal: (goalId: string) => void;
  onGoalUpdate: (updatedGoals: Goal[]) => void;
  onCreateGoal: () => void;
  orderBy: 'title' | 'start_desc' | 'start_asc' | 'priority_desc' | 'priority_asc';
  setOrderBy: React.Dispatch<React.SetStateAction<'title' | 'start_desc' | 'start_asc' | 'priority_desc' | 'priority_asc'>>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onSelectGoal,
  onGoalUpdate,
  onCreateGoal,
  orderBy,
  setOrderBy,
}) => {
  // Берём данные из Zustand
  const { goals, isLoadingGoals, goalsError, fetchGoals } = useStore();

  const totalGoals = goals.length;
  const completedGoals = goals.filter((g: Goal) => g.status === StatusType.FINISHED).length;
  const overallProgress = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

  // Get active goals (not completed or cancelled)

  const activeGoals = goals.filter(
    (goal: Goal) => goal.status !== StatusType.FINISHED && goal.status !== StatusType.CANCELLED
  );

  // Sort active goals based on orderBy
  const sortedActiveGoals = [...activeGoals].sort((a, b) => {
    if (orderBy === 'title') {
      return (a.title || '').localeCompare(b.title || '');
    }
    if (orderBy === 'start_desc') {
      return new Date(b.start_datetime || 0).getTime() - new Date(a.start_datetime || 0).getTime();
    }
    if (orderBy === 'start_asc') {
      return new Date(a.start_datetime || 0).getTime() - new Date(b.start_datetime || 0).getTime();
    }
    if (orderBy === 'priority_desc') {
      return (b.priority || '').localeCompare(a.priority || '');
    }
    if (orderBy === 'priority_asc') {
      return (a.priority || '').localeCompare(b.priority || '');
    }
    return 0;
  });

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

      <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-6">
        {/* Overall Progress Card */}
        <div className="bg-white rounded-xl shadow-sm p-6">
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
        
        {/* Calendar Widget */}
      </div>

      {/* Goals List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-semibold">Active Goals</h3>
          <div>
            <label htmlFor="order-goals" className="mr-2 text-sm text-gray-700">Order by:</label>
            <select
              id="order-goals"
              value={orderBy}
              onChange={e => setOrderBy(e.target.value as any)}
              className="px-2 py-1 rounded border border-gray-300 text-sm"
            >
              <option value="title">Title (A-Z)</option>
              <option value="start_desc">Start Date (Newest)</option>
              <option value="start_asc">Start Date (Oldest)</option>
              <option value="priority_desc">Priority (High-Low)</option>
              <option value="priority_asc">Priority (Low-High)</option>
            </select>
          </div>
        </div>
        {sortedActiveGoals.length > 0 ? (
          sortedActiveGoals.map((goal: Goal) => (
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
