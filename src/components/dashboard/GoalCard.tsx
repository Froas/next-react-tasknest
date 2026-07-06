'use client';

import { useMemo } from 'react';
import { GoalItem, PriorityType, StatusType } from '@/lib/types';
import { formatDate, stripMarkdown } from '@/lib/utils';
import { calculateGoalProgress } from '@/lib/progress';
import { goalCompletionSeries } from '@/lib/recentActivity';
import { useGoalGradientClass } from '@/lib/goalCover';
import { Sparkline } from './Sparkline';

interface GoalCardProps {
 goal: GoalItem;
 onClick: () => void;
}

export default function GoalCard({ goal, onClick }: GoalCardProps) {
 const getStatusColor = (status: StatusType) => {
 switch (status) {
 case StatusType.OUTSTANDING:
 return 'bg-muted text-foreground';
 case StatusType.IN_PROGRESS:
 return 'bg-blue-100 text-blue-800';
 case StatusType.FINISHED:
 return 'bg-green-100 text-green-800';
 case StatusType.CANCELLED:
 return 'bg-red-100 text-red-800';
 default:
 return 'bg-muted text-foreground';
 }
 };

 const getPriorityColor = (priority: string) => {
 switch (priority) {
 case PriorityType.HIGH:
 return 'bg-red-100 text-red-800';
 case PriorityType.MEDIUM:
 return 'bg-yellow-100 text-yellow-800';
 case PriorityType.LOW:
 return 'bg-green-100 text-green-800';
 default:
 return 'bg-muted text-foreground';
 }
 };

 // Memoise heavy aggregations — they walk the entire goal tree on each render.
 const progress = useMemo(() => calculateGoalProgress(goal), [goal]);
 const series = useMemo(() => goalCompletionSeries(goal, 30), [goal]);
 const totalCompletions = useMemo(() => series.reduce((a, b) => a + b, 0), [series]);
 const gradient = useGoalGradientClass(goal.id);

 return (
 <div
 onClick={onClick}
 className="card cursor-pointer transition-shadow overflow-hidden"
 >
 <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />
 <div className="p-6">
 <div className="flex justify-between items-start mb-4">
 <h3 className="text-lg font-semibold text-foreground">{goal.title}</h3>
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
 <p className="text-foreground dark:text-muted-foreground text-sm mb-4 line-clamp-2">
 {stripMarkdown(goal.description)}
 </p>
 )}

 <div className="space-y-3">
 <div className="flex justify-between text-sm text-muted-foreground dark:text-muted-foreground">
 <span>Progress</span>
 <span>{Math.round(progress)}%</span>
 </div>
 <div className="bg-muted dark:bg-card rounded-full h-2">
 <div
 className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
 style={{ width: `${progress}%` }}
 />
 </div>
 </div>

 {goal.end_datetime && (
 <div className="mt-4 text-sm text-muted-foreground dark:text-muted-foreground">
 Due: {formatDate(goal.end_datetime)}
 </div>
 )}

 <div className="mt-4 flex justify-between items-center text-sm text-muted-foreground dark:text-muted-foreground">
 <span>{goal.milestones?.length || 0} Milestones</span>
 {totalCompletions > 0 && (
 <div
 className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400"
 title={`${totalCompletions} completion${totalCompletions === 1 ? '' : 's'} in the last 30 days`}
 >
 <Sparkline values={series} width={80} height={20} />
 <span className="text-xs font-medium">{totalCompletions}</span>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
