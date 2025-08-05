import React from 'react';
import { GoalItem as Goal, StatusType, PriorityType } from '@/lib/types';
import { useTheme } from '@/context/ThemeContext';

interface GoalHeaderCardProps {
  goal: Goal;
  progress: number;
}

const statusStyles = {
  [StatusType.FINISHED]: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700',
  [StatusType.IN_PROGRESS]: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700',
  [StatusType.OUTSTANDING]: 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700',
};

const priorityStyles = {
  [PriorityType.HIGH]: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700',
  [PriorityType.MEDIUM]: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700',
  [PriorityType.LOW]: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700',
};

const getProgressColor = (progress: number) => {
  if (progress >= 80) return 'from-emerald-500 to-emerald-600';
  if (progress >= 60) return 'from-blue-500 to-blue-600';
  if (progress >= 40) return 'from-amber-500 to-amber-600';
  if (progress >= 20) return 'from-orange-500 to-orange-600';
  return 'from-red-500 to-red-600';
};

const GoalHeaderCard: React.FC<GoalHeaderCardProps> = ({ goal, progress }) => {
  const { theme } = useTheme();
  
  return (
    <div className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-white dark:bg-gray-800"></div>
      
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-gray-100/20 dark:from-gray-700/20 to-transparent rounded-full -translate-y-32 translate-x-32"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-gray-100/20 dark:from-gray-700/20 to-transparent rounded-full translate-y-24 -translate-x-24"></div>
      
      <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-gray-200 dark:border-gray-700">
        {/* Header section */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3 leading-tight">
            {goal.title}
          </h1>
          {goal.description && (
            <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed max-w-4xl">
              {goal.description}
            </p>
          )}
        </div>

        {/* Progress section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-700 dark:text-gray-300 font-medium">Overall Progress</span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(progress)}%</span>
          </div>
          
          {/* Progress bar */}
          <div className="relative">
            <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className={`bg-gradient-to-r ${getProgressColor(progress)} h-full rounded-full transition-all duration-700 ease-out relative`}
                style={{ width: `${progress}%` }}
              >
                {/* Animated shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent animate-pulse"></div>
              </div>
            </div>
            
            {/* Progress milestones */}
            <div className="flex justify-between mt-2 text-xs text-gray-900 dark:text-gray-300">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

      {/* Status badges and dates */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Status badge */}
        <div
          className={`px-4 py-2 rounded-full text-sm font-medium border ${
            // Use a runtime check to ensure the status is valid, fallback to default if not
            statusStyles.hasOwnProperty(goal.status)
              ? statusStyles[goal.status as keyof typeof statusStyles]
              : 'bg-gray-100 text-gray-800 border-gray-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-current"></div>
            <span>{goal.status}</span>
          </div>
        </div>

        {/* Priority badge */}
        <div className={`px-4 py-2 rounded-full text-sm font-medium border ${priorityStyles[goal.priority as PriorityType] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600'}`}>
          <div className="flex items-center space-x-2">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{goal.priority}</span>
          </div>
        </div>

        {/* Date badges */}
        {goal.start_datetime && (
          <div className="bg-blue-50 dark:bg-blue-900 px-4 py-2 rounded-full text-sm text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Started: {new Date(goal.start_datetime).toLocaleDateString()}</span>
            </div>
          </div>
        )}

        {goal.end_datetime && (
          <div className="bg-purple-50 dark:bg-purple-900 px-4 py-2 rounded-full text-sm text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-700">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Due: {new Date(goal.end_datetime).toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </div>

        {/* Statistics row */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {goal.milestones?.length || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Milestones</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                {goal.milestones?.filter(m => m.status === StatusType.FINISHED).length || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                {goal.milestones?.filter(m => m.status === StatusType.IN_PROGRESS).length || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mb-1">
                {goal.milestones?.filter(m => m.status === StatusType.OUTSTANDING).length || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalHeaderCard;
