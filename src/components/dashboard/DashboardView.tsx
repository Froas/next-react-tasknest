'use client';

import React from 'react';
import { GoalItem as Goal, StatusType } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { TodayWidget } from './TodayWidget';
import { RecentActivity } from './RecentActivity';
import { InboxWidget } from './InboxWidget';
import { GoalTemplatePicker } from './GoalTemplatePicker';
import { ActivityHeatmap } from './ActivityHeatmap';
import { GoalListSkeleton } from '@/components/ui/Skeletons';
import { LayoutTemplate } from 'lucide-react';
import { DashboardWidgetId, DashboardWidgetPlacement } from '@/lib/dashboardPreferences';

interface DashboardViewProps {
 onCreateGoal: () => void;
 widgets: DashboardWidgetPlacement[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
 onCreateGoal,
 widgets,
}) => {
 const [isPickingTemplate, setIsPickingTemplate] = React.useState(false);
 const goals = useStore((s) => s.goals);
 const isLoadingGoals = useStore((s) => s.isLoadingGoals);
 const goalsError = useStore((s) => s.goalsError);
 const fetchGoals = useStore((s) => s.fetchGoals);
 const totalGoals = goals.length;
 const completedGoals = goals.filter((g: Goal) => g.status === StatusType.FINISHED).length;
 const overallProgress = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;
 const visibleWidgetIds = new Set(widgets.map((widget) => widget.id));
 const widgetOrder = new Map(widgets.map((widget, index) => [widget.id, index]));
 const widgetSizes = new Map(widgets.map((widget) => [widget.id, widget.size]));
 const widgetStyle = (id: DashboardWidgetId) => ({ order: widgetOrder.get(id) ?? 999 });
 const widgetClass = (id: DashboardWidgetId) => (
 widgetSizes.get(id) === 'compact' ? 'min-w-0 2xl:col-span-1' : 'min-w-0 2xl:col-span-2'
 );

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
 <div className="page-head page-head-row">
 <div>
 <div className="page-eyebrow">Workspace</div>
 <h1 className="page-title">Dashboard Overview</h1>
 </div>
 <div className="page-head-actions">
 <button
 onClick={() => setIsPickingTemplate(true)}
 className="btn btn-secondary"
 >
 <LayoutTemplate className="w-4 h-4" />
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

 <div className="grid grid-flow-row-dense grid-cols-1 items-start gap-6 2xl:grid-cols-2">
 {visibleWidgetIds.has('today') && <div className={widgetClass('today')} style={widgetStyle('today')}><TodayWidget /></div>}
 {visibleWidgetIds.has('activity') && (
 <div className={widgetClass('activity')} style={widgetStyle('activity')}>
 <ActivityHeatmap weeks={widgetSizes.get('activity') === 'compact' ? 20 : 53} compact={widgetSizes.get('activity') === 'compact'} />
 </div>
 )}
 {visibleWidgetIds.has('inbox') && <div className={widgetClass('inbox')} style={widgetStyle('inbox')}><InboxWidget /></div>}
 {visibleWidgetIds.has('recently-finished') && <div className={widgetClass('recently-finished')} style={widgetStyle('recently-finished')}><RecentActivity /></div>}

 {visibleWidgetIds.has('overall-progress') && (
 <div className={`${widgetClass('overall-progress')} grid grid-cols-1 gap-6`} style={widgetStyle('overall-progress')}>
 <div className="card">
 <h3 className="text-lg font-semibold text-foreground">Overall progress</h3>
 <p className="mb-4 mt-1 text-sm text-muted-foreground">Completed goals across your workspace.</p>
 <div className="mb-2 flex items-center justify-between text-sm">
 <span className="text-muted-foreground">Goals completed</span>
 <span className="font-semibold text-foreground">{completedGoals} / {totalGoals}</span>
 </div>
 <div
 className="rounded-full h-2.5 overflow-hidden"
 style={{ background: 'var(--tn-bar-bg, rgba(0,0,0,.08))', border: 'var(--tn-line)' }}
 >
 <div
 className="h-full rounded-full transition-all duration-300 ease-in-out"
 style={{ width: `${overallProgress}%`, background: 'var(--tn-accent)' }}
 />
 </div>
 </div>
 </div>
 )}

 </div>
 </div>
 );
};
