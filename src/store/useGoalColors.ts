'use client';

import { create } from 'zustand';
import { userPrefsApi } from '@/lib/api';

interface GoalColorsStore {
 // goalId -> Tailwind gradient classes (e.g."from-blue-500 to-purple-600")
 overrides: Record<string, string>;
 setColor: (goalId: string, gradient: string) => void;
 clear: (goalId: string) => void;
 hydrate: (overrides: Record<string, string>) => void;
}

const readLegacyColors = (): Record<string, string> => {
 if (typeof window === 'undefined') return {};
 try {
 const value = JSON.parse(window.localStorage.getItem('tasknest:goal-colors') || 'null');
 return value?.state?.overrides && typeof value.state.overrides === 'object' ? value.state.overrides : {};
 } catch { return {}; }
};

export const useGoalColors = create<GoalColorsStore>()(
 (set) => ({
 overrides: readLegacyColors(),
 setColor: (goalId, gradient) => set((state) => {
 const previous = state.overrides;
 const overrides = { ...previous, [goalId]: gradient };
 void userPrefsApi.updateMe({ goal_color_overrides: overrides }).catch(() => set({ overrides: previous }));
 return { overrides };
 }),
 clear: (goalId) =>
 set((state) => {
 const next = { ...state.overrides };
 delete next[goalId];
 const previous = state.overrides;
 void userPrefsApi.updateMe({ goal_color_overrides: next }).catch(() => set({ overrides: previous }));
 return { overrides: next };
 }),
 hydrate: (overrides) => {
 set({ overrides });
 try { window.localStorage.removeItem('tasknest:goal-colors'); } catch { /* ignore */ }
 },
 })
);
