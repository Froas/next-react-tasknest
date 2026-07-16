'use client';

import React, { useEffect, useState } from 'react';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';

const SHORTCUTS = [
 { keys: ['⌘', 'K'], label: 'Open command palette' },
 { keys: ['/'], label: 'Focus search on the current page' },
 { keys: ['n'], label: 'Go to goals (create new)' },
 { keys: ['?'], label: 'Show this cheat sheet' },
 { keys: ['g', 'g'], label: 'Go to Dashboard' },
 { keys: ['g', 'y'], label: 'Go to Today' },
 { keys: ['g', 'l'], label: 'Go to Goals' },
 { keys: ['g', 'm'], label: 'Go to Milestones' },
 { keys: ['g', 't'], label: 'Go to Tasks' },
 { keys: ['g', 'd'], label: 'Go to Todos' },
 { keys: ['g', 'e'], label: 'Go to Events' },
 { keys: ['g', 'c'], label: 'Go to Calendar' },
 { keys: ['g', 'v'], label: 'Go to Visualization' },
 { keys: ['g', 'a'], label: 'Go to Activity' },
 { keys: ['Esc'], label: 'Close any open modal' },
];

export const HelpOverlay: React.FC = () => {
 useKeyboardShortcuts();
 const [open, setOpen] = useState(false);

 useEffect(() => {
 const onShow = () => setOpen(true);
 const onKey = (e: KeyboardEvent) => {
 if (open && e.key === 'Escape') setOpen(false);
 };
 window.addEventListener('tasknest:show-help', onShow);
 document.addEventListener('keydown', onKey);
 return () => {
 window.removeEventListener('tasknest:show-help', onShow);
 document.removeEventListener('keydown', onKey);
 };
 }, [open]);

 if (!open) return null;

 return (
 <div
 className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]"
 role="dialog"
 aria-modal="true"
 aria-labelledby="help-title"
 onClick={(e) => {
 if (e.target === e.currentTarget) setOpen(false);
 }}
 >
 <div className="bg-card dark:bg-card rounded-xl shadow-2xl w-full max-w-md border border-border dark:border-border">
 <div className="px-6 py-4 border-b border-border dark:border-border flex items-center justify-between">
 <h2 id="help-title" className="text-lg font-semibold text-foreground">
 Keyboard shortcuts
 </h2>
 <button
 onClick={() => setOpen(false)}
 aria-label="Close"
 className="text-muted-foreground hover:text-foreground dark:hover:text-muted-foreground/60 leading-none p-1"
 >
 ×
 </button>
 </div>
 <ul className="py-2 max-h-[60vh] overflow-y-auto">
 {SHORTCUTS.map((s) => (
 <li key={s.label} className="flex items-center justify-between px-6 py-2">
 <span className="text-sm text-foreground dark:text-muted-foreground/60">{s.label}</span>
 <span className="flex items-center space-x-1">
 {s.keys.map((k, i) => (
 <kbd
 key={i}
 className="px-2 py-1 text-xs bg-muted dark:bg-card text-foreground dark:text-muted-foreground/60 rounded border border-border dark:border-border"
 >
 {k}
 </kbd>
 ))}
 </span>
 </li>
 ))}
 </ul>
 </div>
 </div>
 );
};
