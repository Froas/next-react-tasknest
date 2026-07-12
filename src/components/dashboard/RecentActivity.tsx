'use client';

import React, { type CSSProperties, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { collectRecentActivity, calculateActivityStreak, ActivityKind } from '@/lib/recentActivity';
import { CheckCircle2, Flame } from 'lucide-react';

const KIND_TONE: Record<ActivityKind, string> = {
 Goal: 'var(--tn-accent)',
 Milestone: 'var(--tn-plum, #8a6594)',
 Task: 'var(--tn-good, #2f7d50)',
 Subtask: 'var(--tn-slate, #5a6f8c)',
 Todo: 'var(--tn-warn, var(--tn-accent-2, var(--tn-accent)))',
};

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

 const { items, streak } = useMemo(
 () => ({
 items: collectRecentActivity(goals, 8),
 streak: calculateActivityStreak(goals),
 }),
 [goals]
 );

 return (
 <div className="card mb-6">
 <div className="flex items-center justify-between mb-4">
 <div>
 <h3 className="text-lg font-semibold text-foreground">Recently finished</h3>
 <p className="text-sm text-foreground dark:text-muted-foreground">
 {items.length === 0
 ? 'Mark something done to see it here.'
 : 'Your most recent wins across the tree.'}
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
 <div className="text-sm text-muted-foreground dark:text-muted-foreground text-center py-6">
 No completions yet.
 </div>
 ) : (
 <ul className="space-y-2">
 {items.map((item) => (
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
 </ul>
 )}
 </div>
 );
};
