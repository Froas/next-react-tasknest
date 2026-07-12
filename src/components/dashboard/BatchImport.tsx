'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { tasksApi } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { StatusType, PriorityType } from '@/lib/types';
import { toast } from '@/store/useToast';

interface BatchImportProps {
 open: boolean;
 onClose: () => void;
 goalId: string;
 milestoneId: string;
}

// Parse a markdown-style bullet/checklist into a list of task titles.
// Accepts:"- foo","* foo","1. foo","[ ] foo","- [ ] foo","- [x] foo".
const parseLines = (text: string): { title: string; done: boolean }[] => {
 return text
 .split('\n')
 .map((raw) => {
 const trimmed = raw.trim();
 if (!trimmed) return null;
 const match = trimmed.match(/^(?:[-*+]\s+|\d+[.)]\s+)?(?:\[([ xX])\]\s+)?(.*)$/);
 if (!match) return { title: trimmed, done: false };
 const checked = match[1] && match[1].toLowerCase() === 'x';
 const title = match[2].trim();
 if (!title) return null;
 return { title, done: !!checked };
 })
 .filter((x): x is { title: string; done: boolean } => x !== null);
};

// Paste-a-list, get-tasks. Lets the user dump a markdown checklist or a
// plain bullet list and materialise it as N tasks under a chosen milestone.
export const BatchImport: React.FC<BatchImportProps> = ({ open, onClose, goalId, milestoneId }) => {
 const [text, setText] = useState('');
 const [busy, setBusy] = useState(false);
 const addTaskToMilestoneInGoal = useStore(
 useShallow((s) => ({ addTaskToMilestoneInGoal: s.addTaskToMilestoneInGoal }))
 ).addTaskToMilestoneInGoal;

 const parsed = parseLines(text);

 const submit = async () => {
 if (parsed.length === 0) return;
 setBusy(true);
 let succeeded = 0;
 let failed = 0;
 for (const item of parsed) {
 try {
 const created = await tasksApi.create({
 title: item.title,
 description: '',
 status: item.done ? StatusType.FINISHED : StatusType.OUTSTANDING,
 priority: PriorityType.MEDIUM,
 milestone_id: milestoneId,
 todos: [],
 subtasks: [],
 ...(item.done ? { end_datetime: new Date().toISOString() } : {}),
 });
 addTaskToMilestoneInGoal(created, milestoneId, goalId);
 succeeded += 1;
 } catch (err) {
 console.error('Batch import: failed to create task:', err);
 failed += 1;
 }
 }
 setBusy(false);
 if (succeeded > 0) toast.success(`Imported ${succeeded} task${succeeded === 1 ? '' : 's'}`);
 if (failed > 0) toast.error(`Failed to import ${failed} task${failed === 1 ? '' : 's'}`);
 if (succeeded > 0) {
 setText('');
 onClose();
 }
 };

 return (
 <Modal open={open} title="Batch import tasks" onClose={onClose} maxWidth="lg">
 <p className="text-sm text-foreground dark:text-muted-foreground/60 mb-3">
 Paste a markdown checklist or any bulleted list. Each line becomes a task. Checked items
 (<code className="px-1 rounded" style={{ background: 'var(--tn-chip)' }}>[x]</code>) are imported as
 already finished.
 </p>
 <textarea
 value={text}
 onChange={(e) => setText(e.target.value)}
 rows={10}
 placeholder={`- [ ] Pick a course\n- [ ] Daily 20-min practice\n- [x] Bought a notebook\n* Watch one beginner video`}
 className="filter-input w-full font-mono"
 />
 <div className="flex items-center justify-between mt-3">
 <span className="text-xs text-muted-foreground dark:text-muted-foreground">
 {parsed.length === 0
 ? 'No lines detected.'
 : `${parsed.length} task${parsed.length === 1 ? '' : 's'} ready to import`}
 </span>
 <div className="flex space-x-2">
 <button
 onClick={onClose}
 disabled={busy}
 className="btn btn-secondary disabled:opacity-50"
 >
 Cancel
 </button>
 <button
 onClick={submit}
 disabled={busy || parsed.length === 0}
 className="btn btn-primary disabled:opacity-50"
 >
 {busy ? 'Importing…' : `Import ${parsed.length || ''}`}
 </button>
 </div>
 </div>
 </Modal>
 );
};
