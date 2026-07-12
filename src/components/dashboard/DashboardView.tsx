'use client';

import React from 'react';
import { GoalItem as Goal, StatusType } from '@/lib/types';
import GoalCard from './GoalCard';
import { useStore } from '@/store/useStore';
import { CalendarWidget } from './CalendarWidget';
import { TodayWidget } from './TodayWidget';
import { RecentActivity } from './RecentActivity';
import { InboxWidget } from './InboxWidget';
import { GoalTemplatePicker } from './GoalTemplatePicker';
import { ActivityHeatmap } from './ActivityHeatmap';
import { priorityWeight } from '@/lib/sort';
import { GoalListSkeleton } from '@/components/ui/Skeletons';
import { usePinnedGoals } from '@/store/usePinnedGoals';
import { Sparkles, Pin } from 'lucide-react';

interface DashboardViewProps {
 onSelectGoal: (goalId: string) => void;
 onGoalUpdate: (updatedGoals: Goal[]) => void;
 onCreateGoal: () => void;
 orderBy: 'title' | 'start_desc' | 'start_asc' | 'priority_desc' | 'priority_asc';
 setOrderBy: React.Dispatch<React.SetStateAction<'title' | 'start_desc' | 'start_asc' | 'priority_desc' | 'priority_asc'>>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
 onSelectGoal,
 onGoalUpdate,
 onCreateGoal,
 orderBy,
 setOrderBy,
}) => {
 const [isPickingTemplate, setIsPickingTemplate] = React.useState(false);
 const goals = useStore((s) => s.goals);
 const isLoadingGoals = useStore((s) => s.isLoadingGoals);
 const goalsError = useStore((s) => s.goalsError);
 const fetchGoals = useStore((s) => s.fetchGoals);
 const pinnedIds = usePinnedGoals((s) => s.pinned);
 const togglePin = usePinnedGoals((s) => s.toggle);

 const totalGoals = goals.length;
 const completedGoals = goals.filter((g: Goal) => g.status === StatusType.FINISHED).length;
 const overallProgress = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

 // Get active goals (not completed or cancelled)

 const activeGoals = goals.filter(
 (goal: Goal) => goal.status !== StatusType.FINISHED && goal.status !== StatusType.CANCELLED
 );

 // Sort active goals based on orderBy
 const sortedActiveGoals = [...activeGoals].sort((a, b) => {
 if (orderBy === 'title') {
 return (a.title || '').localeCompare(b.title || '');
 }
 if (orderBy === 'start_desc') {
 return new Date(b.start_datetime || 0).getTime() - new Date(a.start_datetime || 0).getTime();
 }
 if (orderBy === 'start_asc') {
 return new Date(a.start_datetime || 0).getTime() - new Date(b.start_datetime || 0).getTime();
 }
 if (orderBy === 'priority_desc') {
 return priorityWeight(b.priority) - priorityWeight(a.priority);
 }
 if (orderBy === 'priority_asc') {
 return priorityWeight(a.priority) - priorityWeight(b.priority);
 }
 return 0;
 });

 if (isLoadingGoals && goals.length === 0) {
 return <GoalListSkeleton count={3} />;
 }

 if (goalsError) {
 return (
 <div className="bg-red-50 text-red-800 p-4 rounded-lg">
 <p className="font-medium">Error loading goals</p>
 <p className="text-sm mt-1">{goalsError}</p>
 <button
 onClick={() => fetchGoals({ force: true })}
 className="mt-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
 >
 Try Again
 </button>
 </div>
 );
 }

 return (
 <div>
 <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
 <h2 className="text-xl font-semibold text-foreground">Dashboard Overview</h2>
 <div className="flex flex-wrap items-center gap-2">
 <button
 onClick={() => setIsPickingTemplate(true)}
 className="btn btn-secondary"
 >
 <Sparkles className="w-4 h-4" />
 <span>Templates</span>
 </button>
 <button
 onClick={onCreateGoal}
 className="btn btn-primary"
 >
 Create New Goal
 </button>
 </div>
 </div>

 <GoalTemplatePicker open={isPickingTemplate} onClose={() => setIsPickingTemplate(false)} />

 <TodayWidget />
 <div className="mb-6">
 <ActivityHeatmap weeks={53} />
 </div>
 <InboxWidget />
 <RecentActivity />

 <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-6">
 {/* Overall Progress Card */}
 <div className="card">
 <h3 className="text-lg font-medium text-foreground mb-3">Overall Goal Progress</h3>
 <div className="flex items-center justify-between mb-2">
 <span className="text-foreground dark:text-muted-foreground/60">Total Goals Completed:</span>
 <span className="font-semibold text-foreground">
 {completedGoals} / {totalGoals}
 </span>
 </div>
 <div
 className="rounded-full h-2.5 overflow-hidden"
 style={{ background: 'var(--tn-bar-bg, rgba(0,0,0,.08))', border: 'var(--tn-line)' }}
 >
 <div
 className="h-full rounded-full transition-all duration-300 ease-in-out"
 style={{ width: `${overallProgress}%`, background: 'var(--tn-accent)' }}
 ></div>
 </div>
 </div>
 
 {/* Calendar Widget */}
 </div>

 {/* Goals List */}
 <div className="space-y-6">
 <div className="flex items-center justify-between mb-2">
 <h3 className="text-xl font-semibold text-foreground">Active Goals</h3>
 <div>
 <label htmlFor="order-goals" className="mr-2 text-sm text-foreground dark:text-muted-foreground/60">Order by:</label>
 <select
 id="order-goals"
 value={orderBy}
 onChange={e => setOrderBy(e.target.value as any)}
 className="px-2 py-1 rounded border border-border dark:border-border bg-card dark:bg-card text-foreground text-sm"
 >
 <option value="title">Title (A-Z)</option>
 <option value="start_desc">Start Date (Newest)</option>
 <option value="start_asc">Start Date (Oldest)</option>
 <option value="priority_desc">Priority (High-Low)</option>
 <option value="priority_asc">Priority (Low-High)</option>
 </select>
 </div>
 </div>
 {sortedActiveGoals.length > 0 ? (
 (() => {
 const pinnedSet = new Set(pinnedIds);
 const pinned = sortedActiveGoals.filter((g) => pinnedSet.has(g.id));
 const others = sortedActiveGoals.filter((g) => !pinnedSet.has(g.id));
 return (
 <>
 {pinned.length > 0 && (
 <>
 <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
 <Pin className="w-3 h-3" />
 <span>Pinned</span>
 </div>
 {pinned.map((goal: Goal) => (
 <PinnableGoalRow
 key={goal.id}
 goal={goal}
 pinned
 onClick={() => onSelectGoal(goal.id)}
 onTogglePin={() => togglePin(goal.id)}
 />
 ))}
 {others.length > 0 && (
 <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground pt-3">
 <span>All</span>
 </div>
 )}
 </>
 )}
 {others.map((goal: Goal) => (
 <PinnableGoalRow
 key={goal.id}
 goal={goal}
 pinned={false}
 onClick={() => onSelectGoal(goal.id)}
 onTogglePin={() => togglePin(goal.id)}
 />
 ))}
 </>
 );
 })()
 ) : (
 <div className="text-center py-8 bg-card dark:bg-card rounded-xl shadow-sm">
 <p className="text-muted-foreground dark:text-muted-foreground">No active goals. Create a new goal to get started!</p>
 </div>
 )}
 </div>
 </div>
 );
};

const PinnableGoalRow: React.FC<{
 goal: Goal;
 pinned: boolean;
 onClick: () => void;
 onTogglePin: () => void;
}> = ({ goal, pinned, onClick, onTogglePin }) => (
 <div className="relative group">
 <button
 onClick={(e) => {
 e.stopPropagation();
 onTogglePin();
 }}
 title={pinned ? 'Unpin' : 'Pin to top'}
 aria-label={pinned ? 'Unpin goal' : 'Pin goal'}
 className={`absolute top-3 right-3 z-10 p-1.5 rounded-lg transition-opacity ${
 pinned
 ? 'opacity-100'
 : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground dark:hover:text-muted-foreground/60 hover:bg-muted dark:hover:bg-card'
 }`}
 style={pinned ? { color: 'var(--tn-accent)', background: 'color-mix(in srgb, var(--tn-accent) 10%, transparent)' } : undefined}
 >
 <Pin className={`w-4 h-4 ${pinned ? 'fill-current' : ''}`} />
 </button>
 <GoalCard goal={goal} onClick={onClick} />
 </div>
);
