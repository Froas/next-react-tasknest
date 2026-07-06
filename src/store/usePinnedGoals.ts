'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PinnedGoalsStore {
 pinned: string[];
 toggle: (goalId: string) => void;
 isPinned: (goalId: string) => boolean;
 clear: () => void;
}

// Local"favourites" /"pinned" set for goals. Stored in localStorage so it
// survives reloads. Order is the insertion order — the most recently pinned
// goal lands at the bottom.
export const usePinnedGoals = create<PinnedGoalsStore>()(
 persist(
 (set, get) => ({
 pinned: [],
 toggle: (goalId) =>
 set((state) =>
 state.pinned.includes(goalId)
 ? { pinned: state.pinned.filter((id) => id !== goalId) }
 : { pinned: [...state.pinned, goalId] }
 ),
 isPinned: (goalId) => get().pinned.includes(goalId),
 clear: () => set({ pinned: [] }),
 }),
 { name: 'tasknest:pinned-goals' }
 )
);
