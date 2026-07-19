'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Gauge, Plus, Trash2 } from 'lucide-react';
import { AuthRequiredError, MetricDefinitionItem, MetricInputType, metricDefinitionsApi } from '@/lib/api';
import { toast } from '@/store/useToast';

interface GoalMetricsPanelProps {
 goalId: string;
}

const inputTypes: Array<{ value: MetricInputType; label: string }> = [
 { value: 'number', label: 'Number' },
 { value: 'text', label: 'Text' },
 { value: 'boolean', label: 'Yes/No' },
];

export const GoalMetricsPanel: React.FC<GoalMetricsPanelProps> = ({ goalId }) => {
 const [metrics, setMetrics] = useState<MetricDefinitionItem[]>([]);
 const [name, setName] = useState('');
 const [unit, setUnit] = useState('');
 const [inputType, setInputType] = useState<MetricInputType>('number');
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [busyId, setBusyId] = useState<string | null>(null);

 useEffect(() => {
 let cancelled = false;
 const load = async () => {
 try {
 const rows = await metricDefinitionsApi.getAll();
 if (!cancelled) setMetrics(rows.filter((metric) => metric.goal_id === goalId && !metric.milestone_id && !metric.task_id));
 } catch (error) {
 if (error instanceof AuthRequiredError) return;
 console.error('Failed to load goal metrics:', error);
 if (!cancelled) toast.error('Failed to load metrics');
 } finally {
 if (!cancelled) setLoading(false);
 }
 };
 void load();
 return () => {
 cancelled = true;
 };
 }, [goalId]);

 const visibleCount = useMemo(() => metrics.filter((metric) => metric.show_on_today).length, [metrics]);

 const addMetric = async (event: React.FormEvent) => {
 event.preventDefault();
 const title = name.trim();
 if (!title || saving) return;
 setSaving(true);
 try {
 const created = await metricDefinitionsApi.create({
 name: title,
 unit: unit.trim() || null,
 input_type: inputType,
 show_on_today: true,
 goal_id: goalId,
 });
 setMetrics((current) => [...current, created].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)));
 setName('');
 setUnit('');
 setInputType('number');
 toast.success('Metric added to Today');
 } catch (error) {
 console.error('Failed to create metric:', error);
 toast.error('Failed to create metric');
 } finally {
 setSaving(false);
 }
 };

 const toggleToday = async (metric: MetricDefinitionItem) => {
 setBusyId(metric.id);
 const previous = metrics;
 setMetrics((current) =>
 current.map((item) => (item.id === metric.id ? { ...item, show_on_today: !item.show_on_today } : item))
 );
 try {
 const updated = await metricDefinitionsApi.update({ id: metric.id, show_on_today: !metric.show_on_today });
 setMetrics((current) => current.map((item) => (item.id === updated.id ? updated : item)));
 } catch (error) {
 setMetrics(previous);
 console.error('Failed to update metric:', error);
 toast.error('Failed to update metric');
 } finally {
 setBusyId(null);
 }
 };

 const deleteMetric = async (metric: MetricDefinitionItem) => {
 setBusyId(metric.id);
 const previous = metrics;
 setMetrics((current) => current.filter((item) => item.id !== metric.id));
 try {
 await metricDefinitionsApi.delete(metric.id);
 toast.success('Metric removed');
 } catch (error) {
 setMetrics(previous);
 console.error('Failed to delete metric:', error);
 toast.error('Failed to delete metric');
 } finally {
 setBusyId(null);
 }
 };

 return (
 <section
 className="mb-6 rounded-2xl border p-4"
 style={{ border: 'var(--tn-line)', background: 'var(--tn-card)' }}
 >
 <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
 <div className="flex items-start gap-2">
 <span
 className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl"
 style={{ background: 'var(--tn-hover)', color: 'var(--tn-accent)' }}
 >
 <Gauge className="h-4 w-4" />
 </span>
 <div>
 <h3 className="text-sm font-semibold text-foreground">Today metrics</h3>
 <p className="text-xs text-muted-foreground dark:text-muted-foreground">
 Metrics linked to this goal. Enabled metrics show in Today dashboard.
 </p>
 </div>
 </div>
 <span className="text-xs text-muted-foreground dark:text-muted-foreground">
 {visibleCount} visible today
 </span>
 </div>

 <form
 onSubmit={addMetric}
 className="mb-3 grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(110px,140px)_minmax(120px,140px)_auto]"
 >
 <input
 value={name}
 onChange={(event) => setName(event.target.value)}
 placeholder="Metric name, e.g. Protein"
 className="filter-input min-w-0 sm:col-span-2 xl:col-span-1"
 />
 <input
 value={unit}
 onChange={(event) => setUnit(event.target.value)}
 placeholder="Unit"
 className="filter-input min-w-0"
 />
 <select
 value={inputType}
 onChange={(event) => setInputType(event.target.value as MetricInputType)}
 className="filter-input min-w-0"
 >
 {inputTypes.map((type) => (
 <option key={type.value} value={type.value}>
 {type.label}
 </option>
 ))}
 </select>
 <button
 type="submit"
 disabled={!name.trim() || saving}
 className="btn btn-primary w-full min-w-0 justify-center disabled:opacity-50 sm:col-span-2 xl:col-span-1 xl:w-auto"
 >
 <Plus className="h-4 w-4" />
 <span>{saving ? 'Adding…' : 'Add'}</span>
 </button>
 </form>

 {loading ? (
 <p className="text-xs text-muted-foreground dark:text-muted-foreground">Loading metrics…</p>
 ) : metrics.length > 0 ? (
 <div className="flex flex-wrap gap-2">
 {metrics.map((metric) => (
 <div
 key={metric.id}
 className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
 style={{
 border: 'var(--tn-line)',
 background: metric.show_on_today
 ? 'color-mix(in srgb, var(--tn-accent) 10%, var(--tn-card))'
 : 'var(--tn-hover)',
 color: 'var(--tn-fg)',
 }}
 >
 <button
 type="button"
 onClick={() => toggleToday(metric)}
 disabled={busyId === metric.id}
 className="font-medium disabled:opacity-50"
 title={metric.show_on_today ? 'Hide from Today' : 'Show on Today'}
 >
 {metric.name}{metric.unit ? ` · ${metric.unit}` : ''}
 </button>
 <button
 type="button"
 onClick={() => deleteMetric(metric)}
 disabled={busyId === metric.id}
 className="text-muted-foreground hover:text-red-500 disabled:opacity-50"
 title="Delete metric"
 aria-label={`Delete metric ${metric.name}`}
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-xs text-muted-foreground dark:text-muted-foreground">
 No metrics yet. Add only what this goal needs; Today will stay clean.
 </p>
 )}
 </section>
 );
};
