'use client';

import React, { useEffect, useRef, useState } from 'react';

type SaveHandler<T extends string> = (nextValue: T) => void | Promise<void>;

interface InlineTextProps {
 value?: string | null;
 placeholder?: string;
 ariaLabel: string;
 className?: string;
 editClassName?: string;
 multiline?: boolean;
 required?: boolean;
 renderValue?: (value: string) => React.ReactNode;
 onSave: SaveHandler<string>;
}

export const InlineText: React.FC<InlineTextProps> = ({
 value,
 placeholder = 'Click to edit',
 ariaLabel,
 className,
 editClassName,
 multiline = false,
 required = false,
 renderValue,
 onSave,
}) => {
 const [isEditing, setIsEditing] = useState(false);
 const [draft, setDraft] = useState(value ?? '');
 const [isSaving, setIsSaving] = useState(false);
 const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

 useEffect(() => {
 if (!isEditing) setDraft(value ?? '');
 }, [isEditing, value]);

 useEffect(() => {
 if (!isEditing) return;
 const frame = requestAnimationFrame(() => {
 const input = inputRef.current;
 if (!input) return;
 input.focus();
 if (multiline) {
 input.setSelectionRange(input.value.length, input.value.length);
 } else {
 input.select();
 }
 });
 return () => cancelAnimationFrame(frame);
 }, [isEditing, multiline]);

 const commit = async () => {
 const nextValue = required ? draft.trim() : draft.trim();
 const currentValue = value ?? '';
 if (required && !nextValue) {
 setDraft(currentValue);
 setIsEditing(false);
 return;
 }
 if (nextValue === currentValue) {
 setIsEditing(false);
 return;
 }
 setIsSaving(true);
 try {
 await onSave(nextValue);
 setIsEditing(false);
 } finally {
 setIsSaving(false);
 }
 };

 const cancel = () => {
 setDraft(value ?? '');
 setIsEditing(false);
 };

 if (isEditing) {
 const sharedProps = {
 ref: inputRef as never,
 value: draft,
 disabled: isSaving,
 onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(event.target.value),
 onBlur: commit,
 onKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
 if (event.key === 'Escape') {
 event.preventDefault();
 cancel();
 return;
 }
 if (!multiline && event.key === 'Enter') {
 event.preventDefault();
 commit();
 return;
 }
 if (multiline && event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
 event.preventDefault();
 commit();
 }
 },
 className: editClassName,
 style: {
 width: '100%',
 background: 'var(--tn-card)',
 color: 'var(--tn-fg)',
 border: 'var(--tn-line)',
 borderColor: 'var(--tn-accent)',
 borderRadius: 'var(--tn-radius-sm, 10px)',
 padding: '0.35rem 0.5rem',
 outline: 'none',
 boxShadow: '0 0 0 3px color-mix(in srgb, var(--tn-accent) 18%, transparent)',
 },
 'aria-label': ariaLabel,
 };

 return multiline ? (
 <textarea
 {...sharedProps}
 rows={Math.max(3, draft.split('\n').length)}
 />
 ) : (
 <input
 {...sharedProps}
 type="text"
 />
 );
 }

 const displayValue = value?.trim() ?? '';

 return (
 <div
 role="button"
 tabIndex={0}
 aria-label={ariaLabel}
 title="Click to edit"
 onClick={() => setIsEditing(true)}
 onKeyDown={(event) => {
 if (event.key === 'Enter' || event.key === ' ') {
 event.preventDefault();
 setIsEditing(true);
 }
 }}
 className={`rounded-md transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 ${className ?? ''}`}
 style={{ cursor: 'text', outlineColor: 'var(--tn-accent)' }}
 >
 {displayValue
 ? renderValue?.(displayValue) ?? displayValue
 : <span style={{ color: 'var(--tn-fg-muted)' }}>{placeholder}</span>}
 </div>
 );
};

interface InlineSelectProps<T extends string> {
 value: T;
 options: readonly T[];
 ariaLabel: string;
 className?: string;
 selectClassName?: string;
 renderValue: (value: T) => React.ReactNode;
 onSave: SaveHandler<T>;
}

