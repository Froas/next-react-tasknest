'use client';

import React, { useState, useEffect } from 'react';
import { withAuth } from '@/hoc/withAuth';
import { GoalItem as Goal, StatusType, PriorityType } from '@/lib/types';
import { useStore } from '@/store/useStore';
import dynamic from 'next/dynamic';
const GoalForm = dynamic(() => import('@/components/dashboard/GoalForm').then(m => m.GoalForm), { ssr: false });
import { goalsApi } from '@/lib/api';
import { Plus, Target, Calendar, Filter } from 'lucide-react';

const GoalsPage: React.FC = () => {
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<StatusType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'title' | 'priority' | 'created' | 'due'>('title');

  const { 
    goals, 
    isLoadingGoals, 
    goalsError,
    fetchGoals,
    addGoal,
    deleteGoal: deleteGoalFromStore,
  } = useStore();

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleGoalSubmit = async (goalData: Partial<Goal>) => {
    try {
      const newGoal = await goalsApi.create({
        title: goalData.title!,
        description: goalData.description!,
        status: goalData.status || StatusType.OUTSTANDING,
        priority: goalData.priority || PriorityType.HIGH,
        start_datetime: goalData.start_datetime,
        end_datetime: goalData.end_datetime,
      });
      addGoal(newGoal);
      setIsCreatingGoal(false);
    } catch (error) {
      console.error('Error saving goal:', error);
    }
  };

  const handleGoalDelete = async (goalId: string) => {
    try {
      await goalsApi.delete(goalId);
      deleteGoalFromStore(goalId);
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  const getStatusColor = (status: StatusType) => {
    switch (status) {
      case StatusType.FINISHED:
        return 'bg-green-100 text-green-800 border-green-200';
      case StatusType.IN_PROGRESS:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case StatusType.OUTSTANDING:
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: PriorityType) => {
    switch (priority) {
      case PriorityType.HIGH:
        return 'bg-red-100 text-red-800 border-red-200';
      case PriorityType.MEDIUM:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case PriorityType.LOW:
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredGoals = goals.filter(goal => 
    filterStatus === 'all' || goal.status === filterStatus
  );

  const sortedGoals = [...filteredGoals].sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      case 'due':
        return new Date(a.end_datetime || '').getTime() - new Date(b.end_datetime || '').getTime();
      default:
        return 0;
    }
  });

  if (isLoadingGoals) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      
      <main className="container mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Goals</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage and track your long-term objectives</p>
          </div>
          
          <button
            onClick={() => setIsCreatingGoal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Create Goal</span>
          </button>
        </div>

        {/* Filters and Sort */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as StatusType | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value={StatusType.OUTSTANDING}>Outstanding</option>
              <option value={StatusType.IN_PROGRESS}>In Progress</option>
              <option value={StatusType.FINISHED}>Finished</option>
            </select>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="title">Sort by Title</option>
            <option value="priority">Sort by Priority</option>
            <option value="due">Sort by Due Date</option>
          </select>
        </div>

        {/* Goals Grid */}
        {sortedGoals.length === 0 ? (
          <div className="text-center py-16">
            <Target className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No goals yet</h3>
            <p className="text-gray-600 mb-6">Create your first goal to start building your roadmap</p>
            <button
              onClick={() => setIsCreatingGoal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Goal
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sortedGoals.map((goal) => (
              <div key={goal.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{goal.title}</h3>
                    {goal.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{goal.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 mb-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(goal.status)}`}>
                    {goal.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(goal.priority)}`}>
                    {goal.priority}
                  </span>
                </div>

                {goal.end_datetime && (
                  <div className="flex items-center text-xs text-gray-500 mb-4">
                    <Calendar className="w-3 h-3 mr-1" />
                    <span>Due {new Date(goal.end_datetime).toLocaleDateString()}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{goal.milestones?.length || 0} milestones</span>
                  <button
                    onClick={() => handleGoalDelete(goal.id)}
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Goal Modal */}
        {isCreatingGoal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Create New Goal</h3>
              <GoalForm
                onSuccess={handleGoalSubmit}
                onCancel={() => setIsCreatingGoal(false)}
                onClose={() => setIsCreatingGoal(false)}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default withAuth(GoalsPage);
