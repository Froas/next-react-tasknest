'use client';

import { useEffect, useState } from 'react';

const PREFIX = 'tasknest:pref:';

// Drop-in replacement for useState that mirrors the value to localStorage
// under a stable key, so list/page filters/sort/search choices survive
// reloads without forcing the user to reconfigure them every visit.
export function usePersistentState<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
 const storageKey = `${PREFIX}${key}`;
 const [state, setState] = useState<T>(() => {
 if (typeof window === 'undefined') return initial;
 try {
 const raw = localStorage.getItem(storageKey);
 if (raw === null) return initial;
 return JSON.parse(raw) as T;
 } catch {
 return initial;
 }
 });

 useEffect(() => {
 if (typeof window === 'undefined') return;
 try {
 localStorage.setItem(storageKey, JSON.stringify(state));
 } catch {
 /* quota / disabled — silent */
 }
 }, [state, storageKey]);

 return [state, setState];
}
