'use client';

import { create } from 'zustand';
import { todoOccurrencesApi } from '@/lib/api';

interface TodoStreaksStore {
 completions: Record<string, string[]>;
 loading: boolean;
 hydrated: boolean;
 hydrate: (force?: boolean) => Promise<void>;
 clear: () => void;
}

let hydration: Promise<void> | null = null;

// TodoOccurrence is the only source of truth. This store is only an
// in-memory projection for cards and heatmaps and is never persisted.
export const useTodoStreaks = create<TodoStreaksStore>()((set, get) => ({
 completions: {},
 loading: false,
 hydrated: false,
 hydrate: async (force = false) => {
 if (get().hydrated && !force) return;
 if (hydration && !force) return hydration;
 set({ loading: true });
 hydration = (async () => {
 try {
 const occurrences = await todoOccurrencesApi.history({
 startDate: '1970-01-01',
 statuses: ['done', 'minimum'],
 });
 const completions: Record<string, string[]> = {};
 for (const occurrence of occurrences) {
 const dates = completions[occurrence.todo_id] ?? [];
 if (!dates.includes(occurrence.date)) dates.push(occurrence.date);
 completions[occurrence.todo_id] = dates;
 }
 Object.values(completions).forEach((dates) => dates.sort());
 set({ completions, loading: false, hydrated: true });
 try { window.localStorage.removeItem('tasknest:todo-streaks'); } catch { /* ignore */ }
 } catch (error) {
 set({ loading: false });
 throw error;
 } finally {
 hydration = null;
 }
 })();
 return hydration;
 },
 clear: () => set({ completions: {}, hydrated: false }),
}));

const dateKey = (d: Date) => {
 const y = d.getFullYear();
 const m = String(d.getMonth() + 1).padStart(2, '0');
 const day = String(d.getDate()).padStart(2, '0');
 return `${y}-${m}-${day}`;
};

export const getStreak = (completions: string[]): number => {
 if (!completions || completions.length === 0) return 0;
 const dates = new Set(completions);
 const today = new Date();
 today.setHours(0, 0, 0, 0);
 const yesterday = new Date(today);
 yesterday.setDate(yesterday.getDate() - 1);
 let cursor: Date;
 if (dates.has(dateKey(today))) cursor = today;
 else if (dates.has(dateKey(yesterday))) cursor = yesterday;
 else return 0;
 let streak = 0;
 while (dates.has(dateKey(cursor))) {
 streak += 1;
 cursor.setDate(cursor.getDate() - 1);
 }
 return streak;
};