export function InlineSelect<T extends string>({
 value,
 options,
 ariaLabel,
 className,
 selectClassName,
 renderValue,
 onSave,
}: InlineSelectProps<T>) {
 const [isEditing, setIsEditing] = useState(false);
 const [isSaving, setIsSaving] = useState(false);
 const selectRef = useRef<HTMLSelectElement>(null);

 useEffect(() => {
 if (!isEditing) return;
 const frame = requestAnimationFrame(() => selectRef.current?.focus());
 return () => cancelAnimationFrame(frame);
 }, [isEditing]);

 const commit = async (nextValue: T) => {
 if (nextValue === value) {
 setIsEditing(false);
 return;
 }
 setIsSaving(true);
 try {
 await onSave(nextValue);
 setIsEditing(false);
 } finally {
 setIsSaving(false);
 }
 };

 if (isEditing) {
 return (
 <select
 ref={selectRef}
 value={value}
 disabled={isSaving}
 aria-label={ariaLabel}
 onChange={(event) => commit(event.target.value as T)}
 onBlur={() => setIsEditing(false)}
 onKeyDown={(event) => {
 if (event.key === 'Escape') {
 event.preventDefault();
 setIsEditing(false);
 }
 }}
 className={selectClassName}
 style={{
 background: 'var(--tn-card)',
 color: 'var(--tn-fg)',
 border: 'var(--tn-line)',
 borderColor: 'var(--tn-accent)',
 borderRadius: 999,
 padding: '0.5rem 0.85rem',
 outline: 'none',
 boxShadow: '0 0 0 3px color-mix(in srgb, var(--tn-accent) 18%, transparent)',
 }}
 >
 {options.map((option) => (
 <option key={option} value={option}>{option}</option>
 ))}
 </select>
 );
 }

 return (
 <button
 type="button"
 aria-label={ariaLabel}
 title="Click to edit"
 onClick={() => setIsEditing(true)}
 className={`transition-colors hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-offset-2 ${className ?? ''}`}
 style={{ cursor: 'pointer' }}
 >
 {renderValue(value)}
 </button>
 );
}

const toDateValue = (value?: string | null) => {
 if (!value) return '';
 if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
 const parsed = new Date(value);
 if (Number.isNaN(parsed.getTime())) return '';
 return parsed.toISOString().slice(0, 10);
};

interface InlineDateProps {
 value?: string | null;
 ariaLabel: string;
 className?: string;
 renderValue: (value?: string | null) => React.ReactNode;
 onSave: SaveHandler<string>;
 toPayload?: (dateValue: string) => string;
}

export const InlineDate: React.FC<InlineDateProps> = ({
 value,
 ariaLabel,
 className,
 renderValue,
 onSave,
 toPayload = (dateValue) => dateValue,
}) => {
 const [isEditing, setIsEditing] = useState(false);
 const [draft, setDraft] = useState(toDateValue(value));
 const [isSaving, setIsSaving] = useState(false);
 const inputRef = useRef<HTMLInputElement>(null);

 useEffect(() => {
 if (!isEditing) setDraft(toDateValue(value));
 }, [isEditing, value]);

 useEffect(() => {
 if (!isEditing) return;
 const frame = requestAnimationFrame(() => inputRef.current?.focus());
 return () => cancelAnimationFrame(frame);
 }, [isEditing]);

 const commit = async () => {
 const current = toDateValue(value);
 if (!draft || draft === current) {
 setIsEditing(false);
 return;
 }
 setIsSaving(true);
 try {
 await onSave(toPayload(draft));
 setIsEditing(false);
 } finally {
 setIsSaving(false);
 }
 };

 if (isEditing) {
 return (
 <input
 ref={inputRef}
 type="date"
 value={draft}
 disabled={isSaving}
 aria-label={ariaLabel}
 onChange={(event) => setDraft(event.target.value)}
 onBlur={commit}
 onKeyDown={(event) => {
 if (event.key === 'Escape') {
 event.preventDefault();
 setDraft(toDateValue(value));
 setIsEditing(false);
 }
 if (event.key === 'Enter') {
 event.preventDefault();
 commit();
 }
 }}
 className={className}
 style={{
 background: 'var(--tn-card)',
 color: 'var(--tn-fg)',
 border: 'var(--tn-line)',
 borderColor: 'var(--tn-accent)',
 borderRadius: 999,
 padding: '0.5rem 0.85rem',
 outline: 'none',
 boxShadow: '0 0 0 3px color-mix(in srgb, var(--tn-accent) 18%, transparent)',
 }}
 />
 );
 }

 return (
 <button
 type="button"
 aria-label={ariaLabel}
 title="Click to edit"
 onClick={() => setIsEditing(true)}
 className={`transition-colors hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-offset-2 ${className ?? ''}`}
 style={{ cursor: 'pointer' }}
 >
 {renderValue(value)}
 </button>
 );
};
