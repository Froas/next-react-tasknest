'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, CheckCircle2, Circle, Flag, Plus, RefreshCw, Target, Zap } from 'lucide-react';
import {
 AuthRequiredError,
 DailyLogColor,
 DailyLogItem,
 TodayMetricItem,
 TodoOccurrenceItem,
 TodoOccurrenceStatus,
 dailyLogsApi,
 metricsApi,
 todoOccurrencesApi,
} from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/store/useToast';
import { notifyTodayDataChanged } from '@/lib/todaySync';
import { useStore } from '@/store/useStore';

type DailyLogDraft = {
 color: DailyLogColor | null;
 note: string;
 trigger: string;
 what_helped: string;
 tomorrow_minimum: string;
};

type TodayGroup = {
 key: string;
 title: string;
 goalId?: string;
 todos: TodoOccurrenceItem[];
 metrics: TodayMetricItem[];
};

const emptyDraft: DailyLogDraft = {
 color: null,
 note: '',
 trigger: '',
 what_helped: '',
 tomorrow_minimum: '',
};

const toDraft = (log: DailyLogItem | null): DailyLogDraft => ({
 color: log?.color ?? null,
 note: log?.note ?? '',
 trigger: log?.trigger ?? '',
 what_helped: log?.what_helped ?? '',
 tomorrow_minimum: log?.tomorrow_minimum ?? '',
});

const toPayload = (draft: DailyLogDraft) => ({
 color: draft.color,
 note: draft.note.trim() || null,
 trigger: draft.trigger.trim() || null,
 what_helped: draft.what_helped.trim() || null,
 tomorrow_minimum: draft.tomorrow_minimum.trim() || null,
});

const sameDraft = (a: DailyLogDraft, b: DailyLogDraft) =>
 a.color === b.color &&
 a.note === b.note &&
 a.trigger === b.trigger &&
 a.what_helped === b.what_helped &&
 a.tomorrow_minimum === b.tomorrow_minimum;

const dayStatusOptions: Array<{
 value: Extract<DailyLogColor, 'green' | 'yellow' | 'red'>;
 label: string;
 hint: string;
 token: string;
}> = [
 { value: 'green', label: 'Good', hint: 'solid day', token: 'var(--tn-good, #2f7d50)' },
 { value: 'yellow', label: 'Minimum', hint: 'thread kept', token: '#d69a1f' },
 { value: 'red', label: 'Bad logged', hint: 'still counted', token: 'var(--tn-bad, #c25d63)' },
];

const groupKey = (item: Pick<TodoOccurrenceItem | TodayMetricItem, 'goal_id' | 'task_id' | 'goal_title' | 'task_title'>) =>
 item.goal_id ?? (item.task_id ? `task:${item.task_id}` : item.goal_title ?? item.task_title ?? 'unlinked');

const groupTitle = (item: Pick<TodoOccurrenceItem | TodayMetricItem, 'goal_title' | 'task_title'>) =>
 item.goal_title ?? item.task_title ?? 'Unlinked';

const metricInputValue = (metric: TodayMetricItem) => {
 if (metric.value !== null && metric.value !== undefined) return metric.value;
 if (metric.numeric_value !== null && metric.numeric_value !== undefined) return String(metric.numeric_value);
 return '';
};

const parseMetricNumber = (value: string) => {
 const trimmed = value.trim();
 if (!trimmed) return null;
 const numeric = Number(trimmed);
 return Number.isFinite(numeric) ? numeric : null;
};

