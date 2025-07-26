'use client';

import React, { useState, useEffect } from 'react';
import { withAuth } from '@/hoc/withAuth';
import { TodoItem, StatusType, PriorityType } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { CheckSquare, Filter, Calendar, Target, Flag, Check } from 'lucide-react';

const TodosPage: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState<StatusType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'title' | 'priority' | 'due'>('title');

  const { 
    goals,
    isLoadingGoals,
    fetchGoals
  } = useStore();

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

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

  // Get all todos from all goals/milestones/tasks
  const allTodos: (TodoItem & { goalTitle?: string; milestoneTitle?: string; taskTitle?: string })[] = [];
  goals.forEach(goal => {
    goal.milestones?.forEach(milestone => {
      milestone.tasks?.forEach(task => {
        task.todos?.forEach(todo => {
          allTodos.push({
            ...todo,
            goalTitle: goal.title,
            milestoneTitle: milestone.title,
            taskTitle: task.title
          });
        });
      });
    });
  });

  const filteredTodos = allTodos.filter(todo => 
    filterStatus === 'all' || todo.status === filterStatus
  );

  const sortedTodos = [...filteredTodos].sort((a, b) => {
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

  if (isLoadingGoals) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Todos</h1>
            <p className="text-gray-600">Manage all your todos across tasks and milestones</p>
          </div>
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

        {/* Todos Grid */}
        {sortedTodos.length === 0 ? (
          <div className="text-center py-16">
            <Check className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No todos yet</h3>
            <p className="text-gray-600 mb-6">Create goals, milestones, and tasks to start adding todos</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedTodos.map((todo) => (
              <div key={todo.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{todo.title}</h3>
                    {todo.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{todo.description}</p>
                    )}
                  </div>
                </div>

                {/* Parent Goal, Milestone, and Task */}
                <div className="space-y-1 mb-3">
                  {todo.goalTitle && (
                    <div className="flex items-center text-xs text-blue-600">
                      <Target className="w-3 h-3 mr-1" />
                      <span>{todo.goalTitle}</span>
                    </div>
                  )}
                  {todo.milestoneTitle && (
                    <div className="flex items-center text-xs text-purple-600">
                      <Flag className="w-3 h-3 mr-1" />
                      <span>{todo.milestoneTitle}</span>
                    </div>
                  )}
                  {todo.taskTitle && (
                    <div className="flex items-center text-xs text-green-600">
                      <CheckSquare className="w-3 h-3 mr-1" />
                      <span>{todo.taskTitle}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 mb-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(todo.status)}`}>
                    {todo.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(todo.priority)}`}>
                    {todo.priority}
                  </span>
                </div>

                {todo.due_date && (
                  <div className="flex items-center text-xs text-gray-500 mb-4">
                    <Calendar className="w-3 h-3 mr-1" />
                    <span>Due {new Date(todo.due_date).toLocaleDateString()}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="space-x-3">
                    <span className={todo.status === StatusType.FINISHED ? 'text-green-600 font-medium' : ''}>
                      {todo.status === StatusType.FINISHED ? 'Completed' : 'Pending'}
                    </span>
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

export default withAuth(TodosPage);
