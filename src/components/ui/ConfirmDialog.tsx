'use client';

import React, { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
 'button:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ConfirmDialogProps {
 open: boolean;
 title: string;
 description?: string;
 confirmLabel?: string;
 cancelLabel?: string;
 destructive?: boolean;
 busy?: boolean;
 onConfirm: () => void;
 onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
 open,
 title,
 description,
 confirmLabel = 'Confirm',
 cancelLabel = 'Cancel',
 destructive = false,
 busy = false,
 onConfirm,
 onCancel,
}) => {
 const dialogRef = useRef<HTMLDivElement>(null);
 const previouslyFocusedRef = useRef<HTMLElement | null>(null);

 useEffect(() => {
 if (!open) return;
 previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
 const onKey = (e: KeyboardEvent) => {
 if (e.key === 'Escape' && !busy) {
 onCancel();
 return;
 }
 if (e.key !== 'Tab') return;
 const node = dialogRef.current;
 if (!node) return;
 const focusable = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
 if (focusable.length === 0) return;
 const first = focusable[0];
 const last = focusable[focusable.length - 1];
 const active = document.activeElement as HTMLElement | null;
 if (e.shiftKey && (active === first || !node.contains(active))) {
 e.preventDefault();
 last.focus();
 } else if (!e.shiftKey && active === last) {
 e.preventDefault();
 first.focus();
 }
 };
 document.addEventListener('keydown', onKey);
 requestAnimationFrame(() => {
 const node = dialogRef.current;
 const focusable = node?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
 focusable?.focus();
 });
 return () => {
 document.removeEventListener('keydown', onKey);
 previouslyFocusedRef.current?.focus?.();
 };
 }, [open, busy, onCancel]);

 if (!open) return null;

 return (
 <div
 className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
 role="dialog"
 aria-modal="true"
 aria-labelledby="confirm-dialog-title"
 onClick={(e) => {
 if (e.target === e.currentTarget && !busy) onCancel();
 }}
 >
 <div ref={dialogRef} className="bg-card dark:bg-card rounded-lg p-6 max-w-md w-full">
 <h3 id="confirm-dialog-title" className="text-lg font-semibold text-foreground mb-2">
 {title}
 </h3>
 {description && (
 <p className="text-foreground dark:text-muted-foreground/60 mb-6">{description}</p>
 )}
 <div className="flex justify-end space-x-3">
 <button
 onClick={onCancel}
 disabled={busy}
 className="px-4 py-2 rounded-lg text-foreground dark:text-muted-foreground/60 bg-muted dark:bg-card hover:bg-muted dark:hover:bg-muted disabled:opacity-50"
 >
 {cancelLabel}
 </button>
 <button
 onClick={onConfirm}
 disabled={busy}
 className={`px-4 py-2 rounded-lg text-white disabled:opacity-50 ${
 destructive
 ? 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
 : 'bg-card hover:bg-card dark:bg-card dark:hover:bg-muted'
 }`}
 >
 {busy ? 'Working...' : confirmLabel}
 </button>
 </div>
 </div>
 </div>
 );
};
