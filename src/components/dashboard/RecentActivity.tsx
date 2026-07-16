'use client';

import React, { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import {
 ActivityItem,
 ActivityKind,
 calculateActivityStreak,
 collectRecentActivity,
 collectRecentRoutineActivity,
} from '@/lib/recentActivity';
import { AuthRequiredError, todoOccurrencesApi } from '@/lib/api';
import { TODAY_DATA_CHANGED_EVENT } from '@/lib/todaySync';
import { CheckCircle2, Flame } from 'lucide-react';

const KIND_TONE: Record<ActivityKind, string> = {
 Goal: 'var(--tn-accent)',
 Milestone: 'var(--tn-plum, #8a6594)',
 Task: 'var(--tn-good, #2f7d50)',
 Subtask: 'var(--tn-slate, #5a6f8c)',
 Todo: 'var(--tn-warn, var(--tn-accent-2, var(--tn-accent)))',
 Routine: 'var(--tn-good, #2f7d50)',
};

const INITIAL_VISIBLE_ITEMS = 5;
const RECENT_ACTIVITY_WINDOW_MS = 12 * 60 * 60 * 1000;

const badgeStyle = (kind: ActivityKind): CSSProperties => {
 const tone = KIND_TONE[kind];
 return {
 background: `color-mix(in srgb, ${tone} 12%, var(--tn-card))`,
 color: tone,
 };
};

const formatRelative = (iso: string): string => {
 const date = new Date(iso);
 const diff = Date.now() - date.getTime();
 const minutes = Math.floor(diff / 60000);
 if (minutes < 1) return 'just now';
 if (minutes < 60) return `${minutes}m ago`;
 const hours = Math.floor(minutes / 60);
 if (hours < 24) return `${hours}h ago`;
 const days = Math.floor(hours / 24);
 if (days < 7) return `${days}d ago`;
 return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const RecentActivity: React.FC = () => {
 const goals = useStore((s) => s.goals);
 const [routineItems, setRoutineItems] = useState<ActivityItem[]>([]);
 const [routineLoading, setRoutineLoading] = useState(true);
 const [showAllItems, setShowAllItems] = useState(false);
 const [now, setNow] = useState(() => Date.now());

 useEffect(() => {
 const timer = window.setInterval(() => setNow(Date.now()), 60_000);
 return () => window.clearInterval(timer);
 }, []);

 useEffect(() => {
 let cancelled = false;
 const loadRoutineActivity = async () => {
 try {
 const rows = await todoOccurrencesApi.history({ statuses: ['done', 'minimum'] });
 if (!cancelled) setRoutineItems(collectRecentRoutineActivity(rows, 8));
 } catch (error) {
 if (!(error instanceof AuthRequiredError)) console.error('Failed to load recent routine activity:', error);
 } finally {
 if (!cancelled) setRoutineLoading(false);
 }
 };

 void loadRoutineActivity();
 window.addEventListener(TODAY_DATA_CHANGED_EVENT, loadRoutineActivity);
 return () => {
 cancelled = true;
 window.removeEventListener(TODAY_DATA_CHANGED_EVENT, loadRoutineActivity);
 };
 }, []);

 const { items, streak } = useMemo(
 () => ({
 items: [...collectRecentActivity(goals, 8), ...routineItems]
 .filter((item) => {
 const age = now - new Date(item.finishedAt).getTime();
 return age >= 0 && age <= RECENT_ACTIVITY_WINDOW_MS;
 })
 .sort((a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime())
 .slice(0, 8),
 streak: calculateActivityStreak(goals),
 }),
 [goals, now, routineItems]
 );

 const visibleItems = showAllItems ? items : items.slice(0, INITIAL_VISIBLE_ITEMS);
 const hiddenItemsCount = items.length - INITIAL_VISIBLE_ITEMS;

 return (
 <div className="card">
 <div className="flex items-center justify-between mb-4">
 <div>
 <h3 className="text-lg font-semibold text-foreground">Recently finished</h3>
 <p className="mt-1 text-sm text-muted-foreground">
 {items.length === 0
 ? 'Nothing finished in the last 12 hours.'
 : 'Wins from the last 12 hours across the tree.'}
 </p>
 </div>
 {streak >= 2 && (
 <div
 className="flex items-center space-x-1 px-3 py-1.5 rounded-full"
 style={badgeStyle('Todo')}
 title={`${streak}-day streak`}
 >
 <Flame className="w-4 h-4" />
 <span className="text-sm font-semibold">{streak} day{streak === 1 ? '' : 's'}</span>
 </div>
 )}
 </div>

 {items.length === 0 ? (
 <div className="py-[9px] text-center text-sm text-muted-foreground dark:text-muted-foreground">
 {routineLoading ? 'Loading activity…' : 'No recent completions.'}
 </div>
 ) : (
 <ul className="space-y-2">
 {visibleItems.map((item) => (
 <li
 key={`${item.kind}-${item.id}`}
 className="flex items-center justify-between px-3 py-2 rounded-lg"
 style={{
 background: 'var(--tn-surface-2, var(--tn-hover))',
 border: 'var(--tn-line)',
 }}
 >
 <div className="flex items-start space-x-3 min-w-0 flex-1">
 <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--tn-good, var(--tn-accent))' }} />
 <div className="min-w-0 flex-1">
 <div className="text-sm font-medium text-foreground truncate">
 {item.title}
 </div>
 {(item.goalTitle || item.milestoneTitle || item.taskTitle) && (
 <div className="text-xs text-muted-foreground dark:text-muted-foreground truncate">
 {[item.goalTitle, item.milestoneTitle, item.taskTitle].filter(Boolean).join(' · ')}
 </div>
 )}
 </div>
 </div>
 <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
 <span className="text-xs px-2 py-0.5 rounded-full" style={badgeStyle(item.kind)}>
 {item.kind}
 </span>
 <span className="text-xs text-muted-foreground dark:text-muted-foreground">
 {formatRelative(item.finishedAt)}
 </span>
 </div>
 </li>
 ))}
 {hiddenItemsCount > 0 && (
 <li>
 <button
 type="button"
 onClick={() => setShowAllItems((current) => !current)}
 className="w-full rounded-lg px-3 py-2 text-sm font-medium"
 style={{
 border: 'var(--tn-line)',
 background: 'transparent',
 color: 'var(--tn-accent)',
 }}
 >
 {showAllItems ? 'Show less' : `Show +${hiddenItemsCount} more`}
 </button>
 </li>
 )}
 </ul>
 )}
 </div>
 );
};
