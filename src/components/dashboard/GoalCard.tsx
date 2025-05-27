import React from 'react';
import { GoalItem as Goal, StatusType } from '@/lib/types';

interface GoalCardProps {
  goal: Goal;
  onSelectGoal: (goalId: string) => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal, onSelectGoal }) => {
  // Calculate progress based on completed milestones
  const milestones = goal.milestones || [];
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter(m => m.status === StatusType.FINISHED).length;
  const progress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  return (
    <div
      className="bg-white rounded-xl shadow-sm p-6 mb-6 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
      onClick={() => onSelectGoal(goal.id)}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-xl font-medium">{goal.title}</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          goal.status === StatusType.FINISHED ? 'bg-gray-100 text-gray-800' :
          goal.status === StatusType.IN_PROGRESS ? 'bg-gray-100 text-gray-800' :
          goal.status === StatusType.CANCELLED ? 'bg-gray-100 text-gray-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {goal.status}
        </span>
      </div>
      
      <p className="text-gray-600 text-sm mb-3">{goal.description}</p>
      
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-700 text-sm">Progress:</span>
        <span className="font-semibold text-gray-800 text-sm">{Math.round(progress)}%</span>
      </div>
      
      <div className="bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-gray-800 h-full rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="mt-3 flex justify-between text-xs text-gray-500">
        <span>Start: {new Date(goal.start_datetime || '').toLocaleDateString()}</span>
        {goal.end_datetime && (
          <span>End: {new Date(goal.end_datetime).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
}; 