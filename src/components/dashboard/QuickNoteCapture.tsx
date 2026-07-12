'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { FileText, Plus, Radio, Sparkles } from 'lucide-react';
import { AuthRequiredError, notesApi } from '@/lib/api';
import { StatusType } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { toast } from '@/store/useToast';

type QuickNoteKind = 'note' | 'signal';

type RelationOption = {
 value: string;
 label: string;
 goalId?: string;
 taskId?: string;
};

const noteTitleFromBody = (body: string) => {
 const firstLine = body
 .split('\n')
 .map((line) => line.trim())
 .find(Boolean);
 const title = firstLine || `Daily note — ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
 return title.length > 80 ? `${title.slice(0, 77)}…` : title;
};

export const QuickNoteCapture: React.FC = () => {
 const goals = useStore((state) => state.goals);
 const [body, setBody] = useState('');
 const [kind, setKind] = useState<QuickNoteKind>('note');
 const [tag, setTag] = useState('daily');
 const [source, setSource] = useState('');
 const [relationValue, setRelationValue] = useState('');
 const [saving, setSaving] = useState(false);
 const [savedTitle, setSavedTitle] = useState<string | null>(null);

 const relationOptions = useMemo<RelationOption[]>(() => {
 const activeGoals = goals.filter((goal) => goal.status !== StatusType.FINISHED && goal.status !== StatusType.CANCELLED);
 return activeGoals.flatMap((goal) => {
 const options: RelationOption[] = [{ value: `goal:${goal.id}`, label: `Goal · ${goal.title}`, goalId: goal.id }];
 for (const task of goal.tasks ?? []) {
 options.push({
 value: `task:${task.id}`,
 label: `Routine · ${goal.title} / ${task.title}`,
 goalId: goal.id,
 taskId: task.id,
 });
 }
 for (const milestone of goal.milestones ?? []) {
 for (const task of milestone.tasks ?? []) {
 options.push({
 value: `task:${task.id}`,
 label: `Task · ${goal.title} / ${milestone.title} / ${task.title}`,
 goalId: goal.id,
 taskId: task.id,
 });
 }
 }
 return options;
 });
 }, [goals]);

 const selectedRelation = relationOptions.find((option) => option.value === relationValue);

 const chooseKind = (nextKind: QuickNoteKind) => {
 setKind(nextKind);
 setSavedTitle(null);
 if (nextKind === 'signal' && (tag.trim() === '' || tag.trim() === 'daily')) setTag('signal');
 if (nextKind === 'note' && tag.trim() === 'signal') setTag('daily');
 };

 const submit = async (event?: React.FormEvent) => {
 event?.preventDefault();
 const trimmed = body.trim();
 if (!trimmed || saving) return;
 setSaving(true);
 try {
 const title = noteTitleFromBody(trimmed);
 const note = await notesApi.create({
 title,
 body: trimmed,
 tag: tag.trim() || (kind === 'signal' ? 'signal' : 'daily'),
 pinned: false,
 kind,
 source: source.trim() || null,
 goal_id: selectedRelation?.goalId ?? null,
 task_id: selectedRelation?.taskId ?? null,
 });
 setSavedTitle(note.title);
 setBody('');
 toast.success(kind === 'signal' ? 'Signal saved' : 'Note saved');
 } catch (error) {
 if (error instanceof AuthRequiredError) return;
 console.error('Failed to save quick note:', error);
 toast.error('Failed to save note');
 } finally {
 setSaving(false);
 }
 };

 return (
 <section
 className="mb-4 min-w-0 overflow-hidden rounded-2xl border p-3"
 style={{
 border: 'var(--tn-line)',
 background: 'color-mix(in srgb, var(--tn-card) 86%, var(--tn-bg))',
 }}
 >
 <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
 <div className="flex items-start gap-2">
 <span
 className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl"
 style={{ background: 'var(--tn-hover)', color: 'var(--tn-accent)' }}
 >
 <FileText className="h-4 w-4" />
 </span>
 <div>
 <h4 className="text-sm font-semibold text-foreground">Quick Capture</h4>
 <p className="text-xs text-muted-foreground dark:text-muted-foreground">
 Save a note or radar signal without turning it into a task.
 </p>
 </div>
 </div>
 <Link href="/notes" className="text-xs hover:underline" style={{ color: 'var(--tn-accent)' }}>
 Open notes →
 </Link>
 </div>

 <form onSubmit={submit} className="min-w-0 space-y-2">
 <div className="grid min-w-0 gap-2 sm:grid-cols-2">
 {(['note', 'signal'] as const).map((option) => {
 const selected = kind === option;
 return (
 <button
 key={option}
 type="button"
 onClick={() => chooseKind(option)}
 className="min-w-0 rounded-xl border px-3 py-2 text-left text-sm transition-colors"
 style={{
 borderColor: selected ? 'var(--tn-accent)' : 'color-mix(in srgb, var(--tn-fg-muted) 22%, transparent)',
 background: selected ? 'color-mix(in srgb, var(--tn-accent) 10%, var(--tn-card))' : 'var(--tn-card)',
 color: selected ? 'var(--tn-accent)' : 'var(--tn-fg)',
 }}
 >
 <span className="font-semibold">{option === 'signal' ? 'Signal' : 'Note'}</span>
 <span className="ml-2 inline-block max-w-full truncate align-bottom text-xs text-muted-foreground dark:text-muted-foreground">
 {option === 'signal' ? 'radar / weak signal' : 'plain thought'}
 </span>
 </button>
 );
 })}
 </div>

 <textarea
 value={body}
 onChange={(event) => {
 setBody(event.target.value);
 setSavedTitle(null);
 }}
 onKeyDown={(event) => {
 if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
 void submit(event);
 }
 }}
 placeholder={kind === 'signal' ? 'What did you notice? Source, pattern, weird repeated thing…' : 'Idea, rough thought, note… Cmd/Ctrl+Enter to save'}
 className="filter-input min-h-24 w-full min-w-0 resize-y"
 aria-label="Quick note body"
 />
 <div className="grid min-w-0 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(150px,220px)_minmax(120px,180px)]">
 <label className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground dark:text-muted-foreground md:col-span-2 xl:col-span-1">
 <Radio className="h-3.5 w-3.5 flex-shrink-0" />
 <span className="whitespace-nowrap">Link</span>
 <select
 value={relationValue}
 onChange={(event) => setRelationValue(event.target.value)}
 className="filter-input !h-8 min-w-0 flex-1 !px-2 !py-1 text-xs"
 aria-label="Link quick capture to goal or task"
 >
 <option value="">No relation</option>
 {relationOptions.map((option) => (
 <option key={option.value} value={option.value}>
 {option.label}
 </option>
 ))}
 </select>
 </label>
 <label className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground dark:text-muted-foreground">
 <span className="whitespace-nowrap">Source</span>
 <input
 value={source}
 onChange={(event) => setSource(event.target.value)}
 placeholder={kind === 'signal' ? 'book, call, bug…' : 'optional'}
 className="filter-input !h-8 min-w-0 flex-1 !px-2 !py-1 text-xs"
 aria-label="Quick note source"
 />
 </label>
 <label className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground dark:text-muted-foreground">
 <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
 <span>Tag</span>
 <input
 value={tag}
 onChange={(event) => setTag(event.target.value)}
 className="filter-input !h-8 min-w-0 flex-1 !px-2 !py-1 text-xs"
 aria-label="Quick note tag"
 />
 </label>
 </div>
 <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
 <p className="min-w-0 text-xs text-muted-foreground dark:text-muted-foreground">
 {kind === 'signal'
 ? 'Signals are saved as notes with kind=signal, ready for Radar review later.'
 : 'Notes stay lightweight; use Scratch Todos when it should become an action.'}
 </p>
 <div className="flex min-w-0 flex-shrink-0 items-center justify-end gap-2">
 {savedTitle && (
 <span className="max-w-48 truncate text-xs text-muted-foreground dark:text-muted-foreground">
 Saved: {savedTitle}
 </span>
 )}
 <button
 type="submit"
 disabled={!body.trim() || saving}
 className="btn btn-primary !px-3 !py-2 text-xs disabled:opacity-50"
 >
 <Plus className="h-4 w-4" />
 <span>{saving ? 'Saving…' : kind === 'signal' ? 'Save signal' : 'Save note'}</span>
 </button>
 </div>
 </div>
 </form>
 </section>
 );
};
