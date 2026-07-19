'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, Flag, Plus, Star, Target } from 'lucide-react';
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
import { useTodoStreaks } from '@/store/useTodoStreaks';

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
 { value: 'red', label: 'Bad', hint: 'still counted', token: 'var(--tn-bad, #c25d63)' },
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

const isCompletedOccurrence = (status: TodoOccurrenceStatus) => status === 'done' || status === 'minimum';

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
 const [selectedGoalKey, setSelectedGoalKey] = useState<string>('focus');

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

 const completedCount = occurrences.filter((item) => isCompletedOccurrence(item.status)).length;
 const selectedGroup = groups.find((group) => group.key === selectedGoalKey) ?? null;
 const focusGroups = useMemo(
 () => groups
 .map((group) => ({ ...group, todos: group.todos.filter((item) => item.is_focus) }))
 .filter((group) => group.todos.length > 0),
 [groups]
 );
 const focusedOccurrences = focusGroups.flatMap((group) => group.todos);
 const focusedCompletedCount = focusedOccurrences.filter((item) => isCompletedOccurrence(item.status)).length;

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

 const updateOccurrenceStatus = async (occurrence: TodoOccurrenceItem, nextStatus: TodoOccurrenceStatus) => {
 const previous = occurrences;
 setBusyOccurrenceId(occurrence.id);
 setOccurrences((current) =>
 current.map((item) => (
 item.id === occurrence.id
 ? { ...item, status: nextStatus, completed_at: isCompletedOccurrence(nextStatus) ? new Date().toISOString() : null }
 : item
 ))
 );
 try {
 const updated = await todoOccurrencesApi.update({ id: occurrence.id, status: nextStatus });
 setOccurrences((current) => current.map((item) => (item.id === updated.id ? updated : item)));
 void useTodoStreaks.getState().hydrate(true).catch(() => undefined);
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

 const toggleOccurrence = (occurrence: TodoOccurrenceItem) => {
 const nextStatus: TodoOccurrenceStatus = isCompletedOccurrence(occurrence.status) ? 'open' : 'done';
 void updateOccurrenceStatus(occurrence, nextStatus);
 };

 const toggleOccurrenceFocus = async (occurrence: TodoOccurrenceItem) => {
 const previous = occurrences;
 const isFocus = !occurrence.is_focus;
 setBusyOccurrenceId(occurrence.id);
 setOccurrences((current) => current.map((item) => (item.id === occurrence.id ? { ...item, is_focus: isFocus } : item)));
 try {
 const updated = await todoOccurrencesApi.update({ id: occurrence.id, is_focus: isFocus });
 setOccurrences((current) => current.map((item) => (item.id === updated.id ? updated : item)));
 } catch (error) {
 setOccurrences(previous);
 console.error('Failed to update routine focus:', error);
 toast.error('Failed to update routine focus');
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
 <section className="mb-4">
 <div className="mb-5">
 <div className="mb-2 flex items-center justify-between gap-3">
 <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
 Day status
 </div>
 <div className="text-xs text-muted-foreground dark:text-muted-foreground" aria-live="polite">
 {savedAt ? `Saved ${savedAt}` : isDirty ? 'Unsaved' : null}
 </div>
 </div>
 <div className="grid grid-cols-3 gap-2" role="group" aria-label="Day status">
 {dayStatusOptions.map((option) => {
 const selected = draft.color === option.value;
 return (
 <button
 key={option.value}
 type="button"
 onClick={() => chooseColor(option.value)}
 disabled={loading || savingLog}
 aria-pressed={selected}
 className="h-11 min-w-0 rounded-xl border px-2 text-center transition-transform active:scale-[0.98] disabled:opacity-60 sm:h-auto sm:min-h-12 sm:px-3 sm:py-2"
 style={{
 borderColor: selected ? option.token : `color-mix(in srgb, ${option.token} 20%, transparent)`,
 background: selected
 ? `color-mix(in srgb, ${option.token} 18%, var(--tn-card))`
 : `color-mix(in srgb, ${option.token} 7%, var(--tn-card))`,
 color: selected ? option.token : 'var(--tn-fg)',
 boxShadow: selected ? `inset 0 0 0 1px ${option.token}` : 'none',
 }}
 >
 <span className="flex items-center justify-center gap-1.5 truncate text-xs font-semibold sm:text-sm">
 <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: option.token }} aria-hidden="true" />
 {option.label}
 </span>
 <span className="hidden text-[11px] text-muted-foreground dark:text-muted-foreground sm:block">{option.hint}</span>
 </button>
 );
 })}
 </div>
 </div>

 <div className="mb-4">
 <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
 <div>
 <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
 Routines &amp; metrics
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
 <>
 <div
 className="mb-3 flex gap-2 overflow-x-auto pb-1"
 aria-label="Filter routines and metrics by goal"
 >
 <GoalScopeTab
 active={selectedGoalKey === 'focus'}
 label="Focus"
 detail={`${focusedCompletedCount}/${focusedOccurrences.length}`}
 onClick={() => setSelectedGoalKey('focus')}
 />
 <GoalScopeTab
 active={selectedGoalKey === 'all'}
 label="All"
 detail={`${completedCount}/${occurrences.length}`}
 onClick={() => setSelectedGoalKey('all')}
 />
 {groups.map((group) => (
 <GoalScopeTab
 key={group.key}
 active={selectedGoalKey === group.key}
 label={group.title}
 detail={`${group.todos.filter((item) => isCompletedOccurrence(item.status)).length}/${group.todos.length}`}
 onClick={() => setSelectedGoalKey(group.key)}
 />
 ))}
 </div>

 {selectedGoalKey === 'focus' ? (
 focusGroups.length > 0 ? (
 <div className="space-y-3">
 {focusGroups.map((group) => (
 <GoalTodayCard
 key={group.key}
 group={{ ...group, metrics: [] }}
 busyOccurrenceId={busyOccurrenceId}
 savingMetricId={savingMetricId}
 onToggleOccurrence={toggleOccurrence}
 onOccurrenceStatusChange={updateOccurrenceStatus}
 onToggleFocus={toggleOccurrenceFocus}
 onMetricChange={setMetricValue}
 onMetricBlur={saveMetric}
 onBooleanMetricToggle={toggleBooleanMetric}
 />
 ))}
 </div>
 ) : (
 <div className="rounded-2xl border p-4 text-sm" style={{ border: 'var(--tn-line)', background: 'var(--tn-card)', color: 'var(--tn-fg-muted)' }}>
 <p className="font-semibold" style={{ color: 'var(--tn-fg)' }}>No routines in focus yet</p>
 <p className="mt-1">Open a goal and use the star beside a routine to add it here for today.</p>
 </div>
 )
 ) : selectedGoalKey === 'all' ? (
 <div className="grid gap-2 md:grid-cols-2">
 {groups.map((group) => (
 <GoalTodayOverviewCard
 key={group.key}
 group={group}
 onSelect={() => setSelectedGoalKey(group.key)}
 />
 ))}
 </div>
 ) : selectedGroup ? (
 <GoalTodayCard
 group={selectedGroup}
 busyOccurrenceId={busyOccurrenceId}
 savingMetricId={savingMetricId}
 onToggleOccurrence={toggleOccurrence}
 onOccurrenceStatusChange={updateOccurrenceStatus}
 onToggleFocus={toggleOccurrenceFocus}
 onMetricChange={setMetricValue}
 onMetricBlur={saveMetric}
 onBooleanMetricToggle={toggleBooleanMetric}
 />
 ) : null}
 </>
 ) : (
 <div className="py-3">
 <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
 <Target className="h-4 w-4" />
 No active goal routines yet
 </div>
 <p className="mb-3 text-sm text-muted-foreground dark:text-muted-foreground">
 Create a goal, add recurring todos/metrics to an active task, or use Daily Draft for today&apos;s scratch plan.
 </p>
 <div>
 <Link href="/goal" className="btn btn-primary !px-3 !py-2 text-xs">
 <Plus className="h-4 w-4" />
 <span>Create goal</span>
 </Link>
 </div>
 </div>
 )}
 </div>

 <div className="flex justify-end border-t pt-3" style={{ borderColor: 'color-mix(in srgb, var(--tn-fg-muted) 16%, transparent)' }}>
 <button
 type="button"
 onClick={() => setEndDayOpen(true)}
 disabled={loading}
 className="btn btn-primary w-full !px-4 !py-2.5 text-sm disabled:opacity-50 sm:w-auto"
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
 onOccurrenceStatusChange: (occurrence: TodoOccurrenceItem, status: TodoOccurrenceStatus) => void;
 onToggleFocus: (occurrence: TodoOccurrenceItem) => void;
 onMetricChange: (metricId: string, value: string) => void;
 onMetricBlur: (metric: TodayMetricItem, rawValue: string) => void;
 onBooleanMetricToggle: (metric: TodayMetricItem) => void;
}

