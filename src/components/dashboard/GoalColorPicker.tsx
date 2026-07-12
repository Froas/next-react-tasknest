'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GRADIENTS } from '@/lib/goalCover';
import { useGoalColors } from '@/store/useGoalColors';
import { Palette } from 'lucide-react';

interface GoalColorPickerProps {
 goalId: string;
}

export const GoalColorPicker: React.FC<GoalColorPickerProps> = ({ goalId }) => {
 const [open, setOpen] = useState(false);
 const popoverRef = useRef<HTMLDivElement>(null);
 const setColor = useGoalColors((s) => s.setColor);
 const clear = useGoalColors((s) => s.clear);
 const current = useGoalColors((s) => s.overrides[goalId]);

 // Close on outside click.
 useEffect(() => {
 if (!open) return;
 const onDoc = (e: MouseEvent) => {
 if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
 setOpen(false);
 }
 };
 document.addEventListener('mousedown', onDoc);
 return () => document.removeEventListener('mousedown', onDoc);
 }, [open]);

 return (
 <div className="relative" ref={popoverRef}>
 <button
 onClick={() => setOpen((v) => !v)}
 title="Change goal colour"
 aria-label="Change goal colour"
 className="btn btn-secondary"
 >
 <Palette className="w-3.5 h-3.5" />
 <span>Colour</span>
 </button>
 {open && (
 <div className="absolute right-0 mt-2 z-30 bg-card dark:bg-card rounded-lg shadow-xl border border-border dark:border-border p-3 w-64">
 <div className="text-xs font-semibold text-muted-foreground dark:text-muted-foreground mb-2 uppercase tracking-wider">
 Pick a gradient
 </div>
 <div className="grid grid-cols-5 gap-2">
 {GRADIENTS.map((g) => {
 const isActive = g === current;
 return (
 <button
 key={g}
 onClick={() => {
 setColor(goalId, g);
 setOpen(false);
 }}
 className={`h-8 rounded-md bg-gradient-to-r ${g}`}
 style={{
 boxShadow: isActive ? '0 0 0 2px var(--tn-card), 0 0 0 4px var(--tn-accent)' : undefined,
 }}
 aria-label={`Set colour to ${g}`}
 />
 );
 })}
 </div>
 {current && (
 <button
 onClick={() => {
 clear(goalId);
 setOpen(false);
 }}
 className="mt-3 w-full px-2 py-1 text-xs text-foreground dark:text-muted-foreground/60 hover:text-foreground dark:hover:text-white border border-border dark:border-border rounded-md"
 >
 Reset to auto
 </button>
 )}
 </div>
 )}
 </div>
 );
};
