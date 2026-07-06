import { useEffect, useState } from 'react';

const STORAGE_PREFIX = 'tasknest:draft:';

// Persist a form's working state to localStorage so the user can wander off
// (close the modal, switch tabs, refresh) and come back without losing what
// they typed. Drafts are scoped by `key` and cleared explicitly via
// `clearDraft` after a successful submit.
export function useFormDraft<T>(
 key: string,
 initial: T,
 options: { skipIfDirty?: boolean } = {}
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
 const storageKey = `${STORAGE_PREFIX}${key}`;
 const [state, setState] = useState<T>(() => {
 if (typeof window === 'undefined') return initial;
 try {
 const raw = localStorage.getItem(storageKey);
 if (!raw) return initial;
 const parsed = JSON.parse(raw) as T;
 return { ...initial, ...parsed };
 } catch {
 return initial;
 }
 });

 useEffect(() => {
 if (typeof window === 'undefined') return;
 try {
 localStorage.setItem(storageKey, JSON.stringify(state));
 } catch {
 // Quota exceeded or storage disabled — silent fallback.
 }
 }, [state, storageKey]);

 const clearDraft = () => {
 if (typeof window === 'undefined') return;
 try {
 localStorage.removeItem(storageKey);
 } catch {
 /* ignore */
 }
 };

 return [state, setState, clearDraft];
}