const scrollToDraft = () => {
 if (typeof document === 'undefined') return;
 document.getElementById('daily-draft')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export const DailyLogPanel: React.FC = () => {
 const fetchGoals = useStore((state) => state.fetchGoals);
 const [log, setLog] = useState<DailyLogItem | null>(null);
 const [draft, setDraft] = useState<DailyLogDraft>(emptyDraft);
 const [occurrences, setOccurrences] = useState<TodoOccurrenceItem[]>([]);
 const [metrics, setMetrics] = useState<TodayMetricItem[]>([]);
 const [loading, setLoading] = useState(true);
 const [savingLog, setSavingLog] = useState(false);
 const [savedAt, setSavedAt] = useState<string | null>(null);
 const [endDayOpen, setEndDayOpen] = useState(false);
 const [busyOccurrenceId, setBusyOccurrenceId] = useState<string | null>(null);
 const [savingMetricId, setSavingMetricId] = useState<string | null>(null);

 const loadToday = async () => {
 setLoading(true);
 try {
 const [todayLog, todayOccurrences, todayMetrics] = await Promise.all([
 dailyLogsApi.today(),
 todoOccurrencesApi.today(),
 metricsApi.today(),
 ]);
 setLog(todayLog);
 setDraft(toDraft(todayLog));
 setOccurrences(todayOccurrences);
 setMetrics(todayMetrics);
 setSavedAt(null);
 } catch (error) {
 if (error instanceof AuthRequiredError) return;
 console.error('Failed to load Today:', error);
 toast.error('Failed to load Today');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 void loadToday();
 }, []);

 const persistedDraft = useMemo(() => toDraft(log), [log]);
 const isDirty = !sameDraft(draft, persistedDraft);

 const groups = useMemo(() => {
 const map = new Map<string, TodayGroup>();
 const ensure = (key: string, title: string, goalId?: string | null) => {
 const existing = map.get(key);
 if (existing) return existing;
 const created: TodayGroup = { key, title, todos: [], metrics: [] };
 if (goalId) created.goalId = goalId;
 map.set(key, created);
 return created;
 };

 occurrences.forEach((occurrence) => {
 ensure(groupKey(occurrence), groupTitle(occurrence), occurrence.goal_id).todos.push(occurrence);
 });
 metrics.forEach((metric) => {
 ensure(groupKey(metric), groupTitle(metric), metric.goal_id).metrics.push(metric);
 });

 return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
 }, [metrics, occurrences]);

 const completedCount = occurrences.filter((item) => item.status === 'done' || item.status === 'minimum').length;

 const updateDraft = (patch: Partial<DailyLogDraft>) => {
 setDraft((current) => ({ ...current, ...patch }));
 setSavedAt(null);
 };

 const saveDraft = async (nextDraft: DailyLogDraft, message = 'Today saved') => {
 if (savingLog) return null;
 setSavingLog(true);
 try {
 const payload = toPayload(nextDraft);
 const saved = log
 ? await dailyLogsApi.update({ id: log.id, ...payload })
 : await dailyLogsApi.create(payload);
 setLog(saved);
 setDraft(toDraft(saved));
 setSavedAt(new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }));
 toast.success(message);
 return saved;
 } catch (error) {
 console.error('Failed to save today:', error);
 toast.error('Failed to save today');
 return null;
 } finally {
 setSavingLog(false);
 }
 };

 const chooseColor = (color: Extract<DailyLogColor, 'green' | 'yellow' | 'red'>) => {
 const nextDraft = { ...draft, color: draft.color === color ? null : color };
 setDraft(nextDraft);
 setSavedAt(null);
 void saveDraft(nextDraft, 'Day status logged');
 };

 const logBadDay = () => {
 const nextDraft = { ...draft, color: 'red' as DailyLogColor };
 setDraft(nextDraft);
 setSavedAt(null);
 void saveDraft(nextDraft, 'Bad day logged. That still counts.');
 };

 const toggleOccurrence = async (occurrence: TodoOccurrenceItem) => {
 const nextStatus: TodoOccurrenceStatus = occurrence.status === 'done' || occurrence.status === 'minimum' ? 'open' : 'done';
 const previous = occurrences;
 setBusyOccurrenceId(occurrence.id);
 setOccurrences((current) =>
 current.map((item) => (
 item.id === occurrence.id
 ? { ...item, status: nextStatus, completed_at: nextStatus === 'done' ? new Date().toISOString() : null }
 : item
 ))
 );
 try {
 const updated = await todoOccurrencesApi.update({ id: occurrence.id, status: nextStatus });
 setOccurrences((current) => current.map((item) => (item.id === updated.id ? updated : item)));
 notifyTodayDataChanged();
 void fetchGoals({ force: true, silent: true });
 } catch (error) {
 setOccurrences(previous);
 console.error('Failed to update todo occurrence:', error);
 toast.error('Failed to update todo');
 } finally {
 setBusyOccurrenceId(null);
 }
 };

 const setMetricValue = (metricId: string, value: string) => {
 setMetrics((current) =>
 current.map((metric) => (
 metric.id === metricId
 ? {
 ...metric,
 value,
 numeric_value: metric.input_type === 'number' ? parseMetricNumber(value) : metric.numeric_value,
 }
 : metric
 ))
 );
 };

 const saveMetric = async (metric: TodayMetricItem, rawValue: string) => {
 setSavingMetricId(metric.id);
 try {
 const normalizedValue = rawValue.trim() || null;
 const saved = await metricsApi.upsertEntry({
 metric_definition_id: metric.id,
 date: metric.date ?? undefined,
 value: normalizedValue,
 numeric_value: metric.input_type === 'number' ? parseMetricNumber(rawValue) : null,
 note: metric.note ?? null,
 });
 setMetrics((current) =>
 current.map((item) => (
 item.id === metric.id
 ? {
 ...item,
 entry_id: saved.id,
 date: saved.date,
 value: saved.value,
 numeric_value: saved.numeric_value,
 note: saved.note,
 }
 : item
 ))
 );
 setSavedAt(new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }));
 notifyTodayDataChanged();
 void fetchGoals({ force: true, silent: true });
 } catch (error) {
 console.error('Failed to save metric:', error);
 toast.error('Failed to save metric');
 } finally {
 setSavingMetricId(null);
 }
 };

 const toggleBooleanMetric = async (metric: TodayMetricItem) => {
 const current = metricInputValue(metric) === 'true';
 const next = current ? 'false' : 'true';
 setMetricValue(metric.id, next);
 await saveMetric({ ...metric, value: next }, next);
 };

 return (
 <>
 <section
 className="mb-4 rounded-2xl border p-3 sm:p-4"
 style={{
 border: 'var(--tn-line)',
 background: 'color-mix(in srgb, var(--tn-card) 92%, var(--tn-bg))',
 }}
 >
 <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
 <div className="flex items-start gap-2">
 <span
 className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl"
 style={{ background: 'var(--tn-hover)', color: 'var(--tn-accent)' }}
 >
 <Activity className="h-4 w-4" />
 </span>
 <div>
 <h4 className="text-sm font-semibold text-foreground">Today</h4>
<p className="text-xs text-muted-foreground dark:text-muted-foreground">
 Your day is saved underneath as you check routines, enter goal metrics, and end the day.
 </p>
 </div>
 </div>
 <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground dark:text-muted-foreground">
 {savedAt && <span>Saved {savedAt}</span>}
 {isDirty && !savedAt && <span>Unsaved reflection</span>}
 <button
 type="button"
 onClick={() => void loadToday()}
 disabled={loading}
 className="btn btn-secondary !px-3 !py-1.5 text-xs disabled:opacity-50"
 >
 <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
 <span>Refresh</span>
 </button>
 </div>
 </div>

 <div className="mb-4">
 <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
 Day status
 </div>
 <div className="grid gap-2 sm:grid-cols-3">
 {dayStatusOptions.map((option) => {
 const selected = draft.color === option.value;
 return (
 <button
 key={option.value}
 type="button"
 onClick={() => chooseColor(option.value)}
 disabled={loading || savingLog}
 className="rounded-xl border px-3 py-2 text-left transition-transform hover:-translate-y-0.5 disabled:opacity-60"
 style={{
 borderColor: selected ? option.token : 'color-mix(in srgb, var(--tn-fg-muted) 22%, transparent)',
 background: selected
 ? `color-mix(in srgb, ${option.token} 14%, var(--tn-card))`
 : 'var(--tn-card)',
 color: selected ? option.token : 'var(--tn-fg)',
 }}
 >
 <span className="block text-sm font-semibold">{option.label}</span>
 <span className="block text-[11px] text-muted-foreground dark:text-muted-foreground">{option.hint}</span>
 </button>
 );
 })}
 </div>
 </div>

 <div className="mb-4">
 <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
 <div>
 <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
 Today from active goals
 </div>
 <div className="text-xs text-muted-foreground dark:text-muted-foreground">
 {loading
 ? 'Loading routines and metrics…'
 : `${completedCount}/${occurrences.length} routines checked · ${metrics.length} metrics`}
 </div>
 </div>
 </div>

 {loading ? (
 <div className="rounded-xl border p-4 text-sm text-muted-foreground dark:text-muted-foreground" style={{ border: 'var(--tn-line)' }}>
 Building today from active goals…
 </div>
 ) : groups.length > 0 ? (
 <div className="space-y-3">
 {groups.map((group) => (
 <GoalTodayCard
 key={group.key}
 group={group}
 busyOccurrenceId={busyOccurrenceId}
 savingMetricId={savingMetricId}
 onToggleOccurrence={toggleOccurrence}
 onMetricChange={setMetricValue}
 onMetricBlur={saveMetric}
 onBooleanMetricToggle={toggleBooleanMetric}
 />
 ))}
 </div>
 ) : (
 <div
 className="rounded-2xl border p-4"
 style={{ border: 'var(--tn-line)', background: 'var(--tn-card)' }}
 >
 <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
 <Target className="h-4 w-4" />
 No active goal routines yet
 </div>
 <p className="mb-3 text-sm text-muted-foreground dark:text-muted-foreground">
 Create a goal, add recurring todos/metrics to an active task, or use Daily Draft for today&apos;s scratch plan.
 </p>
 <div className="flex flex-wrap gap-2">
 <Link href="/goal" className="btn btn-primary !px-3 !py-2 text-xs">
 <Plus className="h-4 w-4" />
 <span>Create goal</span>
 </Link>
 <button type="button" onClick={scrollToDraft} className="btn btn-secondary !px-3 !py-2 text-xs">
 <Plus className="h-4 w-4" />
 <span>Add draft</span>
 </button>
 <button type="button" onClick={() => setEndDayOpen(true)} className="btn btn-secondary !px-3 !py-2 text-xs">
 <Flag className="h-4 w-4" />
 <span>Log day anyway</span>
 </button>
 </div>
 </div>
 )}
 </div>

 <div className="flex flex-wrap gap-2">
 <button
 type="button"
 onClick={logBadDay}
 disabled={loading || savingLog}
 className="btn btn-secondary !px-3 !py-2 text-xs disabled:opacity-50"
 >
 <Zap className="h-4 w-4" />
 <span>Log bad day</span>
 </button>
 <button
 type="button"
 onClick={scrollToDraft}
 className="btn btn-secondary !px-3 !py-2 text-xs"
 >
 <Plus className="h-4 w-4" />
 <span>Add draft</span>
 </button>
 <button
 type="button"
 onClick={() => setEndDayOpen(true)}
 disabled={loading}
 className="btn btn-primary !px-3 !py-2 text-xs disabled:opacity-50"
 >
 <Flag className="h-4 w-4" />
 <span>End day</span>
 </button>
 </div>
 </section>

 <Modal open={endDayOpen} title="End day" onClose={() => setEndDayOpen(false)} maxWidth="lg">
 <div className="space-y-4">
 <div>
 <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
 Final color
 </div>
 <div className="grid gap-2 sm:grid-cols-3">
 {dayStatusOptions.map((option) => {
 const selected = draft.color === option.value;
 return (
 <button
 key={option.value}
 type="button"
 onClick={() => updateDraft({ color: selected ? null : option.value })}
 className="rounded-xl border px-3 py-2 text-left"
 style={{
 borderColor: selected ? option.token : 'color-mix(in srgb, var(--tn-fg-muted) 22%, transparent)',
 background: selected ? `color-mix(in srgb, ${option.token} 14%, var(--tn-card))` : 'var(--tn-card)',
 color: selected ? option.token : 'var(--tn-fg)',
 }}
 >
 <span className="block text-sm font-semibold">{option.label}</span>
 <span className="block text-[11px] text-muted-foreground dark:text-muted-foreground">{option.hint}</span>
 </button>
 );
 })}
 </div>
 </div>

 <label className="block">
 <span className="mb-1 block text-xs font-medium text-muted-foreground dark:text-muted-foreground">
 What happened?
 </span>
 <textarea
 value={draft.note}
 onChange={(event) => updateDraft({ note: event.target.value })}
 placeholder="Optional. One sentence is enough."
 className="filter-input min-h-24 w-full resize-y"
 />
 </label>
 <label className="block">
 <span className="mb-1 block text-xs font-medium text-muted-foreground dark:text-muted-foreground">
 Trigger / friction
 </span>
 <input
 value={draft.trigger}
 onChange={(event) => updateDraft({ trigger: event.target.value })}
 placeholder="What pulled the day off-track?"
 className="filter-input w-full"
 />
 </label>
 <label className="block">
 <span className="mb-1 block text-xs font-medium text-muted-foreground dark:text-muted-foreground">
 What helped?
 </span>
 <input
 value={draft.what_helped}
 onChange={(event) => updateDraft({ what_helped: event.target.value })}
 placeholder="What made returning easier?"
 className="filter-input w-full"
 />
 </label>
 <label className="block">
 <span className="mb-1 block text-xs font-medium text-muted-foreground dark:text-muted-foreground">
 Tomorrow minimum
 </span>
 <input
 value={draft.tomorrow_minimum}
 onChange={(event) => updateDraft({ tomorrow_minimum: event.target.value })}
 placeholder="Smallest useful next day"
 className="filter-input w-full"
 />
 </label>

 <div className="flex justify-end gap-2 pt-2">
 <button type="button" onClick={() => setEndDayOpen(false)} className="btn btn-secondary">
 Later
 </button>
 <button
 type="button"
 onClick={async () => {
 const saved = await saveDraft(draft, 'Day closed');
 if (saved) setEndDayOpen(false);
 }}
 disabled={savingLog}
 className="btn btn-primary disabled:opacity-50"
 >
 {savingLog ? 'Saving…' : 'Save day'}
 </button>
 </div>
 </div>
 </Modal>
 </>
 );
};

