'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { useRecentGoals } from '@/store/useRecentGoals';

interface Command {
 id: string;
 label: string;
 hint?: string;
 group: 'Recent' | 'Navigate' | 'Goal' | 'Milestone' | 'Task' | 'Todo' | 'Event' | 'Action';
 run: () => void;
}

// Cmd+K / Ctrl+K opens a fuzzy-search palette over routes and goals.
// Keeps the user one keystroke away from anything in the app.
export const CommandPalette: React.FC = () => {
 const [open, setOpen] = useState(false);
 const [query, setQuery] = useState('');
 const [highlighted, setHighlighted] = useState(0);
 const router = useRouter();
 const goals = useStore((s) => s.goals);
 const tasks = useStore((s) => s.tasks);
 const todos = useStore((s) => s.todos);
 const events = useStore((s) => s.events);
 const recentIds = useRecentGoals((s) => s.ids);

 useEffect(() => {
 const onKey = (e: KeyboardEvent) => {
 const isMacShortcut = e.metaKey && e.key.toLowerCase() === 'k';
 const isCtrlShortcut = e.ctrlKey && e.key.toLowerCase() === 'k';
 if (isMacShortcut || isCtrlShortcut) {
 e.preventDefault();
 setOpen((prev) => !prev);
 setQuery('');
 setHighlighted(0);
 return;
 }
 if (open && e.key === 'Escape') {
 setOpen(false);
 }
 };
 // Custom event so other components (e.g. AppShell search icon) can
 // pop the palette without faking a CMD+K keydown (synthetic key
 // events don't always carry through React's listener).
 const onCustomOpen = () => {
 setOpen(true);
 setQuery('');
 setHighlighted(0);
 };
 document.addEventListener('keydown', onKey);
 document.addEventListener('tasknest:open-command-palette', onCustomOpen);
 return () => {
 document.removeEventListener('keydown', onKey);
 document.removeEventListener('tasknest:open-command-palette', onCustomOpen);
 };
 }, [open]);

 const allCommands: Command[] = useMemo(() => {
 const navigate: Command[] = [
 { id: 'nav-dashboard', label: 'Go to Dashboard', group: 'Navigate', run: () => router.push('/') },
 { id: 'nav-goals', label: 'Go to Goals', group: 'Navigate', run: () => router.push('/goal') },
 { id: 'nav-milestones', label: 'Go to Milestones', group: 'Navigate', run: () => router.push('/milestone') },
 { id: 'nav-tasks', label: 'Go to Tasks', group: 'Navigate', run: () => router.push('/task') },
 { id: 'nav-todos', label: 'Go to Todos', group: 'Navigate', run: () => router.push('/todo') },
 { id: 'nav-events', label: 'Go to Events', group: 'Navigate', run: () => router.push('/event') },
 { id: 'nav-calendar', label: 'Go to Calendar', group: 'Navigate', run: () => router.push('/calendar') },
 { id: 'nav-attention', label: 'Go to Attention', group: 'Navigate', run: () => router.push('/attention') },
 { id: 'nav-viz', label: 'Go to Visualization', group: 'Navigate', run: () => router.push('/visualization') },
 { id: 'nav-activity', label: 'Go to Activity', group: 'Navigate', run: () => router.push('/activity') },
 { id: 'nav-profile', label: 'Go to Profile', group: 'Navigate', run: () => router.push('/profile') },
 ];

 const recentCommands: Command[] = recentIds
 .map((id) => goals.find((g) => g.id === id))
 .filter((g): g is NonNullable<typeof g> => !!g)
 .map((g) => ({
 id: `recent-${g.id}`,
 label: g.title,
 hint: 'Recent',
 group: 'Recent',
 run: () => router.push(`/goal/${g.id}`),
 }));

 const recentSet = new Set(recentIds);
 const goalCommands: Command[] = goals
 .filter((g) => !recentSet.has(g.id))
 .map((g) => ({
 id: `goal-${g.id}`,
 label: g.title,
 hint: 'Open goal',
 group: 'Goal',
 run: () => router.push(`/goal/${g.id}`),
 }));

 const milestoneCommands: Command[] = [];
 const taskCommands: Command[] = [];
 goals.forEach((g) => {
 g.milestones?.forEach((m) => {
 milestoneCommands.push({
 id: `milestone-${m.id}`,
 label: m.title,
 hint: g.title,
 group: 'Milestone',
 run: () => router.push(`/goal/${g.id}`),
 });
 m.tasks?.forEach((t) => {
 taskCommands.push({
 id: `task-${t.id}`,
 label: t.title,
 hint: `${g.title} · ${m.title}`,
 group: 'Task',
 run: () => router.push(`/goal/${g.id}`),
 });
 });
 });
 });

 // Standalone tasks/todos that aren't already in the tree.
 const seenTaskIds = new Set(taskCommands.map((c) => c.id.replace('task-', '')));
 tasks.forEach((t) => {
 if (seenTaskIds.has(t.id)) return;
 taskCommands.push({
 id: `task-${t.id}`,
 label: t.title,
 hint: 'Open tasks',
 group: 'Task',
 run: () => router.push('/task'),
 });
 });

 const todoCommands: Command[] = todos.map((t) => ({
 id: `todo-${t.id}`,
 label: t.title,
 hint: 'Open todos',
 group: 'Todo',
 run: () => router.push('/todo'),
 }));

 const eventCommands: Command[] = events.map((e) => ({
 id: `event-${e.id}`,
 label: e.title,
 hint: 'Open events',
 group: 'Event',
 run: () => router.push('/event'),
 }));

 return [...recentCommands, ...navigate, ...goalCommands, ...milestoneCommands, ...taskCommands, ...todoCommands, ...eventCommands];
 }, [goals, tasks, todos, events, recentIds, router]);

 const filtered = useMemo(() => {
 const q = query.trim().toLowerCase();
 if (!q) return allCommands;
 return allCommands.filter((c) => c.label.toLowerCase().includes(q));
 }, [query, allCommands]);

 // Reset highlight when filter changes.
 useEffect(() => {
 setHighlighted(0);
 }, [query]);

 if (!open) return null;

 const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
 if (!acc[cmd.group]) acc[cmd.group] = [];
 acc[cmd.group].push(cmd);
 return acc;
 }, {});

 const flatList = filtered;
 const handleKeyDown = (e: React.KeyboardEvent) => {
 if (e.key === 'ArrowDown') {
 e.preventDefault();
 setHighlighted((h) => Math.min(h + 1, flatList.length - 1));
 } else if (e.key === 'ArrowUp') {
 e.preventDefault();
 setHighlighted((h) => Math.max(h - 1, 0));
 } else if (e.key === 'Enter') {
 e.preventDefault();
 const cmd = flatList[highlighted];
 if (cmd) {
 cmd.run();
 setOpen(false);
 }
 }
 };

 let runningIndex = 0;

 return (
 <div
 className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-24 z-50 px-4"
 role="dialog"
 aria-modal="true"
 aria-label="Command palette"
 onClick={(e) => {
 if (e.target === e.currentTarget) setOpen(false);
 }}
 >
 <div className="bg-card dark:bg-card rounded-xl shadow-2xl w-full max-w-xl border border-border dark:border-border overflow-hidden">
 <input
 autoFocus
 type="text"
 value={query}
 onChange={(e) => setQuery(e.target.value)}
 onKeyDown={handleKeyDown}
 placeholder="Type a command or search goals..."
 className="w-full px-4 py-3 bg-transparent text-foreground border-b border-border dark:border-border focus:outline-none"
 />
 <div className="max-h-80 overflow-y-auto">
 {flatList.length === 0 ? (
 <div className="px-4 py-8 text-center text-sm text-muted-foreground dark:text-muted-foreground">
 No matches
 </div>
 ) : (
 Object.entries(grouped).map(([group, cmds]) => (
 <div key={group} className="py-2">
 <div className="px-4 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
 {group}
 </div>
 {cmds.map((cmd) => {
 const myIndex = runningIndex++;
 const isHighlighted = myIndex === highlighted;
 return (
 <button
 key={cmd.id}
 onMouseEnter={() => setHighlighted(myIndex)}
 onClick={() => {
 cmd.run();
 setOpen(false);
 }}
 className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between ${
 isHighlighted ? 'text-foreground' : 'text-foreground dark:text-muted-foreground/60'
 }`}
 style={isHighlighted ? { background: 'color-mix(in srgb, var(--tn-accent) 10%, var(--tn-card))' } : undefined}
 >
 <span className="truncate">{cmd.label}</span>
 {cmd.hint && (
 <span className="text-xs text-muted-foreground dark:text-muted-foreground ml-2 flex-shrink-0">
 {cmd.hint}
 </span>
 )}
 </button>
 );
 })}
 </div>
 ))
 )}
 </div>
 <div className="px-4 py-2 border-t border-border dark:border-border bg-muted dark:bg-card text-xs text-muted-foreground dark:text-muted-foreground flex items-center justify-between">
 <span>↑↓ Navigate · Enter to select · Esc to close</span>
 <kbd className="px-2 py-1 text-xs bg-card dark:bg-card rounded border border-border dark:border-border">
 ⌘K
 </kbd>
 </div>
 </div>
 </div>
 );
};
