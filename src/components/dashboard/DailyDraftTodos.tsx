'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Archive, CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react';
import { AuthRequiredError, DailyDraftTodoItem, dailyDraftTodosApi } from '@/lib/api';
import { toast } from '@/store/useToast';

const todayIso = () => {
 const now = new Date();
 const year = now.getFullYear();
 const month = String(now.getMonth() + 1).padStart(2, '0');
 const day = String(now.getDate()).padStart(2, '0');
 return `${year}-${month}-${day}`;
};

const formatDraftDay = (day: string) => {
 const [year, month, date] = day.split('-').map(Number);
 if (!year || !month || !date) return day;
 return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(year, month - 1, date));
};

const sortDraftTodos = (items: DailyDraftTodoItem[]) =>
 [...items].sort((a, b) => {
 if (a.done !== b.done) return a.done ? 1 : -1;
 if (a.day !== b.day) return a.day.localeCompare(b.day);
 return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
 });

export const DailyDraftTodos: React.FC = () => {
 const [items, setItems] = useState<DailyDraftTodoItem[]>([]);
 const [draft, setDraft] = useState('');
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [busyId, setBusyId] = useState<string | null>(null);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [editingTitle, setEditingTitle] = useState('');
 const currentDay = todayIso();

 useEffect(() => {
 let cancelled = false;
 const load = async () => {
 try {
 const rows = await dailyDraftTodosApi.getAll();
 if (!cancelled) setItems(sortDraftTodos(rows));
 } catch (error) {
 if (error instanceof AuthRequiredError) return;
 console.error('Failed to load daily draft todos:', error);
 if (!cancelled) toast.error('Failed to load daily draft');
 } finally {
 if (!cancelled) setLoading(false);
 }
 };
 load();
 return () => {
 cancelled = true;
 };
 }, []);

 const counts = useMemo(() => {
 const done = items.filter((item) => item.done).length;
 const carryover = items.filter((item) => !item.done && item.day < currentDay).length;
 return { done, open: items.length - done, carryover };
 }, [items, currentDay]);

 const submit = async (event?: React.FormEvent) => {
 event?.preventDefault();
 const title = draft.trim();
 if (!title || saving) return;
 setSaving(true);
 try {
 const created = await dailyDraftTodosApi.create({ title });
 setItems((current) => sortDraftTodos([...current, created]));
 setDraft('');
 } catch (error) {
 console.error('Failed to add daily draft todo:', error);
 toast.error('Failed to add draft todo');
 } finally {
 setSaving(false);
 }
 };

 const toggle = async (item: DailyDraftTodoItem) => {
 setBusyId(item.id);
 const previous = items;
 setItems((current) =>
 sortDraftTodos(current.map((candidate) => (
 candidate.id === item.id ? { ...candidate, done: !candidate.done } : candidate
 )))
 );
 try {
 const updated = await dailyDraftTodosApi.update({ id: item.id, done: !item.done });
 setItems((current) => sortDraftTodos(current.map((candidate) => (candidate.id === updated.id ? updated : candidate))));
 } catch (error) {
 setItems(previous);
 console.error('Failed to update daily draft todo:', error);
 toast.error('Failed to update draft todo');
 } finally {
 setBusyId(null);
 }
 };

 const startEditing = (item: DailyDraftTodoItem) => {
 if (item.done) return;
 setEditingId(item.id);
 setEditingTitle(item.title);
 };

 const cancelEditing = () => {
 setEditingId(null);
 setEditingTitle('');
 };

 const saveTitle = async () => {
 if (!editingId) return;
 const title = editingTitle.trim();
 const item = items.find((candidate) => candidate.id === editingId);
 if (!item) return cancelEditing();
 if (!title) {
 toast.error('Draft todo title is required');
 return;
 }
 if (title === item.title) {
 cancelEditing();
 return;
 }
 const previous = items;
 setItems((current) => sortDraftTodos(current.map((candidate) => (
 candidate.id === editingId ? { ...candidate, title } : candidate
 ))));
 setBusyId(editingId);
 try {
 const updated = await dailyDraftTodosApi.update({ id: editingId, title });
 setItems((current) => sortDraftTodos(current.map((candidate) => (candidate.id === updated.id ? updated : candidate))));
 cancelEditing();
 } catch (error) {
 setItems(previous);
 console.error('Failed to rename daily draft todo:', error);
 toast.error('Failed to rename draft todo');
 } finally {
 setBusyId(null);
 }
 };

 const remove = async (item: DailyDraftTodoItem) => {
 setBusyId(item.id);
 const previous = items;
 setItems((current) => current.filter((candidate) => candidate.id !== item.id));
 try {
 await dailyDraftTodosApi.delete(item.id);
 } catch (error) {
 setItems(previous);
 console.error('Failed to delete daily draft todo:', error);
 toast.error('Failed to delete draft todo');
 } finally {
 setBusyId(null);
 }
 };

 const archiveDone = async () => {
 const doneItems = items.filter((item) => item.done);
 if (doneItems.length === 0) return;
 setBusyId('__archive_done__');
 const previous = items;
 setItems((current) => current.filter((item) => !item.done));
 try {
 await Promise.all(doneItems.map((item) => dailyDraftTodosApi.delete(item.id)));
 toast.success('Archived completed draft todos');
 } catch (error) {
 setItems(previous);
 console.error('Failed to archive daily draft todos:', error);
 toast.error('Failed to archive completed todos');
 } finally {
 setBusyId(null);
 }
 };

 return (
 <section
 id="daily-draft"
 className="mb-4 rounded-2xl border p-3"
 style={{
 border: 'var(--tn-line)',
 background: 'color-mix(in srgb, var(--tn-card) 86%, var(--tn-bg))',
 }}
 >
 <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <h4 className="text-sm font-semibold text-foreground">Scratch Todos</h4>
 <p className="text-xs text-muted-foreground dark:text-muted-foreground">
 Standalone todos for today. Unfinished items carry over until done.
 </p>
 </div>
 <div className="flex items-center gap-2 text-xs text-muted-foreground dark:text-muted-foreground">
 <span>
 {counts.open} open · {counts.done} done{counts.carryover > 0 ? ` · ${counts.carryover} carried` : ''}
 </span>
 {counts.done > 0 && (
 <button
 type="button"
 onClick={archiveDone}
 disabled={busyId === '__archive_done__'}
 className="btn btn-secondary !px-2 !py-1 text-xs disabled:opacity-50"
 title="Archive completed draft todos"
 >
 <Archive className="h-3.5 w-3.5" />
 <span>Archive done</span>
 </button>
 )}
 </div>
 </div>

 <form onSubmit={submit} className="mb-3 flex gap-2">
 <input
 type="text"
 value={draft}
 onChange={(event) => setDraft(event.target.value)}
 placeholder="Pay internet, send email…"
 className="filter-input flex-1"
 aria-label="Daily draft todo title"
 />
 <button
 type="submit"
 disabled={!draft.trim() || saving}
 className="btn btn-primary disabled:opacity-50"
 >
 <Plus className="h-4 w-4" />
 <span className="hidden sm:inline">{saving ? 'Adding…' : 'Add'}</span>
 </button>
 </form>

 {loading ? (
 <p className="py-2 text-xs text-muted-foreground dark:text-muted-foreground">Loading daily draft…</p>
 ) : items.length > 0 ? (
 <ul className="space-y-1">
 {items.map((item) => (
 <li
 key={item.id}
 className="group flex items-center gap-2 rounded-xl px-2 py-1.5"
 style={{ background: item.done ? 'var(--tn-hover)' : 'transparent' }}
 >
 <button
 type="button"
 onClick={() => toggle(item)}
 disabled={busyId === item.id}
 className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full disabled:opacity-50"
 title={item.done ? 'Mark as open' : 'Mark done'}
 aria-label={item.done ? 'Mark as open' : 'Mark done'}
 style={{ color: item.done ? 'var(--tn-good, #2f7d50)' : 'var(--tn-fg-muted)' }}
 >
 {item.done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
 </button>
 <div className="min-w-0 flex-1">
 {editingId === item.id ? (
 <input
 autoFocus
 value={editingTitle}
 onChange={(event) => setEditingTitle(event.target.value)}
 onBlur={() => void saveTitle()}
 onKeyDown={(event) => {
 if (event.key === 'Enter') event.currentTarget.blur();
 if (event.key === 'Escape') cancelEditing();
 }}
 className="filter-input h-8 w-full px-2 py-1 text-sm"
 aria-label="Edit scratch todo title"
 disabled={busyId === item.id}
 />
 ) : (
 <button
 type="button"
 onClick={() => startEditing(item)}
 className={`block min-w-0 max-w-full break-words text-left text-sm ${
 item.done ? 'text-muted-foreground line-through dark:text-muted-foreground' : 'text-foreground'
 }`}
 title={item.done ? item.title : 'Click to edit'}
 >
 {item.title}
 </button>
 )}
 {item.day < currentDay && !item.done && (
 <div className="mt-0.5 text-[11px] text-muted-foreground dark:text-muted-foreground">
 Carried over from {formatDraftDay(item.day)}
 </div>
 )}
 </div>
 <button
 type="button"
 onClick={() => remove(item)}
 disabled={busyId === item.id}
 className="p-1 text-muted-foreground opacity-100 transition-opacity hover:text-red-500 disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100"
 title="Delete draft todo"
 aria-label="Delete draft todo"
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </li>
 ))}
 </ul>
 ) : (
 <p className="py-2 text-xs text-muted-foreground dark:text-muted-foreground">
 No scratch todos yet. Add anything that should stay separate from goals.
 </p>
 )}
 </section>
 );
};
