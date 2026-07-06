'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface InboxItem {
 id: string;
 text: string;
 createdAt: string;
}

interface InboxStore {
 items: InboxItem[];
 add: (text: string) => void;
 remove: (id: string) => void;
 clear: () => void;
}

const newId = () =>
 typeof crypto !== 'undefined' && 'randomUUID' in crypto
 ? crypto.randomUUID()
 : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Local-only inbox: jot something down without picking goal/milestone/task.
// User can later promote items to real tasks under a goal. Since the backend
// has no inbox concept, this lives entirely in localStorage.
export const useInbox = create<InboxStore>()(
 persist(
 (set) => ({
 items: [],
 add: (text) =>
 set((state) => ({
 items: [{ id: newId(), text: text.trim(), createdAt: new Date().toISOString() }, ...state.items],
 })),
 remove: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
 clear: () => set({ items: [] }),
 }),
 { name: 'tasknest:inbox' }
 )
);
