'use client';

import { create } from 'zustand';
import { userPrefsApi } from '@/lib/api';

interface PinnedGoalsStore {
 pinned: string[];
 toggle: (goalId: string) => void;
 promote: (goalId: string) => void;
 isPinned: (goalId: string) => boolean;
 clear: () => void;
 hydrate: (goalIds: string[]) => void;
}

const readLegacyPinned = (): string[] => {
 if (typeof window === 'undefined') return [];
 try {
 const value = JSON.parse(window.localStorage.getItem('tasknest:pinned-goals') || 'null');
 return Array.isArray(value?.state?.pinned) ? value.state.pinned : [];
 } catch { return []; }
};

export const usePinnedGoals = create<PinnedGoalsStore>()(
 (set, get) => ({
 pinned: readLegacyPinned(),
 toggle: (goalId) => set((state) => {
 const previous = state.pinned;
 const pinned = previous.includes(goalId)
 ? previous.filter((id) => id !== goalId)
 : [...previous, goalId];
 void userPrefsApi.updateMe({ pinned_goal_ids: pinned }).catch(() => set({ pinned: previous }));
 return { pinned };
 }),
 promote: (goalId) => set((state) => {
 const previous = state.pinned;
 const pinned = [...previous.filter((id) => id !== goalId), goalId];
 if (pinned.length === previous.length && pinned.every((id, index) => id === previous[index])) {
 return state;
 }
 void userPrefsApi.updateMe({ pinned_goal_ids: pinned }).catch(() => set({ pinned: previous }));
 return { pinned };
 }),
 isPinned: (goalId) => get().pinned.includes(goalId),
 clear: () => set((state) => {
 const previous = state.pinned;
 void userPrefsApi.updateMe({ pinned_goal_ids: [] }).catch(() => set({ pinned: previous }));
 return { pinned: [] };
 }),
 hydrate: (pinned) => {
 set({ pinned });
 try { window.localStorage.removeItem('tasknest:pinned-goals'); } catch { /* ignore */ }
 },
 })
);
