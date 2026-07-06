'use client';

import React, { useState } from 'react';
import { Markdown } from './Markdown';
import { Eye, Edit3 } from 'lucide-react';

interface MarkdownEditorProps {
 value: string;
 onChange: (next: string) => void;
 rows?: number;
 placeholder?: string;
 id?: string;
 name?: string;
}

// Textarea with a peek-the-markdown toggle. Stays as a plain textarea most
// of the time; flipping to preview renders the same content with the
// existing <Markdown> component so what the user sees here matches what
// shows up on the detail page.
export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
 value,
 onChange,
 rows = 3,
 placeholder,
 id,
 name,
}) => {
 const [mode, setMode] = useState<'edit' | 'preview'>('edit');

 return (
 <div>
 <div className="flex items-center justify-end mb-1 space-x-1">
 <button
 type="button"
 onClick={() => setMode('edit')}
 className={`flex items-center space-x-1 px-2 py-0.5 text-xs rounded-md ${
 mode === 'edit'
 ? 'bg-muted text-foreground'
 : 'text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white'
 }`}
 >
 <Edit3 className="w-3 h-3" />
 <span>Edit</span>
 </button>
 <button
 type="button"
 onClick={() => setMode('preview')}
 className={`flex items-center space-x-1 px-2 py-0.5 text-xs rounded-md ${
 mode === 'preview'
 ? 'bg-muted text-foreground'
 : 'text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white'
 }`}
 >
 <Eye className="w-3 h-3" />
 <span>Preview</span>
 </button>
 </div>
 {mode === 'edit' ? (
 <textarea
 id={id}
 name={name}
 value={value}
 onChange={(e) => onChange(e.target.value)}
 rows={rows}
 placeholder={placeholder}
 className="w-full px-3 py-2 border border-border dark:border-border bg-card dark:bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 font-mono text-sm"
 />
 ) : (
 <div className="w-full min-h-[80px] px-3 py-2 border border-border dark:border-border bg-muted dark:bg-card text-foreground rounded-lg">
 {value.trim() ? (
 <Markdown source={value} />
 ) : (
 <p className="text-sm text-muted-foreground dark:text-muted-foreground italic">Nothing to preview</p>
 )}
 </div>
 )}
 <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
 Supports **bold**, *italic*, `code`, [link](url), and bullet lists.
 </p>
 </div>
 );
};
