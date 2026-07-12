'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, RotateCw, ShieldCheck } from 'lucide-react';
import {
 AuthRequiredError,
 TodoOccurrenceItem,
 TodoOccurrenceStatus,
 todoOccurrencesApi,
} from '@/lib/api';
import { toast } from '@/store/useToast';
import { useStore } from '@/store/useStore';

const HISTORY_STATUSES: TodoOccurrenceStatus[] = ['missed', 'skipped', 'excused'];

const toDateInput = (date: Date) => {
 const year = date.getFullYear();
 const month = String(date.getMonth() + 1).padStart(2, '0');
 const day = String(date.getDate()).padStart(2, '0');
 return `${year}-${month}-${day}`;
};

const defaultRange = () => {
 const end = new Date();
 const start = new Date(end);
 start.setDate(start.getDate() - 30);
 return { startDate: toDateInput(start), endDate: toDateInput(end) };
};

const formatDate = (value: string) => {
 const [year, month, day] = value.split('-').map(Number);
 if (!year || !month || !day) return value;
 return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(year, month - 1, day));
};

const statusLabel: Record<TodoOccurrenceStatus, string> = {
 open: 'open',
 done: 'done',
 minimum: 'minimum',
 skipped: 'skipped',
 missed: 'missed',
 excused: 'excused',
};

const statusStyle = (status: TodoOccurrenceStatus): React.CSSProperties => {
 const tone =
 status === 'missed'
 ? 'var(--tn-bad, #c25d63)'
 : status === 'excused'
 ? 'var(--tn-good, #2f7d50)'
 : 'var(--tn-warn, #c8932a)';
 return {
 color: tone,
 background: `color-mix(in srgb, ${tone} 10%, var(--tn-card))`,
 border: `1px solid color-mix(in srgb, ${tone} 28%, transparent)`,
 };
};

export const MissedRoutineHistory: React.FC = () => {
 const fetchGoals = useStore((state) => state.fetchGoals);
 const [items, setItems] = useState<TodoOccurrenceItem[]>([]);
 const [loading, setLoading] = useState(true);
 const [busyId, setBusyId] = useState<string | null>(null);
 const [range] = useState(defaultRange);

 const loadHistory = async () => {
 setLoading(true);
 try {
 const rows = await todoOccurrencesApi.history({
 ...range,
 statuses: HISTORY_STATUSES,
 });
 setItems(rows);
 } catch (error) {
 if (error instanceof AuthRequiredError) return;
 console.error('Failed to load routine history:', error);
 toast.error('Failed to load missed routine history');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 void loadHistory();
 // range is intentionally stable from initial state.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 const counts = useMemo(() => ({
 missed: items.filter((item) => item.status === 'missed').length,
 skipped: items.filter((item) => item.status === 'skipped').length,
 excused: items.filter((item) => item.status === 'excused').length,
 }), [items]);

 const updateStatus = async (item: TodoOccurrenceItem, status: TodoOccurrenceStatus) => {
 setBusyId(item.id);
 const previous = items;
 setItems((current) =>
 current.map((candidate) => (candidate.id === item.id ? { ...candidate, status } : candidate))
 );
 try {
 const updated = await todoOccurrencesApi.update({ id: item.id, status });
 setItems((current) =>
 current.map((candidate) => (candidate.id === updated.id ? updated : candidate))
 );
 void fetchGoals({ force: true, silent: true });
 toast.success(status === 'excused' ? 'Routine excused' : 'Routine marked done');
 } catch (error) {
 setItems(previous);
 console.error('Failed to update routine history:', error);
 toast.error('Failed to update routine');
 } finally {
 setBusyId(null);
 }
 };

 return (
 <section className="card mb-6" style={{ padding: 20 }}>
 <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
 <div>
 <div className="mb-1 flex items-center gap-2">
 <AlertCircle className="h-4 w-4" style={{ color: 'var(--tn-warn, #c8932a)' }} />
 <h2 className="text-lg font-semibold text-foreground">Missed Routine History</h2>
 </div>
 <p className="text-sm text-muted-foreground">
 Last 30 days of missed, skipped, and excused routine occurrences.
 </p>
 </div>
 <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
 <span>{counts.missed} missed</span>
 <span>·</span>
 <span>{counts.skipped} skipped</span>
 <span>·</span>
 <span>{counts.excused} excused</span>
 <button type="button" onClick={loadHistory} disabled={loading} className="btn btn-secondary !px-2 !py-1 text-xs">
 <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
 <span>Refresh</span>
 </button>
 </div>
 </div>

 {loading ? (
 <p className="text-sm text-muted-foreground">Loading routine history…</p>
 ) : items.length === 0 ? (
 <p className="rounded-xl border px-3 py-4 text-sm text-muted-foreground" style={{ border: 'var(--tn-line)' }}>
 No missed or excused routines in this window. Nice, the tiny robot is pleased.
 </p>
 ) : (
 <div className="grid gap-2">
 {items.slice(0, 12).map((item) => (
 <article
 key={item.id}
 className="flex flex-col gap-3 rounded-xl border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
 style={{ border: 'var(--tn-line)', background: 'var(--tn-card)' }}
 >
 <div className="min-w-0">
 <div className="mb-1 flex flex-wrap items-center gap-2">
 <span className="text-xs font-medium text-muted-foreground">{formatDate(item.date)}</span>
 <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide" style={statusStyle(item.status)}>
 {statusLabel[item.status]}
 </span>
 </div>
 <h3 className="truncate text-sm font-semibold text-foreground">{item.todo_title}</h3>
 <p className="truncate text-xs text-muted-foreground">
 {[item.goal_title, item.task_title].filter(Boolean).join(' · ') || 'Unlinked routine'}
 </p>
 </div>
 <div className="flex flex-wrap items-center gap-2">
 {item.status !== 'excused' && (
 <button
 type="button"
 onClick={() => updateStatus(item, 'excused')}
 disabled={busyId === item.id}
 className="btn btn-secondary !px-2 !py-1 text-xs disabled:opacity-50"
 >
 <ShieldCheck className="h-3.5 w-3.5" />
 <span>Excuse</span>
 </button>
 )}
 {item.status !== 'done' && (
 <button
 type="button"
 onClick={() => updateStatus(item, 'done')}
 disabled={busyId === item.id}
 className="btn btn-primary !px-2 !py-1 text-xs disabled:opacity-50"
 >
 <CheckCircle2 className="h-3.5 w-3.5" />
 <span>Done</span>
 </button>
 )}
 </div>
 </article>
 ))}
 {items.length > 12 && (
 <p className="text-xs text-muted-foreground">Showing latest 12 of {items.length} history items.</p>
 )}
 </div>
 )}
 </section>
 );
};
