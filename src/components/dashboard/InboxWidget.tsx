'use client';

import React, { useEffect, useState } from 'react';
import { useInbox } from '@/store/useInbox';
import { Inbox, Plus, X } from 'lucide-react';
import { DailyDraftTodos } from './DailyDraftTodos';
import { toast } from '@/store/useToast';

// Quick-capture widget: jot anything down without committing to a goal.
// Items persist locally; the user can review and promote them later via
// the standard create-task flow.
export const InboxWidget: React.FC = () => {
 const items = useInbox((s) => s.items);
 const add = useInbox((s) => s.add);
 const remove = useInbox((s) => s.remove);
 const [draft, setDraft] = useState('');
 const [activeTab, setActiveTab] = useState<'scratch' | 'inbox'>('scratch');

 useEffect(() => {
 void useInbox.getState().hydrate();
 }, []);

 const submit = async (e?: React.FormEvent) => {
 e?.preventDefault();
 const text = draft.trim();
 if (!text) return;
 try {
 await add(text);
 setDraft('');
 } catch {
 toast.error('Failed to save inbox note');
 }
 };

 return (
 <section
 className="rounded-2xl border p-5"
 style={{ border: 'var(--tn-line)', background: 'var(--tn-card)' }}
 >
 <header className="mb-4 flex items-start justify-between gap-4">
 <div className="min-w-0">
 <div className="flex items-center gap-2">
 <Inbox className="h-4 w-4 text-muted-foreground" />
 <h3 className="text-lg font-semibold text-foreground">Inbox</h3>
 </div>
 <p className="mt-1 text-sm text-muted-foreground">
 Keep temporary work here before it becomes part of a goal.
 </p>
 </div>
 {items.length > 0 && (
 <span className="flex-shrink-0 text-xs text-muted-foreground">{items.length} local</span>
 )}
 </header>

 <div
 className="mb-4 grid grid-cols-2 gap-1 rounded-xl p-1"
 style={{ background: 'var(--tn-hover)' }}
 role="tablist"
 aria-label="Inbox type"
 >
 <button
 type="button"
 role="tab"
 aria-selected={activeTab === 'scratch'}
 onClick={() => setActiveTab('scratch')}
 className="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
 style={activeTab === 'scratch' ? {
 background: 'var(--tn-card)',
 color: 'var(--tn-fg)',
 boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
 } : { color: 'var(--tn-fg-muted)' }}
 >
 Today&apos;s todos
 </button>
 <button
 type="button"
 role="tab"
 aria-selected={activeTab === 'inbox'}
 onClick={() => setActiveTab('inbox')}
 className="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
 style={activeTab === 'inbox' ? {
 background: 'var(--tn-card)',
 color: 'var(--tn-fg)',
 boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
 } : { color: 'var(--tn-fg-muted)' }}
 >
 Notes{items.length > 0 ? ` · ${items.length}` : ''}
 </button>
 </div>

 {activeTab === 'scratch' ? (
 <DailyDraftTodos embedded />
 ) : (
 <div role="tabpanel">
 <form onSubmit={submit} className="mb-3 flex gap-2">
 <input
 type="text"
 value={draft}
 onChange={(e) => setDraft(e.target.value)}
 placeholder="Capture a thought…"
 className="filter-input min-w-0 flex-1"
 />
 <button
 type="submit"
 disabled={!draft.trim()}
 className="btn btn-primary disabled:opacity-50"
 >
 <Plus className="h-4 w-4" />
 <span className="hidden sm:inline">Add</span>
 </button>
 </form>

 {items.length > 0 ? (
 <ul className="max-h-48 space-y-1 overflow-y-auto">
 {items.map((item) => (
 <li
 key={item.id}
 className="group flex items-start justify-between rounded-xl px-2 py-2 hover:bg-muted dark:hover:bg-card/40"
 >
 <span className="min-w-0 flex-1 break-words text-sm text-foreground">
 {item.text}
 </span>
 <button
 type="button"
 onClick={() => void remove(item.id).catch(() => toast.error('Failed to remove inbox note'))}
 aria-label="Remove from inbox"
 className="ml-2 p-1 text-muted-foreground opacity-100 transition-opacity hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100"
 >
 <X className="h-3.5 w-3.5" />
 </button>
 </li>
 ))}
 </ul>
 ) : (
 <p className="py-2 text-xs text-muted-foreground">
 Half-formed ideas can stay here until they are ready to become real work.
 </p>
 )}
 </div>
 )}
 </section>
 );
};
