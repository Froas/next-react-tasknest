'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { withAuth } from '@/hoc/withAuth';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import {
 buildCalendarItems,
 type CalendarItem,
 type CalendarItemType,
} from '@/lib/calendarItems';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TYPE_COLOR: Record<CalendarItemType, string> = {
 Goal: 'var(--tn-warm)',
 Milestone: 'var(--tn-plum)',
 Task: 'var(--tn-slate)',
 Todo: 'var(--tn-moss)',
 Event: 'var(--tn-accent)',
};

function sameDay(a: Date, b: Date): boolean {
 return (
 a.getFullYear() === b.getFullYear() &&
 a.getMonth() === b.getMonth() &&
 a.getDate() === b.getDate()
 );
}

// CalendarItem (from src/lib/calendarItems.ts) carries `due_date: string`
// and `itemType: CalendarItemType`. Helper that pulls a Date out and
// preserves the typing union so the rest of the file stays simple.
interface PositionedItem {
 raw: CalendarItem;
 date: Date;
 type: CalendarItemType;
 subtitle?: string;
}

const CalendarPage: React.FC = () => {
 const goals = useStore((s) => s.goals);
 const todos = useStore((s) => s.todos);
 const tasks = useStore((s) => s.tasks);
 const events = useStore((s) => s.events);
 const isLoading = useStore(
 (s) =>
 s.isLoadingTodos ||
 s.isLoadingTasks ||
 s.isLoadingEvents ||
 s.isLoadingGoals,
 );
 const { fetchGoals, fetchTodos, fetchTasks, fetchEvents } = useStore(
 useShallow((s) => ({
 fetchGoals: s.fetchGoals,
 fetchTodos: s.fetchTodos,
 fetchTasks: s.fetchTasks,
 fetchEvents: s.fetchEvents,
 })),
 );

 const [view, setView] = useState<'month' | 'week'>('month');
 const [cursor, setCursor] = useState(() => new Date());
 const [selected, setSelected] = useState<Date | null>(null);

 useEffect(() => {
 fetchGoals();
 fetchTodos();
 fetchTasks();
 fetchEvents();
 }, [fetchGoals, fetchTodos, fetchTasks, fetchEvents]);

 // All calendar items derived from real store data.
 const allItems: PositionedItem[] = useMemo(() => {
 const raws = buildCalendarItems(goals, tasks, todos, events);
 return raws
 .map<PositionedItem | null>((raw) => {
 const d = raw.due_date ? new Date(raw.due_date) : null;
 if (!d || Number.isNaN(d.getTime())) return null;
 const subtitleParts = [raw.goalTitle, raw.milestoneTitle, raw.taskTitle].filter(
 Boolean,
 );
 return {
 raw,
 date: d,
 type: raw.itemType,
 subtitle: subtitleParts.length > 0 ? subtitleParts.join(' · ') : undefined,
 };
 })
 .filter((x): x is PositionedItem => x !== null);
 }, [goals, todos, tasks, events]);

 // Items in the currently-visible month (used for the eyebrow count).
 const monthItems = useMemo(
 () =>
 allItems.filter(
 (it) =>
 it.date.getFullYear() === cursor.getFullYear() &&
 it.date.getMonth() === cursor.getMonth(),
 ),
 [allItems, cursor],
 );

 // Build month grid (Monday-first).
 const monthCells = useMemo(() => {
 const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
 const startOffset = (first.getDay() + 6) % 7;
 const daysInMonth = new Date(
 cursor.getFullYear(),
 cursor.getMonth() + 1,
 0,
 ).getDate();
 const out: (Date | null)[] = [];
 for (let i = 0; i < startOffset; i++) out.push(null);
 for (let i = 1; i <= daysInMonth; i++)
 out.push(new Date(cursor.getFullYear(), cursor.getMonth(), i));
 while (out.length % 7) out.push(null);
 return out;
 }, [cursor]);

 // Week grid (Monday-first, contains cursor).
 const weekCells = useMemo(() => {
 const offset = (cursor.getDay() + 6) % 7;
 const monday = new Date(cursor);
 monday.setDate(cursor.getDate() - offset);
 return Array.from({ length: 7 }, (_, i) => {
 const d = new Date(monday);
 d.setDate(monday.getDate() + i);
 return d;
 });
 }, [cursor]);

 const itemsFor = (day: Date) =>
 allItems.filter((it) => sameDay(it.date, day));

 const today = new Date();
 const headerLabel =
 view === 'month'
 ? cursor.toLocaleString('en-US', { month: 'long', year: 'numeric' })
 : `Week of ${weekCells[0].toLocaleDateString('en-US', {
 month: 'short',
 day: 'numeric',
 })}`;

 function nav(delta: number) {
 if (view === 'month') {
 setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
 } else {
 const next = new Date(cursor);
 next.setDate(cursor.getDate() + delta * 7);
 setCursor(next);
 }
 }

 const selectedItems = selected ? itemsFor(selected) : [];
 const cells = view === 'month' ? monthCells : weekCells;

 return (
 <div className="page">
 <div className="page-head">
 <div className="page-eyebrow">
 {isLoading
 ? 'Loading…'
 : `${monthItems.length} item${monthItems.length === 1 ? '' : 's'} this month`}
 </div>
 <h1 className="page-title">Calendar</h1>
 <p className="page-lede">
 Goals, milestones, tasks, todos and events together. Click a day to
 focus.
 </p>
 </div>

 <div className="section">
 <div
 style={{
 display: 'flex',
 alignItems: 'center',
 marginBottom: 18,
 gap: 10,
 flexWrap: 'wrap',
 }}
 >
 <button
 className="btn btn-secondary"
 onClick={() => nav(-1)}
 aria-label="Previous"
 >
 ←
 </button>
 <h2
 style={{
 fontSize: 20,
 fontWeight: 600,
 minWidth: 220,
 fontFamily: 'var(--tn-font-display, var(--tn-font-sans))',
 }}
 >
 {headerLabel}
 </h2>
 <button
 className="btn btn-secondary"
 onClick={() => nav(1)}
 aria-label="Next"
 >
 →
 </button>
 <button className="btn btn-ghost" onClick={() => setCursor(new Date())}>
 Today
 </button>
 <div style={{ flex: 1 }} />
 <button
 className={`btn ${view === 'month' ? 'btn-primary' : 'btn-secondary'}`}
 onClick={() => setView('month')}
 >
 Month
 </button>
 <button
 className={`btn ${view === 'week' ? 'btn-primary' : 'btn-secondary'}`}
 onClick={() => setView('week')}
 >
 Week
 </button>
 </div>

 <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
 <div
 style={{
 display: 'grid',
 gridTemplateColumns: 'repeat(7, 1fr)',
 }}
 >
 {WEEKDAY_LABELS.map((w) => (
 <div
 key={w}
 style={{
 padding: '10px 12px',
 fontSize: 11,
 fontWeight: 500,
 color: 'var(--tn-fg-muted)',
 letterSpacing: '0.06em',
 textTransform: 'uppercase',
 borderBottom: 'var(--tn-line)',
 borderRight: 'var(--tn-line)',
 }}
 >
 {w}
 </div>
 ))}
 {cells.map((d, i) => {
 const minHeight = view === 'month' ? 96 : 220;
 if (!d) {
 return (
 <div
 key={i}
 style={{
 minHeight,
 borderBottom: 'var(--tn-line)',
 borderRight: 'var(--tn-line)',
 }}
 />
 );
 }
 const items = itemsFor(d);
 const isToday = sameDay(d, today);
 const isSelected = selected !== null && sameDay(d, selected);
 const max = view === 'month' ? 3 : 8;
 return (
 <div
 key={i}
 onClick={() => setSelected(d)}
 style={{
 minHeight,
 padding: '8px 10px',
 borderBottom: 'var(--tn-line)',
 borderRight: 'var(--tn-line)',
 cursor: 'pointer',
 background: isSelected
 ? 'var(--tn-active)'
 : isToday
 ? 'var(--tn-hover)'
 : 'transparent',
 }}
 >
 <div
 style={{
 fontSize: 12,
 fontWeight: isToday ? 700 : 500,
 color: isToday
 ? 'var(--tn-accent)'
 : 'var(--tn-fg-muted)',
 marginBottom: 6,
 fontVariantNumeric: 'tabular-nums',
 }}
 >
 {d.getDate()}
 </div>
 {items.slice(0, max).map((it, j) => (
 <div
 key={j}
 style={{
 fontSize: 11,
 padding: '2px 6px',
 borderRadius: 3,
 background: 'var(--tn-chip)',
 marginBottom: 2,
 overflow: 'hidden',
 textOverflow: 'ellipsis',
 whiteSpace: 'nowrap',
 borderLeft: `3px solid ${TYPE_COLOR[it.type]}`,
 }}
 title={`${it.type}: ${it.raw.title}`}
 >
 {it.raw.title}
 </div>
 ))}
 {items.length > max && (
 <div
 style={{
 fontSize: 10,
 color: 'var(--tn-fg-muted)',
 marginTop: 2,
 }}
 >
 +{items.length - max} more
 </div>
 )}
 </div>
 );
 })}
 </div>
 </div>

 {/* Legend */}
 <div
 style={{
 display: 'flex',
 gap: 16,
 marginTop: 14,
 flexWrap: 'wrap',
 fontSize: 12,
 color: 'var(--tn-fg-muted)',
 }}
 >
 {(Object.keys(TYPE_COLOR) as CalendarItemType[]).map((t) => (
 <div
 key={t}
 style={{ display: 'flex', alignItems: 'center', gap: 6 }}
 >
 <span
 style={{
 width: 10,
 height: 10,
 borderRadius: 2,
 background: TYPE_COLOR[t],
 }}
 />
 {t}
 </div>
 ))}
 </div>
 </div>

 {/* Selected-day drilldown */}
 {selected && (
 <div className="section">
 <div className="section-head">
 <h2>
 {selected.toLocaleDateString('en-US', {
 weekday: 'long',
 month: 'long',
 day: 'numeric',
 })}
 </h2>
 <span className="count">
 {selectedItems.length} item
 {selectedItems.length === 1 ? '' : 's'}
 </span>
 <div className="spacer" />
 <button
 className="btn btn-ghost"
 onClick={() => setSelected(null)}
 >
 Close
 </button>
 </div>
 {selectedItems.length === 0 ? (
 <div
 className="card"
 style={{
 textAlign: 'center',
 color: 'var(--tn-fg-muted)',
 padding: 32,
 }}
 >
 Nothing scheduled for this day.
 </div>
 ) : (
 <div className="card" style={{ padding: 0 }}>
 {selectedItems.map((it, i) => (
 <div
 key={`${it.type}-${it.raw.id}-${i}`}
 style={{
 padding: '14px 20px',
 borderBottom:
 i < selectedItems.length - 1
 ? 'var(--tn-line)'
 : 'none',
 display: 'grid',
 gridTemplateColumns: '90px 1fr auto',
 gap: 12,
 alignItems: 'center',
 }}
 >
 <span
 style={{
 fontSize: 10,
 padding: '3px 8px',
 background: TYPE_COLOR[it.type],
 color: 'white',
 borderRadius: 4,
 fontWeight: 600,
 letterSpacing: '0.04em',
 textAlign: 'center',
 textTransform: 'uppercase',
 }}
 >
 {it.type}
 </span>
 <div>
 <b style={{ fontSize: 14, fontWeight: 500 }}>{it.raw.title}</b>
 {it.subtitle && (
 <div
 style={{
 fontSize: 12,
 color: 'var(--tn-fg-muted)',
 marginTop: 2,
 }}
 >
 {it.subtitle}
 </div>
 )}
 </div>
 <span
 style={{
 fontSize: 12,
 color: 'var(--tn-fg-muted)',
 fontVariantNumeric: 'tabular-nums',
 }}
 >
 {it.date.toLocaleTimeString('en-US', {
 hour: '2-digit',
 minute: '2-digit',
 })}
 </span>
 </div>
 ))}
 </div>
 )}
 </div>
 )}
 </div>
 );
};

export default withAuth(CalendarPage);
