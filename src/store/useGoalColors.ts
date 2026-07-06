'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GoalColorsStore {
 // goalId -> Tailwind gradient classes (e.g."from-blue-500 to-purple-600")
 overrides: Record<string, string>;
 setColor: (goalId: string, gradient: string) => void;
 clear: (goalId: string) => void;
}

// Per-goal manual override of the auto-derived gradient. Persisted locally
// so it survives reloads without needing a backend column for it.
export const useGoalColors = create<GoalColorsStore>()(
 persist(
 (set) => ({
 overrides: {},
 setColor: (goalId, gradient) =>
 set((state) => ({ overrides: { ...state.overrides, [goalId]: gradient } })),
 clear: (goalId) =>
 set((state) => {
 const next = { ...state.overrides };
 delete next[goalId];
 return { overrides: next };
 }),
 }),
 { name: 'tasknest:goal-colors' }
 )
);
