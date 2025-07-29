'use client';

import { GoalItem, StatusType } from '@/lib/types';
import { formatDate } from '@/lib/utils';

interface GoalCardProps {
  goal: GoalItem;
  onClick: () => void;
}

export default function GoalCard({ goal, onClick }: GoalCardProps) {
  const getStatusColor = (status: StatusType) => {
    switch (status) {
      case StatusType.OUTSTANDING:
        return 'bg-gray-100 text-gray-800';
      case StatusType.IN_PROGRESS:
        return 'bg-blue-100 text-blue-800';
      case StatusType.FINISHED:
        return 'bg-green-100 text-green-800';
      case StatusType.CANCELLED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateProgress = () => {
    if (!goal.milestones || goal.milestones.length === 0) return 0;
    const completedMilestones = goal.milestones.filter(
      milestone => milestone.status === StatusType.FINISHED
    ).length;
    return (completedMilestones / goal.milestones.length) * 100;
  };

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{goal.title}</h3>
        <div className="flex space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}>
            {goal.status}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(goal.priority)}`}>
            {goal.priority}
          </span>
        </div>
      </div>

      {goal.description && (
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">{goal.description}</p>
      )}

      <div className="space-y-3">
        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>Progress</span>
          <span>{Math.round(calculateProgress())}%</span>
        </div>
        <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
            style={{ width: `${calculateProgress()}%` }}
          />
        </div>
      </div>

      {goal.end_datetime && (
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Due: {formatDate(goal.end_datetime)}
        </div>
      )}

      <div className="mt-4 flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
        <span>{goal.milestones?.length || 0} Milestones</span>
      </div>
    </div>
  );
}
