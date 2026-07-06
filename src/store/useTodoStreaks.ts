'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Local-only completion log for recurring todos. Backend doesn't track
// per-day completions, so we keep a per-todo set of completion dates
// (YYYY-MM-DD) in localStorage and derive a daily streak from it.

interface TodoStreaksStore {
 // todoId -> array of YYYY-MM-DD strings, sorted ascending
 completions: Record<string, string[]>;
 recordCompletion: (todoId: string, date?: Date) => void;
 removeLastCompletion: (todoId: string) => void;
 clear: (todoId: string) => void;
}

const dateKey = (d: Date) => {
 const y = d.getFullYear();
 const m = String(d.getMonth() + 1).padStart(2, '0');
 const day = String(d.getDate()).padStart(2, '0');
 return `${y}-${m}-${day}`;
};

export const useTodoStreaks = create<TodoStreaksStore>()(
 persist(
 (set) => ({
 completions: {},
 recordCompletion: (todoId, date = new Date()) => set((state) => {
 const key = dateKey(date);
 const existing = state.completions[todoId] ?? [];
 if (existing.includes(key)) return state;
 const next = [...existing, key].sort();
 return { completions: { ...state.completions, [todoId]: next } };
 }),
 removeLastCompletion: (todoId) => set((state) => {
 const existing = state.completions[todoId] ?? [];
 if (existing.length === 0) return state;
 const next = existing.slice(0, -1);
 return { completions: { ...state.completions, [todoId]: next } };
 }),
 clear: (todoId) => set((state) => {
 const next = { ...state.completions };
 delete next[todoId];
 return { completions: next };
 }),
 }),
 { name: 'tasknest:todo-streaks' }
 )
);

// Compute a daily streak ending today (or yesterday — grace period of 1 day
// so the user doesn't lose the streak for not opening the app at midnight).
export const getStreak = (completions: string[]): number => {
 if (!completions || completions.length === 0) return 0;
 const set = new Set(completions);
 const today = new Date();
 today.setHours(0, 0, 0, 0);

 // Anchor: today if today's done, else yesterday if yesterday's done.
 const todayKey = dateKey(today);
 const yesterday = new Date(today);
 yesterday.setDate(yesterday.getDate() - 1);
 const yesterdayKey = dateKey(yesterday);

 let cursor: Date;
 if (set.has(todayKey)) cursor = today;
 else if (set.has(yesterdayKey)) cursor = yesterday;
 else return 0;

 let streak = 0;
 while (set.has(dateKey(cursor))) {
 streak += 1;
 cursor.setDate(cursor.getDate() - 1);
 }
 return streak;
};
