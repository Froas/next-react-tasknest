'use client';

import React, { useEffect, useState } from 'react';
import {
 notesApi,
 type NoteItem,
 type SignalDecision,
 type SignalDomain,
 type SignalStake,
} from '@/lib/api';
import { validateRadarDecision } from '@/lib/radar';
import { toast } from '@/store/useToast';

const DOMAINS: SignalDomain[] = ['work', 'money', 'account', 'health', 'relationship', 'game', 'opportunity', 'learning', 'other'];
const STAKES: SignalStake[] = ['none', 'low', 'medium', 'high'];
const DECISIONS: SignalDecision[] = ['ignore', 'watch', 'test', 'act'];

export const RadarSignalEditor: React.FC<{
 signal: NoteItem;
 onSaved: (signal: NoteItem) => void;
}> = ({ signal, onSaved }) => {
 const [title, setTitle] = useState(signal.title);
 const [body, setBody] = useState(signal.body ?? '');
 const [source, setSource] = useState(signal.source ?? '');
 const [domain, setDomain] = useState<SignalDomain>(signal.signal_domain ?? 'other');
 const [stake, setStake] = useState<SignalStake>(signal.signal_stake ?? 'none');
 const [decision, setDecision] = useState<SignalDecision | ''>(signal.signal_decision ?? '');
 const [nextAction, setNextAction] = useState(signal.next_action ?? '');
 const [reviewDate, setReviewDate] = useState(signal.review_date ?? '');
 const [deadline, setDeadline] = useState(signal.deadline ?? '');
 const [outcome, setOutcome] = useState(signal.outcome ?? '');
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 setTitle(signal.title);
 setBody(signal.body ?? '');
 setSource(signal.source ?? '');
 setDomain(signal.signal_domain ?? 'other');
 setStake(signal.signal_stake ?? 'none');
 setDecision(signal.signal_decision ?? '');
 setNextAction(signal.next_action ?? '');
 setReviewDate(signal.review_date ?? '');
 setDeadline(signal.deadline ?? '');
 setOutcome(signal.outcome ?? '');
 setError(null);
 }, [signal]);

 const save = async () => {
 const cleanTitle = title.trim();
 if (!cleanTitle) {
 setError('Title is required.');
 return;
 }
 const decisionValue = decision || null;
 const validationError = validateRadarDecision(decisionValue, reviewDate || null);
 if (validationError) {
 setError(validationError);
 return;
 }
 if (decisionValue === 'ignore' && stake === 'high' && !window.confirm('Ignore this high-stake signal? It will be closed immediately.')) {
 return;
 }

 setSaving(true);
 setError(null);
 try {
 const updated = await notesApi.update({
 id: signal.id,
 title: cleanTitle,
 body: body.trim() || null,
 source: source.trim() || null,
 kind: 'signal',
 signal_domain: domain,
 signal_stake: stake,
 signal_decision: decisionValue,
 next_action: nextAction.trim() || null,
 review_date: reviewDate || null,
 deadline: deadline || null,
 outcome: outcome.trim() || null,
 });
 onSaved(updated);
 toast.success('Signal updated');
 } catch (caught) {
 setError(caught instanceof Error ? caught.message : 'Failed to update signal');
 } finally {
 setSaving(false);
 }
 };

 const toggleResolved = async () => {
 setSaving(true);
 setError(null);
 try {
 const updated = signal.resolved_at
 ? await notesApi.update({ id: signal.id, signal_decision: null, resolved_at: null })
 : await notesApi.update({ id: signal.id, resolved_at: new Date().toISOString() });
 onSaved(updated);
 toast.success(signal.resolved_at ? 'Signal returned to inbox' : 'Signal completed');
 } catch (caught) {
 setError(caught instanceof Error ? caught.message : 'Failed to update signal');
 } finally {
 setSaving(false);
 }
 };

 return (
 <div className="space-y-4">
 {error && (
 <div className="rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--tn-bad)', color: 'var(--tn-bad)' }}>
 {error}
 </div>
 )}
 <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
 Title
 <input className="filter-input mt-1 w-full" value={title} onChange={(event) => setTitle(event.target.value)} />
 </label>
 <div className="grid gap-3 sm:grid-cols-3">
 <FieldSelect label="Domain" value={domain} values={DOMAINS} onChange={(value) => setDomain(value as SignalDomain)} />
 <FieldSelect label="Stake" value={stake} values={STAKES} onChange={(value) => setStake(value as SignalStake)} />
 <FieldSelect label="Decision" value={decision} values={DECISIONS} allowEmpty onChange={(value) => setDecision(value as SignalDecision | '')} />
 </div>
 <div className="grid gap-3 sm:grid-cols-2">
 <FieldInput label="Source" value={source} placeholder="book, email, call, bug…" onChange={setSource} />
 <FieldInput label="Next action" value={nextAction} placeholder="Smallest useful next step" onChange={setNextAction} />
 <FieldInput label="Review date" value={reviewDate} type="date" onChange={setReviewDate} />
 <FieldInput label="Deadline" value={deadline} type="date" onChange={setDeadline} />
 </div>
 <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
 Note
 <textarea className="filter-input mt-1 min-h-28 w-full resize-y" value={body} onChange={(event) => setBody(event.target.value)} />
 </label>
 <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
 Outcome
 <textarea className="filter-input mt-1 min-h-20 w-full resize-y" value={outcome} onChange={(event) => setOutcome(event.target.value)} />
 </label>
 <div className="flex flex-wrap justify-end gap-2">
 <button type="button" className="btn btn-secondary" disabled={saving} onClick={toggleResolved}>
 {signal.resolved_at ? 'Return to inbox' : 'Mark done'}
 </button>
 <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>
 {saving ? 'Saving…' : 'Save signal'}
 </button>
 </div>
 </div>
 );
};

const FieldInput: React.FC<{
 label: string;
 value: string;
 type?: string;
 placeholder?: string;
 onChange: (value: string) => void;
}> = ({ label, value, type = 'text', placeholder, onChange }) => (
 <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
 {label}
 <input
 type={type}
 className="filter-input mt-1 w-full"
 value={value}
 placeholder={placeholder}
 onChange={(event) => onChange(event.target.value)}
 />
 </label>
);

const FieldSelect: React.FC<{
 label: string;
 value: string;
 values: string[];
 allowEmpty?: boolean;
 onChange: (value: string) => void;
}> = ({ label, value, values, allowEmpty = false, onChange }) => (
 <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
 {label}
 <select className="filter-select mt-1 w-full" value={value} onChange={(event) => onChange(event.target.value)}>
 {allowEmpty && <option value="">Inbox / undecided</option>}
 {values.map((option) => <option key={option} value={option}>{option}</option>)}
 </select>
 </label>
);
