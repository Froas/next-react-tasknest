'use client';

import { create } from 'zustand';
import { notesApi } from '@/lib/api';

export interface InboxItem {
 id: string;
 text: string;
 createdAt: string;
}

interface InboxStore {
 items: InboxItem[];
 loading: boolean;
 hydrate: () => Promise<void>;
 add: (text: string) => Promise<void>;
 remove: (id: string) => Promise<void>;
}

const newId = () =>
 typeof crypto !== 'undefined' && 'randomUUID' in crypto
 ? crypto.randomUUID()
 : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const fromNote = (note: { id: string; title: string; created_at: string }): InboxItem => ({
 id: note.id,
 text: note.title,
 createdAt: note.created_at,
});

const readLegacyInbox = (): InboxItem[] => {
 if (typeof window === 'undefined') return [];
 try {
 const value = JSON.parse(window.localStorage.getItem('tasknest:inbox') || 'null');
 return Array.isArray(value?.state?.items) ? value.state.items : [];
 } catch { return []; }
};

// Backend-backed quick notes. The persisted Zustand snapshot is only an
// offline/instant-render cache; Note(source="inbox") is the source of truth.
export const useInbox = create<InboxStore>()(
 (set, get) => ({
 items: readLegacyInbox(),
 loading: false,
 hydrate: async () => {
 set({ loading: true });
 try {
 const notes = (await notesApi.getAll()).filter((note) => note.source === 'inbox');
 const remoteItems = notes.map(fromNote);
 const remoteTexts = new Set(remoteItems.map((item) => item.text));
 const legacyLocal = get().items.filter((item) => !remoteTexts.has(item.text));
 const migrated = await Promise.all(legacyLocal.map((item) => notesApi.create({
 title: item.text,
 kind: 'note',
 source: 'inbox',
 })));
 set({ items: [...migrated.map(fromNote), ...remoteItems], loading: false });
 try { window.localStorage.removeItem('tasknest:inbox'); } catch { /* ignore */ }
 } catch {
 set({ loading: false });
 }
 },
 add: async (text) => {
 const trimmed = text.trim();
 if (!trimmed) return;
 const optimistic: InboxItem = { id: newId(), text: trimmed, createdAt: new Date().toISOString() };
 set((state) => ({ items: [optimistic, ...state.items] }));
 try {
 const created = await notesApi.create({ title: trimmed, kind: 'note', source: 'inbox' });
 set((state) => ({ items: state.items.map((item) => item.id === optimistic.id ? fromNote(created) : item) }));
 } catch (error) {
 set((state) => ({ items: state.items.filter((item) => item.id !== optimistic.id) }));
 throw error;
 }
 },
 remove: async (id) => {
 const previous = get().items;
 set({ items: previous.filter((item) => item.id !== id) });
 try {
 await notesApi.delete(id);
 } catch (error) {
 set({ items: previous });
 throw error;
 }
 },
 })
);