const GoalScopeTab: React.FC<{
 active: boolean;
 label: string;
 detail: string;
 onClick: () => void;
}> = ({ active, label, detail, onClick }) => (
 <button
 type="button"
 onClick={onClick}
 className="flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-colors"
 style={{
 border: active ? 'var(--tn-line)' : '1px solid color-mix(in srgb, var(--tn-fg-muted) 30%, transparent)',
 background: active ? 'var(--tn-active)' : 'var(--tn-card)',
 color: 'var(--tn-fg)',
 boxShadow: active ? 'var(--tn-shadow)' : undefined,
 }}
 >
 <span className="max-w-36 truncate font-semibold">{label}</span>
 <span
 className="rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
 style={{
 background: active ? 'var(--tn-accent)' : 'var(--tn-hover)',
 color: active ? 'var(--tn-on-accent, var(--tn-fg))' : 'var(--tn-fg-muted)',
 }}
 >
 {detail}
 </span>
 </button>
);

const GoalTodayOverviewCard: React.FC<{
 group: TodayGroup;
 onSelect: () => void;
}> = ({ group, onSelect }) => {
 const completed = group.todos.filter((item) => isCompletedOccurrence(item.status)).length;
 const total = group.todos.length;
 const percent = total > 0 ? (completed / total) * 100 : 0;

 return (
 <button
 type="button"
 onClick={onSelect}
 className="rounded-2xl border p-3 text-left transition-transform hover:-translate-y-0.5"
 style={{ border: 'var(--tn-line)', background: 'var(--tn-card)', color: 'var(--tn-fg)' }}
 >
 <div className="mb-2 flex items-start justify-between gap-3">
 <div className="min-w-0">
 <span className="block truncate text-sm font-semibold">{group.title}</span>
 <span className="text-xs text-muted-foreground dark:text-muted-foreground">
 {total} routine{total === 1 ? '' : 's'} · {group.metrics.length} metric{group.metrics.length === 1 ? '' : 's'}
 </span>
 </div>
 <span className="shrink-0 text-sm font-semibold">{completed}/{total}</span>
 </div>
 <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--tn-bar-bg, var(--tn-hover))' }}>
 <div className="h-full rounded-full" style={{ width: `${percent}%`, background: 'var(--tn-good, var(--tn-accent))' }} />
 </div>
 </button>
 );
};

