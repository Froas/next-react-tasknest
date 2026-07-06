'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useStore } from './useStore';
import { StatusType } from '@/lib/types';
import { buildCalendarItems } from '@/lib/calendarItems';

interface NotificationsStore {
 enabled: boolean;
 notifiedIds: string[];
 enable: () => Promise<boolean>;
 disable: () => void;
 markNotified: (id: string) => void;
}

export const useNotifications = create<NotificationsStore>()(
 persist(
 (set) => ({
 enabled: false,
 notifiedIds: [],
 enable: async () => {
 if (typeof window === 'undefined' || !('Notification' in window)) return false;
 if (Notification.permission === 'granted') {
 set({ enabled: true });
 return true;
 }
 const result = await Notification.requestPermission();
 const granted = result === 'granted';
 set({ enabled: granted });
 return granted;
 },
 disable: () => set({ enabled: false }),
 markNotified: (id) =>
 set((state) =>
 state.notifiedIds.includes(id)
 ? state
 : { notifiedIds: [...state.notifiedIds.slice(-99), id] }
 ),
 }),
 { name: 'tasknest:notifications' }
 )
);

const startOfDay = (d: Date) => {
 const x = new Date(d);
 x.setHours(0, 0, 0, 0);
 return x;
};

const todayKey = (d: Date) => {
 const day = startOfDay(d);
 const y = day.getFullYear();
 const m = String(day.getMonth() + 1).padStart(2, '0');
 const dd = String(day.getDate()).padStart(2, '0');
 return `${y}-${m}-${dd}`;
};

// Mounts a watcher that scans for items overdue or due-today on a 5-minute
// interval, and surfaces a native browser notification for each one we
// haven't notified about *today* yet. Quiet no-op until the user opts in.
export const useNotificationWatcher = () => {
 const enabled = useNotifications((s) => s.enabled);
 const notifiedIds = useNotifications((s) => s.notifiedIds);
 const markNotified = useNotifications((s) => s.markNotified);

 useEffect(() => {
 if (!enabled) return;
 if (typeof window === 'undefined' || !('Notification' in window)) return;
 if (Notification.permission !== 'granted') return;

 const tick = () => {
 const state = useStore.getState();
 const items = buildCalendarItems(state.goals, state.tasks, state.todos, state.events).filter(
 (i) => i.status !== StatusType.FINISHED && i.status !== StatusType.CANCELLED
 );
 const today = startOfDay(new Date()).getTime();
 const day = todayKey(new Date());
 const seen = new Set(notifiedIds);

 for (const item of items) {
 const due = startOfDay(new Date(item.due_date)).getTime();
 const isActionable = due <= today;
 if (!isActionable) continue;
 const key = `${item.itemType}:${item.id}:${day}`;
 if (seen.has(key)) continue;
 try {
 new Notification(`${item.itemType} ${due < today ? 'overdue' : 'due today'}`, {
 body: item.title,
 tag: key,
 silent: false,
 });
 markNotified(key);
 } catch {
 /* notifications blocked / focus issues — skip */
 }
 }
 };

 tick();
 const id = window.setInterval(tick, 5 * 60 * 1000);
 return () => window.clearInterval(id);
 }, [enabled, notifiedIds, markNotified]);
};