interface GoalTodayCardProps {
 group: TodayGroup;
 busyOccurrenceId: string | null;
 savingMetricId: string | null;
 onToggleOccurrence: (occurrence: TodoOccurrenceItem) => void;
 onMetricChange: (metricId: string, value: string) => void;
 onMetricBlur: (metric: TodayMetricItem, rawValue: string) => void;
 onBooleanMetricToggle: (metric: TodayMetricItem) => void;
}

const GoalTodayCard: React.FC<GoalTodayCardProps> = ({
 group,
 busyOccurrenceId,
 savingMetricId,
 onToggleOccurrence,
 onMetricChange,
 onMetricBlur,
 onBooleanMetricToggle,
}) => (
 <article
 className="rounded-2xl border p-3"
 style={{ border: 'var(--tn-line)', background: 'var(--tn-card)' }}
 >
 <div className="mb-3 flex items-start justify-between gap-2">
 <div>
 <h5 className="text-sm font-semibold text-foreground">
 {group.goalId ? (
 <Link href={`/goal/${group.goalId}`} className="hover:underline" style={{ color: 'inherit' }}>
 {group.title}
 </Link>
 ) : (
 group.title
 )}
 </h5>
 <p className="text-xs text-muted-foreground dark:text-muted-foreground">
 {group.todos.length} routine{group.todos.length === 1 ? '' : 's'} · {group.metrics.length} metric{group.metrics.length === 1 ? '' : 's'}
 </p>
 </div>
 </div>

 {group.todos.length > 0 && (
 <div className="mb-3 space-y-1">
 {group.todos.map((occurrence) => {
 const done = occurrence.status === 'done' || occurrence.status === 'minimum';
 return (
 <button
 key={occurrence.id}
 type="button"
 onClick={() => onToggleOccurrence(occurrence)}
 disabled={busyOccurrenceId === occurrence.id}
 className="flex w-full items-start gap-2 rounded-xl px-2 py-2 text-left transition-colors disabled:opacity-60"
 style={{
 background: done ? 'color-mix(in srgb, var(--tn-good, #2f7d50) 10%, var(--tn-card))' : 'var(--tn-hover)',
 }}
 >
 <span
 className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
 style={{ color: done ? 'var(--tn-good, #2f7d50)' : 'var(--tn-fg-muted)' }}
 >
 {done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
 </span>
 <span className="min-w-0 flex-1">
 <span className={`block text-sm font-medium ${done ? 'text-muted-foreground line-through dark:text-muted-foreground' : 'text-foreground'}`}>
 {occurrence.todo_title}
 </span>
 {(occurrence.task_title || occurrence.milestone_title) && (
 <span className="block truncate text-xs text-muted-foreground dark:text-muted-foreground">
 {[occurrence.milestone_title, occurrence.task_title].filter(Boolean).join(' · ')}
 </span>
 )}
 </span>
 </button>
 );
 })}
 </div>
 )}

 {group.metrics.length > 0 && (
 <div className="grid gap-2 md:grid-cols-2">
 {group.metrics.map((metric) => {
 const value = metricInputValue(metric);
 const booleanValue = value === 'true';
 return (
 <label
 key={metric.id}
 className="block rounded-xl border p-2"
 style={{ border: 'var(--tn-line)', background: 'color-mix(in srgb, var(--tn-card) 90%, var(--tn-bg))' }}
 >
 <span className="mb-1 flex items-center justify-between gap-2 text-[11px] font-medium text-muted-foreground dark:text-muted-foreground">
 <span className="truncate">
 {metric.name}{metric.unit ? ` · ${metric.unit}` : ''}
 </span>
 {savingMetricId === metric.id && <span>Saving…</span>}
 </span>
 {metric.input_type === 'boolean' ? (
 <button
 type="button"
 onClick={() => void onBooleanMetricToggle(metric)}
 className="flex h-9 w-full items-center justify-between rounded-lg px-3 text-sm font-semibold"
 style={{
 background: booleanValue
 ? 'color-mix(in srgb, var(--tn-good, #2f7d50) 12%, var(--tn-card))'
 : 'var(--tn-hover)',
 color: booleanValue ? 'var(--tn-good, #2f7d50)' : 'var(--tn-fg)',
 }}
 >
 <span>{booleanValue ? 'Yes' : 'No'}</span>
 <span>{booleanValue ? '✓' : '—'}</span>
 </button>
 ) : (
 <input
 type={metric.input_type === 'number' ? 'number' : 'text'}
 value={value}
 onChange={(event) => onMetricChange(metric.id, event.target.value)}
 onBlur={(event) => onMetricBlur(metric, event.target.value)}
 onKeyDown={(event) => {
 if (event.key === 'Enter') event.currentTarget.blur();
 }}
 inputMode={metric.input_type === 'number' ? 'decimal' : 'text'}
 step={metric.input_type === 'number' ? 'any' : undefined}
 placeholder={metric.input_type === 'number' ? '0' : 'Type value'}
 className="w-full bg-transparent text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground"
 />
 )}
 </label>
 );
 })}
 </div>
 )}
 </article>
);
