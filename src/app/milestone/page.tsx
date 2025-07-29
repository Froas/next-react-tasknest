'use client';

import React, { useState, useEffect } from 'react';
import { withAuth } from '@/hoc/withAuth';
import { MilestoneItem as Milestone, StatusType, PriorityType } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { MilestoneForm } from '@/components/dashboard/MilestoneForm';
import { milestonesApi } from '@/lib/api';
import { Plus, Flag, Calendar, Filter, Target } from 'lucide-react';

const MilestonesPage: React.FC = () => {
  const [isCreatingMilestone, setIsCreatingMilestone] = useState(false);
  const [filterStatus, setFilterStatus] = useState<StatusType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'title' | 'priority' | 'due'>('title');

  const { 
    goals,
    milestones, 
    isLoadingMilestones, 
    milestonesError,
    fetchMilestones,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    fetchGoals
  } = useStore();

  useEffect(() => {
    fetchMilestones();
    fetchGoals();
  }, [fetchMilestones, fetchGoals]);

  const handleMilestoneSubmit = async (milestoneData: Partial<Milestone>) => {
    try {
      const newMilestone = await milestonesApi.create({
        title: milestoneData.title!,
        description: milestoneData.description!,
        status: milestoneData.status || StatusType.OUTSTANDING,
        priority: milestoneData.priority || PriorityType.MEDIUM,
        due_date: milestoneData.due_date,
        end_datetime: milestoneData.end_datetime,
        goal_id: milestoneData.goal_id,
      });
      addMilestone(newMilestone);
      setIsCreatingMilestone(false);
    } catch (error) {
      console.error('Error saving milestone:', error);
    }
  };

  const handleMilestoneDelete = async (milestoneId: string) => {
    try {
      await milestonesApi.delete(milestoneId);
      deleteMilestone(milestoneId);
    } catch (error) {
      console.error('Error deleting milestone:', error);
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

  const filteredMilestones = milestones.filter(milestone => 
    filterStatus === 'all' || milestone.status === filterStatus
  );

  const sortedMilestones = [...filteredMilestones].sort((a, b) => {
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

  if (isLoadingMilestones) {
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Milestones</h1>
            <p className="text-gray-600 dark:text-gray-400">Track key progress checkpoints across your goals</p>
          </div>
          
          <button
            onClick={() => setIsCreatingMilestone(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Create Milestone</span>
          </button>
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
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="title">Sort by Title</option>
            <option value="priority">Sort by Priority</option>
            <option value="due">Sort by Due Date</option>
          </select>
        </div>

        {/* Milestones Grid */}
        {sortedMilestones.length === 0 ? (
          <div className="text-center py-16">
            <Flag className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No milestones yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Create your first milestone to track progress</p>
            <button
              onClick={() => setIsCreatingMilestone(true)}
              className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              Create Your First Milestone
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sortedMilestones.map((milestone) => {
              const parentGoal = goals.find(g => g.id === milestone.goal_id);
              return (
                <div key={milestone.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{milestone.title}</h3>
                      {milestone.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{milestone.description}</p>
                      )}
                    </div>
                  </div>

                  {parentGoal && (
                    <div className="flex items-center text-xs text-blue-600 dark:text-blue-400 mb-3">
                      <Target className="w-3 h-3 mr-1" />
                      <span>{parentGoal.title}</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 mb-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(milestone.status)}`}>
                      {milestone.status}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(milestone.priority)}`}>
                      {milestone.priority}
                    </span>
                  </div>

                  {milestone.due_date && (
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-4">
                      <Calendar className="w-3 h-3 mr-1" />
                      <span>Due {new Date(milestone.due_date).toLocaleDateString()}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <span>{milestone.tasks?.length || 0} tasks</span>
                    <button
                      onClick={() => handleMilestoneDelete(milestone.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Milestone Modal */}
        {isCreatingMilestone && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create New Milestone</h3>
              <MilestoneForm
                onSuccess={handleMilestoneSubmit}
                onCancel={() => setIsCreatingMilestone(false)}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default withAuth(MilestonesPage);
