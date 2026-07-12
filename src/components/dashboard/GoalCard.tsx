'use client';

import { useMemo, type CSSProperties } from 'react';
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
 const tokenChip = (tone: string): CSSProperties => ({
 background: `color-mix(in srgb, ${tone} 12%, var(--tn-card))`,
 color: tone,
 border: `1px solid color-mix(in srgb, ${tone} 38%, var(--tn-card))`,
 });

 const getStatusStyle = (status: StatusType): CSSProperties => {
 switch (status) {
 case StatusType.OUTSTANDING:
 return tokenChip('var(--tn-fg-muted)');
 case StatusType.IN_PROGRESS:
 return tokenChip('var(--tn-accent)');
 case StatusType.FINISHED:
 return tokenChip('var(--tn-good, #2f7d50)');
 case StatusType.CANCELLED:
 return tokenChip('var(--tn-bad, #c25d63)');
 default:
 return tokenChip('var(--tn-fg-muted)');
 }
 };

 const getPriorityStyle = (priority: string): CSSProperties => {
 switch (priority) {
 case PriorityType.HIGH:
 return tokenChip('var(--tn-bad, #c25d63)');
 case PriorityType.MEDIUM:
 return tokenChip('var(--tn-warn, #c8932a)');
 case PriorityType.LOW:
 return tokenChip('var(--tn-good, #2f7d50)');
 default:
 return tokenChip('var(--tn-fg-muted)');
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
 <span className="px-2 py-1 rounded-full text-xs font-medium" style={getStatusStyle(goal.status)}>
 {goal.status}
 </span>
 <span className="px-2 py-1 rounded-full text-xs font-medium" style={getPriorityStyle(goal.priority)}>
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
 <span>Structural</span>
 <span>{Math.round(progress)}%</span>
 </div>
 <div
 className="rounded-full h-2.5 overflow-hidden"
 style={{ background: 'var(--tn-bar-bg, rgba(0,0,0,.08))', border: 'var(--tn-line)' }}
 >
 <div
 className="h-full rounded-full transition-all duration-300"
 style={{ width: `${progress}%`, background: 'var(--tn-accent)' }}
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
 className="flex items-center space-x-2"
 style={{ color: 'var(--tn-good, #2f7d50)' }}
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
