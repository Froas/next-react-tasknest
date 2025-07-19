'use client';

import { GoalItem, StatusType } from '@/lib/types';
import { formatDate } from '@/lib/utils';

interface GoalCardProps {
  goal: GoalItem;
  onClick: () => void;
  progress: number;
}

export default function GoalCard({ goal, onClick, progress }: GoalCardProps) {
  const getStatusColor = () => 'bg-muted text-foreground';
  const getPriorityColor = () => 'bg-accent text-accent-foreground';

  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-foreground">{goal.title}</h3>
        <div className="flex space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
            {goal.status}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor()}`}>
            {goal.priority}
          </span>
        </div>
      </div>

      {goal.description && (
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{goal.description}</p>
      )}

      <div className="space-y-3">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {goal.end_datetime && (
        <div className="mt-4 text-sm text-muted-foreground">
          Due: {formatDate(goal.end_datetime)}
        </div>
      )}

      <div className="mt-4 flex justify-between items-center text-sm text-muted-foreground">
        <span>{goal.milestones?.length || 0} Milestones</span>
      </div>
    </div>
  );
}
