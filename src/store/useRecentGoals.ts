'use client';

import { create } from 'zustand';
import { userPrefsApi } from '@/lib/api';

interface RecentGoalsStore {
 ids: string[];
 visit: (goalId: string) => void;
 clear: () => void;
 hydrate: (goalIds: string[]) => void;
}

const MAX = 5;

const readLegacyRecent = (): string[] => {
 if (typeof window === 'undefined') return [];
 try {
 const value = JSON.parse(window.localStorage.getItem('tasknest:recent-goals') || 'null');
 return Array.isArray(value?.state?.ids) ? value.state.ids.slice(0, MAX) : [];
 } catch { return []; }
};

// LRU-style"last 5 visited goals" tracker, persisted across sessions.
// Surfaces in command palette and (potentially) header for one-tap return
// to whatever the user was last working on.
export const useRecentGoals = create<RecentGoalsStore>()(
 (set) => ({
 ids: readLegacyRecent(),
 visit: (goalId) => set((state) => {
 const without = state.ids.filter((id) => id !== goalId);
 const ids = [goalId, ...without].slice(0, MAX);
 const previous = state.ids;
 void userPrefsApi.updateMe({ recent_goal_ids: ids }).catch(() => set({ ids: previous }));
 return { ids };
 }),
 clear: () => set((state) => {
 const previous = state.ids;
 void userPrefsApi.updateMe({ recent_goal_ids: [] }).catch(() => set({ ids: previous }));
 return { ids: [] };
 }),
 hydrate: (ids) => {
 set({ ids: ids.slice(0, MAX) });
 try { window.localStorage.removeItem('tasknest:recent-goals'); } catch { /* ignore */ }
 },
 })
);
