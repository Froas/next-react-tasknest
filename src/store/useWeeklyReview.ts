'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from './useToast';
import { useStore } from './useStore';
import { calculateActivityStreak, collectRecentActivity } from '@/lib/recentActivity';

interface WeeklyReviewStore {
 lastShownAt: number | null;
 setShown: () => void;
}

const useWeeklyReviewStore = create<WeeklyReviewStore>()(
 persist(
 (set) => ({
 lastShownAt: null,
 setShown: () => set({ lastShownAt: Date.now() }),
 }),
 { name: 'tasknest:weekly-review' }
 )
);

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Once a week, surface a soft toast pointing the user to a quick review of
// what they finished and what's coming up. Persistence guarantees we don't
// nag — `lastShownAt` is updated when the prompt is dismissed by anything
// (Open / × / timeout). First check waits 30s after mount so it doesn't
// step on initial fetches.
export const useWeeklyReviewPrompt = () => {
 const { lastShownAt, setShown } = useWeeklyReviewStore();

 useEffect(() => {
 const check = () => {
 const goals = useStore.getState().goals;
 if (goals.length === 0) return; // nothing to review yet
 const now = Date.now();
 if (lastShownAt && now - lastShownAt < ONE_WEEK_MS) return;

 const streak = calculateActivityStreak(goals);
 const recent = collectRecentActivity(goals, 100);
 const lastWeekStart = now - ONE_WEEK_MS;
 const finishedThisWeek = recent.filter(
 (r) => new Date(r.finishedAt).getTime() >= lastWeekStart
 ).length;

 const summary =
 finishedThisWeek > 0
 ? `You closed ${finishedThisWeek} item${finishedThisWeek === 1 ? '' : 's'} this week`
 : 'A week passed — time to revisit your roadmap';
 const flameSuffix = streak >= 2 ? ` · ${streak}-day streak 🔥` : '';

 const id = toast.withAction(
 'info',
 `${summary}${flameSuffix}. Take 2 minutes to review?`,
 {
 label: 'Open dashboard',
 run: () => {
 if (typeof window !== 'undefined') window.location.href = '/';
 },
 },
 { ttlMs: 12000, onExpire: () => {} }
 );
 // We mark"shown" regardless of which dismiss path the user picks.
 setShown();
 return id;
 };

 const initial = window.setTimeout(check, 30 * 1000);
 return () => window.clearTimeout(initial);
 }, [lastShownAt, setShown]);
};
