'use client';

import { useEffect } from 'react';
import { useStore } from './useStore';

const CHANNEL_NAME = 'tasknest-sync';
const TAB_ID = typeof crypto !== 'undefined' && 'randomUUID' in crypto
 ? crypto.randomUUID()
 : `${Date.now()}-${Math.random()}`;

type SyncMessage = { sender: string; type: 'invalidate' };

// Cross-tab cache invalidation. When any tab mutates store data, it broadcasts
// an `invalidate` message; receivers reset fetchedAt timestamps so the next
// data access (or a full refetch on focus) pulls fresh data instead of stale.
export const useBroadcastSync = () => {
 useEffect(() => {
 if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;

 const channel = new BroadcastChannel(CHANNEL_NAME);

 const invalidateAll = () => {
 // Reset only fetchedAt timestamps — keep current data so the UI doesn't
 // flash empty; next fetch* call will be forced past the freshness check.
 useStore.setState({
 goalsFetchedAt: null,
 milestonesFetchedAt: null,
 tasksFetchedAt: null,
 todosFetchedAt: null,
 eventsFetchedAt: null,
 });
 // Also re-fetch goals immediately so the active tab updates without
 // user interaction.
 void useStore.getState().fetchGoals({ force: true, silent: true });
 };

 channel.onmessage = (event: MessageEvent<SyncMessage>) => {
 if (!event.data || event.data.sender === TAB_ID) return;
 if (event.data.type === 'invalidate') invalidateAll();
 };

 // Subscribe to mutations: when any tracked slice changes due to
 // *local* user action (not a fetch result), broadcast an invalidate.
 let lastSnapshot = snapshot();
 const unsubscribe = useStore.subscribe((state) => {
 const next = snapshot(state);
 if (
 next.goalsCount !== lastSnapshot.goalsCount ||
 next.milestonesCount !== lastSnapshot.milestonesCount ||
 next.tasksCount !== lastSnapshot.tasksCount ||
 next.todosCount !== lastSnapshot.todosCount ||
 next.eventsCount !== lastSnapshot.eventsCount
 ) {
 channel.postMessage({ sender: TAB_ID, type: 'invalidate' } satisfies SyncMessage);
 }
 lastSnapshot = next;
 });

 // Refresh on tab focus — common case where the user has been mutating in
 // another tab, comes back here, and expects up-to-date data.
 const onFocus = () => {
 if (document.visibilityState === 'visible') invalidateAll();
 };
 document.addEventListener('visibilitychange', onFocus);

 return () => {
 unsubscribe();
 channel.close();
 document.removeEventListener('visibilitychange', onFocus);
 };
 }, []);
};

const snapshot = (state = useStore.getState()) => ({
 goalsCount: state.goals.length,
 milestonesCount: state.milestones.length,
 tasksCount: state.tasks.length,
 todosCount: state.todos.length,
 eventsCount: state.events.length,
});
