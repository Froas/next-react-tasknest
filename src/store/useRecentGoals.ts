'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RecentGoalsStore {
 ids: string[];
 visit: (goalId: string) => void;
 clear: () => void;
}

const MAX = 5;

// LRU-style"last 5 visited goals" tracker, persisted across sessions.
// Surfaces in command palette and (potentially) header for one-tap return
// to whatever the user was last working on.
export const useRecentGoals = create<RecentGoalsStore>()(
 persist(
 (set) => ({
 ids: [],
 visit: (goalId) =>
 set((state) => {
 const without = state.ids.filter((id) => id !== goalId);
 return { ids: [goalId, ...without].slice(0, MAX) };
 }),
 clear: () => set({ ids: [] }),
 }),
 { name: 'tasknest:recent-goals' }
 )
);