const GoalTodayCard: React.FC<GoalTodayCardProps> = ({
 group,
 busyOccurrenceId,
 savingMetricId,
 onToggleOccurrence,
 onOccurrenceStatusChange,
 onToggleFocus,
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
 const done = isCompletedOccurrence(occurrence.status);
 return (
 <div
 key={occurrence.id}
 className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-2 rounded-xl px-2 py-2 transition-colors sm:flex sm:items-center"
 style={{
 background: done ? 'color-mix(in srgb, var(--tn-good, #2f7d50) 10%, var(--tn-card))' : 'var(--tn-hover)',
 }}
 >
 <button
 type="button"
 onClick={() => onToggleOccurrence(occurrence)}
 disabled={busyOccurrenceId === occurrence.id}
 className="col-span-2 flex min-w-0 items-start gap-2 text-left disabled:opacity-60 sm:flex-1"
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
 <button
 type="button"
 onClick={() => onToggleFocus(occurrence)}
 disabled={busyOccurrenceId === occurrence.id}
 aria-label={occurrence.is_focus ? `Remove ${occurrence.todo_title} from focus` : `Add ${occurrence.todo_title} to focus`}
 title={occurrence.is_focus ? 'Remove from focus' : 'Add to focus'}
 className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg disabled:opacity-60"
 style={{
 background: occurrence.is_focus ? 'var(--tn-accent)' : 'var(--tn-card)',
 color: occurrence.is_focus ? 'var(--tn-on-accent, var(--tn-fg))' : 'var(--tn-fg-muted)',
 border: occurrence.is_focus ? 'var(--tn-line)' : '1px solid color-mix(in srgb, var(--tn-fg-muted) 30%, transparent)',
 }}
 >
 <Star className="h-4 w-4" fill={occurrence.is_focus ? 'currentColor' : 'none'} />
 </button>
 <select
 aria-label={`Status for ${occurrence.todo_title}`}
 value={occurrence.status}
 onChange={(event) => void onOccurrenceStatusChange(occurrence, event.target.value as TodoOccurrenceStatus)}
 disabled={busyOccurrenceId === occurrence.id}
 className="min-w-0 w-full rounded-lg border px-2 py-1 text-xs font-medium outline-none disabled:opacity-60 sm:w-auto sm:shrink-0"
 style={{
 border: 'var(--tn-line)',
 background: 'var(--tn-card)',
 color: 'var(--tn-fg)',
 }}
 >
 <option value="open">Open</option>
 <option value="done">Done</option>
 <option value="minimum">Minimum</option>
 <option value="skipped">Skip today</option>
 <option value="excused">Excused</option>
 </select>
 </div>
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
