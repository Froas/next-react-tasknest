import React from 'react';
import { MilestoneItem as Milestone, StatusType } from '@/lib/types';
import MilestoneCard from './MilestoneCard';
import { useTheme } from '@/context/ThemeContext';

interface MilestonesTimelineProps {
  milestones: Milestone[];
  goalId: string;
  onUpdate: (milestoneId: string, data: Partial<Milestone>) => void;
  onDelete: (milestoneId: string) => void;
  onAddTask: (milestoneId: string) => void;
}

const statusColor = (status: StatusType) => {
  switch (status) {
    case StatusType.FINISHED:
      return 'bg-emerald-500 border-emerald-500 shadow-emerald-500/30';
    case StatusType.IN_PROGRESS:
      return 'bg-blue-500 border-blue-500 shadow-blue-500/30';
    default:
      return 'bg-slate-400 border-slate-400 shadow-slate-400/30';
  }
};

const MilestonesTimeline: React.FC<MilestonesTimelineProps> = ({
  milestones,
  goalId,
  onUpdate,
  onDelete,
  onAddTask,
}) => {
  const { theme } = useTheme();

  if (!milestones || milestones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 bg-gradient-to-br from-gray-100 dark:from-gray-700 to-gray-200 dark:to-gray-800 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Milestones Yet</h3>
        <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
          Start breaking down your goal into manageable milestones to track your progress effectively.
        </p>
      </div>
    );
  }

  return (
    <div className="relative py-8">
      {/* Section Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Milestones</h2>
        <p className="text-gray-600 dark:text-gray-400">Track your progress through each milestone</p>
      </div>

      {/* Timeline Container */}
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 dark:from-gray-600 via-gray-300 dark:via-gray-500 to-gray-200 dark:to-gray-600" />
        
        {/* Milestones */}
        <div className="space-y-8">
          {milestones.map((milestone, idx) => (
            <div key={milestone.id} className="relative flex items-start group">
              {/* Timeline marker */}
              <div className="relative z-10 flex-shrink-0">
                <div className="flex items-center justify-center">
                  <div
                    className={`w-6 h-6 rounded-full border-4 ${statusColor(milestone.status)} 
                      shadow-lg transition-all duration-300 group-hover:scale-110`}
                  />
                </div>
                
                {/* Connecting line to card */}
                <div className="absolute top-3 left-6 w-8 h-0.5 bg-gray-200 dark:bg-gray-600 group-hover:bg-gray-300 dark:group-hover:bg-gray-500 transition-colors duration-300" />
              </div>

              {/* Milestone card */}
              <div className="flex-1 ml-6 transform transition-all duration-300 group-hover:translate-x-1">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <MilestoneCard
                    milestone={milestone}
                    goalId={goalId}
                    onUpdate={(data) => onUpdate(milestone.id, data)}
                    onDelete={() => onDelete(milestone.id)}
                    onAddTask={() => onAddTask(milestone.id)}
                  />
                </div>
              </div>

              {/* Milestone number badge */}
              <div className="absolute -left-2 -top-2 w-6 h-6 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                {idx + 1}
              </div>
            </div>
          ))}
        </div>

        {/* Progress indicator at the bottom */}
        <div className="mt-8 flex items-center justify-center">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-full px-4 py-2 flex items-center space-x-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {milestones.filter(m => m.status === StatusType.FINISHED).length} of {milestones.length} completed
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MilestonesTimeline;
