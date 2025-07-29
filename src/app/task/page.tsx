'use client';

import React, { useState, useEffect } from 'react';
import { withAuth } from '@/hoc/withAuth';
import { TaskItem as Task, StatusType, PriorityType } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { CheckSquare, Filter, Calendar, Target, Flag } from 'lucide-react';

const TasksPage: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState<StatusType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'title' | 'priority' | 'due'>('title');

  const { 
    goals,
    tasks,
    isLoadingGoals,
    isLoadingTasks,
    fetchGoals,
    fetchTasks
  } = useStore();

  useEffect(() => {
    fetchGoals();
    fetchTasks();
  }, [fetchGoals, fetchTasks]);

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

  // Get all tasks from goals/milestones and also from the tasks store
  const allTasks: (Task & { goalTitle?: string; milestoneTitle?: string })[] = [];
  
  // Add tasks from goals structure
  goals.forEach(goal => {
    goal.milestones?.forEach(milestone => {
      milestone.tasks?.forEach(task => {
        allTasks.push({
          ...task,
          goalTitle: goal.title,
          milestoneTitle: milestone.title
        });
      });
    });
  });

  // Add tasks from direct tasks store (these might not be in goals)
  tasks.forEach(task => {
    // Only add if not already in allTasks
    if (!allTasks.find(t => t.id === task.id)) {
      allTasks.push(task);
    }
  });

  const filteredTasks = allTasks.filter(task => 
    filterStatus === 'all' || task.status === filterStatus
  );

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      case 'due':
        return new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime();
      default:
        return 0;
    }
  });

  if (isLoadingGoals || isLoadingTasks) {
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Tasks</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage all your tasks across goals and milestones</p>
          </div>
        </div>

        {/* Filters and Sort */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as StatusType | 'all')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

        {/* Tasks Grid */}
        {sortedTasks.length === 0 ? (
          <div className="text-center py-16">
            <CheckSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No tasks yet</h3>
            <p className="text-gray-600 mb-6">Create goals and milestones to start adding tasks</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedTasks.map((task) => (
              <div key={task.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{task.title}</h3>
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
                    )}
                  </div>
                </div>

                {/* Parent Goal and Milestone */}
                <div className="space-y-1 mb-3">
                  {task.goalTitle && (
                    <div className="flex items-center text-xs text-blue-600">
                      <Target className="w-3 h-3 mr-1" />
                      <span>{task.goalTitle}</span>
                    </div>
                  )}
                  {task.milestoneTitle && (
                    <div className="flex items-center text-xs text-purple-600">
                      <Flag className="w-3 h-3 mr-1" />
                      <span>{task.milestoneTitle}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 mb-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>

                {task.due_date && (
                  <div className="flex items-center text-xs text-gray-500 mb-4">
                    <Calendar className="w-3 h-3 mr-1" />
                    <span>Due {new Date(task.due_date).toLocaleDateString()}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="space-x-3">
                    <span>{task.subtasks?.length || 0} subtasks</span>
                    <span>{task.todos?.length || 0} todos</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default withAuth(TasksPage);
