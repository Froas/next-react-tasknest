'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Lightweight keyboard shortcut layer:
// / focus first <input type="search"> on the page
// n navigate to /goal (start a new goal flow)
// ? broadcast `tasknest:show-help` (consumers can listen)
// g + g go to dashboard
// g + y go to Today
// g + l go to goals
// g + m go to milestones
// g + t go to tasks
// g + d go to todos
// g + e go to events
// g + c go to calendar
// g + v go to visualization
//
// Skipped while focus is in a text input / textarea / contenteditable so
// the user can type"n" or"/" inside their content.

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

const isTyping = (target: EventTarget | null) => {
 if (!(target instanceof HTMLElement)) return false;
 if (TYPING_TAGS.has(target.tagName)) return true;
 if (target.isContentEditable) return true;
 return false;
};

const G_PREFIX_TIMEOUT_MS = 1500;

export const useKeyboardShortcuts = () => {
 const router = useRouter();
 const gPrefixActiveRef = useRef(false);
 const gPrefixTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

 useEffect(() => {
 const clearGPrefix = () => {
 gPrefixActiveRef.current = false;
 if (gPrefixTimerRef.current) {
 clearTimeout(gPrefixTimerRef.current);
 gPrefixTimerRef.current = null;
 }
 };

 const onKey = (e: KeyboardEvent) => {
 if (e.metaKey || e.ctrlKey || e.altKey) return;
 if (isTyping(e.target)) return;

 const key = e.key.toLowerCase();

 if (gPrefixActiveRef.current) {
 const map: Record<string, string> = {
 g: '/',
 y: '/today',
 l: '/goal',
 m: '/milestone',
 t: '/task',
 d: '/todo',
 e: '/event',
 c: '/calendar',
 v: '/visualization',
 a: '/activity',
 };
 if (map[key]) {
 e.preventDefault();
 router.push(map[key]);
 }
 clearGPrefix();
 return;
 }

 switch (key) {
 case '/':
 e.preventDefault();
 (document.querySelector('input[type="search"]') as HTMLInputElement | null)?.focus();
 break;
 case 'n':
 e.preventDefault();
 router.push('/goal');
 break;
 case '?':
 e.preventDefault();
 window.dispatchEvent(new CustomEvent('tasknest:show-help'));
 break;
 case 'g':
 e.preventDefault();
 gPrefixActiveRef.current = true;
 gPrefixTimerRef.current = setTimeout(clearGPrefix, G_PREFIX_TIMEOUT_MS);
 break;
 }
 };

 document.addEventListener('keydown', onKey);
 return () => {
 document.removeEventListener('keydown', onKey);
 clearGPrefix();
 };
 }, [router]);
};
