'use client';

import React from 'react';
import { useStore } from '@/store/useStore';

// Floating indicator that shows when any slice is refreshing in the
// background while the user already has stale data on screen. Sits in the
// corner so it doesn't push layout around.
export const RefreshIndicator: React.FC = () => {
 const isLoading = useStore(
 (s) =>
 s.isLoadingGoals ||
 s.isLoadingMilestones ||
 s.isLoadingTasks ||
 s.isLoadingTodos ||
 s.isLoadingEvents
 );
 const hasAnyData = useStore(
 (s) =>
 s.goals.length > 0 ||
 s.milestones.length > 0 ||
 s.tasks.length > 0 ||
 s.todos.length > 0 ||
 s.events.length > 0
 );

 // Only show when refreshing on top of existing data — initial loads use
 // the per-page skeletons and don't need this floating indicator.
 if (!isLoading || !hasAnyData) return null;

 return (
 <div
 className="fixed top-20 right-4 z-40 bg-card dark:bg-card border border-border dark:border-border rounded-full shadow-lg px-3 py-2 flex items-center space-x-2 text-sm text-foreground dark:text-muted-foreground/60"
 role="status"
 aria-live="polite"
 >
 <div className="animate-spin h-3 w-3 border-2 border-border border-t-transparent rounded-full" />
 <span>Refreshing...</span>
 </div>
 );
};
