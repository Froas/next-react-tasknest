'use client';

import React, { useEffect, useRef } from 'react';

interface ModalProps {
 open: boolean;
 title: string;
 onClose: () => void;
 children: React.ReactNode;
 maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const FOCUSABLE_SELECTOR =
 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const widthClasses: Record<NonNullable<ModalProps['maxWidth']>, string> = {
 sm: 'max-w-sm',
 md: 'max-w-md',
 lg: 'max-w-lg',
 xl: 'max-w-xl',
 '2xl': 'max-w-2xl',
};

export const Modal: React.FC<ModalProps> = ({ open, title, onClose, children, maxWidth = '2xl' }) => {
 const dialogRef = useRef<HTMLDivElement>(null);
 const previouslyFocusedRef = useRef<HTMLElement | null>(null);

 useEffect(() => {
 if (!open) return;
 previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

 const onKey = (e: KeyboardEvent) => {
 if (e.key === 'Escape') {
 onClose();
 return;
 }
 if (e.key !== 'Tab') return;
 // Focus trap: cycle Tab/Shift-Tab within the dialog.
 const node = dialogRef.current;
 if (!node) return;
 const focusable = Array.from(
 node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
 ).filter((el) => !el.hasAttribute('aria-hidden'));
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
 const prevOverflow = document.body.style.overflow;
 document.body.style.overflow = 'hidden';

 // Move focus into the dialog on the next tick (after render).
 requestAnimationFrame(() => {
 const node = dialogRef.current;
 if (!node) return;
 const focusable = node.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
 focusable?.focus();
 });

 return () => {
 document.removeEventListener('keydown', onKey);
 document.body.style.overflow = prevOverflow;
 // Restore focus to the trigger.
 previouslyFocusedRef.current?.focus?.();
 };
 }, [open, onClose]);

 if (!open) return null;

 return (
 <div
 className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
 role="dialog"
 aria-modal="true"
 aria-labelledby="modal-title"
 onClick={(e) => {
 if (e.target === e.currentTarget) onClose();
 }}
 >
 <div ref={dialogRef} className={`bg-card dark:bg-card rounded-xl p-6 w-full max-h-[90vh] overflow-y-auto ${widthClasses[maxWidth]}`}>
 <div className="flex items-start justify-between mb-4">
 <h3 id="modal-title" className="text-lg font-semibold text-foreground">
 {title}
 </h3>
 <button
 onClick={onClose}
 aria-label="Close"
 className="text-muted-foreground hover:text-foreground dark:hover:text-muted-foreground/60 leading-none p-1"
 >
 ×
 </button>
 </div>
 {children}
 </div>
 </div>
 );
};
