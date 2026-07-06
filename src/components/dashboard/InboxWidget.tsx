'use client';

import React, { useState } from 'react';
import { useInbox } from '@/store/useInbox';
import { Inbox, Plus, X } from 'lucide-react';

// Quick-capture widget: jot anything down without committing to a goal.
// Items persist locally; the user can review and promote them later via
// the standard create-task flow.
export const InboxWidget: React.FC = () => {
 const items = useInbox((s) => s.items);
 const add = useInbox((s) => s.add);
 const remove = useInbox((s) => s.remove);
 const [draft, setDraft] = useState('');

 const submit = (e?: React.FormEvent) => {
 e?.preventDefault();
 const text = draft.trim();
 if (!text) return;
 add(text);
 setDraft('');
 };

 return (
 <div className="bg-card dark:bg-card rounded-xl border border-border dark:border-border p-4 mb-6">
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center space-x-2">
 <Inbox className="w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
 <h3 className="text-sm font-semibold text-foreground">Inbox</h3>
 {items.length > 0 && (
 <span className="text-xs text-muted-foreground dark:text-muted-foreground">({items.length})</span>
 )}
 </div>
 <span className="text-xs text-muted-foreground dark:text-muted-foreground">Local only</span>
 </div>

 <form onSubmit={submit} className="flex space-x-2 mb-3">
 <input
 type="text"
 value={draft}
 onChange={(e) => setDraft(e.target.value)}
 placeholder="Capture a thought…"
 className="flex-1 px-3 py-2 text-sm border border-border dark:border-border bg-card dark:bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 <button
 type="submit"
 disabled={!draft.trim()}
 className="px-3 py-2 text-sm bg-card dark:bg-card text-white rounded-lg hover:bg-card dark:hover:bg-muted disabled:opacity-50 flex items-center space-x-1"
 >
 <Plus className="w-3 h-3" />
 <span>Add</span>
 </button>
 </form>

 {items.length > 0 ? (
 <ul className="space-y-1 max-h-48 overflow-y-auto">
 {items.map((item) => (
 <li
 key={item.id}
 className="flex items-start justify-between px-3 py-2 rounded-lg hover:bg-muted dark:hover:bg-card/40 group"
 >
 <span className="text-sm text-foreground dark:text-muted-foreground/60 break-words flex-1 min-w-0">
 {item.text}
 </span>
 <button
 onClick={() => remove(item.id)}
 aria-label="Remove from inbox"
 className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 p-1 text-muted-foreground hover:text-red-500"
 >
 <X className="w-3.5 h-3.5" />
 </button>
 </li>
 ))}
 </ul>
 ) : (
 <p className="text-xs text-muted-foreground dark:text-muted-foreground py-2">
 Use this for half-formed ideas. Promote them to real tasks when they're ready.
 </p>
 )}
 </div>
 );
};
