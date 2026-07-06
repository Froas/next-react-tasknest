'use client';

import { useEffect, useRef } from 'react';
import { useStore } from './useStore';
import { toast } from './useToast';

// Subscribe to error slices in the global store and surface a toast whenever
// they transition from null to a message. Mount once at the layout level.
export const useErrorWatcher = () => {
 const lastSeenRef = useRef<Record<string, string | null>>({
 goals: null,
 milestones: null,
 tasks: null,
 todos: null,
 events: null,
 });

 useEffect(() => {
 return useStore.subscribe((state) => {
 const slices: Record<string, string | null> = {
 goals: state.goalsError,
 milestones: state.milestonesError,
 tasks: state.tasksError,
 todos: state.todosError,
 events: state.eventsError,
 };
 Object.entries(slices).forEach(([key, message]) => {
 if (message && message !== lastSeenRef.current[key]) {
 toast.error(message);
 }
 lastSeenRef.current[key] = message;
 });
 });
 }, []);
};
