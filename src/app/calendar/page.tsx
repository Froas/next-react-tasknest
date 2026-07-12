'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { withAuth } from '@/hoc/withAuth';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import {
 buildCalendarItems,
 calendarItemHref,
 parseCalendarDate,
 type CalendarItem,
 type CalendarItemType,
} from '@/lib/calendarItems';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_GRID_START_HOUR = 0;
const TIME_GRID_END_HOUR = 24;
const TIME_SLOT_HEIGHT = 56;

const TYPE_COLOR: Record<CalendarItemType, string> = {
 Goal: 'var(--tn-warm)',
 Milestone: 'var(--tn-plum)',
 Task: 'var(--tn-slate)',
 Todo: 'var(--tn-moss)',
 Subtask: 'var(--tn-warn)',
 Event: 'var(--tn-accent)',
};

function sameDay(a: Date, b: Date): boolean {
 return (
 a.getFullYear() === b.getFullYear() &&
 a.getMonth() === b.getMonth() &&
 a.getDate() === b.getDate()
 );
}

function hasExplicitTime(value: string): boolean {
 if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
 if (/T00:00(?::00(?:\.000)?)?(?:Z|[+-]\d{2}:?\d{2})?$/.test(value)) return false;
 const date = parseCalendarDate(value);
 return date.getHours() !== 0 || date.getMinutes() !== 0;
}

function formatClock(date: Date): string {
 return date.toLocaleTimeString('en-US', {
 hour: 'numeric',
 minute: '2-digit',
 });
}

function formatHour(hour: number): string {
 return new Date(2026, 0, 1, hour).toLocaleTimeString('en-US', {
 hour: 'numeric',
 });
}

// CalendarItem (from src/lib/calendarItems.ts) carries `due_date: string`
// and `itemType: CalendarItemType`. Helper that pulls a Date out and
// preserves the typing union so the rest of the file stays simple.
interface PositionedItem {
 raw: CalendarItem;
 date: Date;
 endDate?: Date;
 hasTime: boolean;
 type: CalendarItemType;
 subtitle?: string;
}

function formatItemTime(item: PositionedItem): string {
 if (!item.hasTime) return 'All day';
 if (item.endDate && sameDay(item.date, item.endDate) && item.endDate > item.date) {
 return `${formatClock(item.date)}–${formatClock(item.endDate)}`;
 }
 return formatClock(item.date);
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
 const d = raw.due_date ? parseCalendarDate(raw.due_date) : null;
 if (!d || Number.isNaN(d.getTime())) return null;
 const endDate = raw.end_date ? parseCalendarDate(raw.end_date) : undefined;
 const subtitleParts = [raw.goalTitle, raw.milestoneTitle, raw.taskTitle].filter(
 Boolean,
 );
 return {
 raw,
 date: d,
 endDate: endDate && !Number.isNaN(endDate.getTime()) ? endDate : undefined,
 hasTime: hasExplicitTime(raw.due_date),
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
 allItems
 .filter((it) => sameDay(it.date, day))
 .sort((a, b) => {
 if (a.hasTime !== b.hasTime) return a.hasTime ? 1 : -1;
 if (a.date.getTime() === b.date.getTime() && a.type !== b.type) {
 if (a.type === 'Event') return -1;
 if (b.type === 'Event') return 1;
 }
 return a.date.getTime() - b.date.getTime();
 });

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
 <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
 <div className="flex flex-wrap items-center gap-2 sm:gap-3">
 <button
 className="btn btn-secondary justify-center"
 style={{ minWidth: 44 }}
 onClick={() => nav(-1)}
 aria-label="Previous"
 >
 ←
 </button>
 <h2
 className="min-w-0 px-1 text-xl font-semibold"
 style={{
 fontFamily: 'var(--tn-font-display, var(--tn-font-sans))',
 }}
 >
 {headerLabel}
 </h2>
 <button
 className="btn btn-secondary justify-center"
 style={{ minWidth: 44 }}
 onClick={() => nav(1)}
 aria-label="Next"
 >
 →
 </button>
 <button className="btn btn-ghost" onClick={() => setCursor(new Date())}>
 Today
 </button>
 </div>
 <div className="flex flex-wrap items-center gap-2">
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
 </div>

 {view === 'month' ? (
 <MonthGrid
 cells={monthCells}
 today={today}
 selected={selected}
 setSelected={setSelected}
 itemsFor={itemsFor}
 />
 ) : (
 <WeekTimeGrid
 days={weekCells}
 today={today}
 selected={selected}
 setSelected={setSelected}
 itemsFor={itemsFor}
 />
 )}

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
 <Link
 key={`${it.type}-${it.raw.id}-${i}`}
 href={calendarItemHref(it.raw)}
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
 color: 'inherit',
 textDecoration: 'none',
 }}
 title={`Open ${it.type.toLowerCase()}: ${it.raw.title}`}
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
 {formatItemTime(it)}
 </span>
 </Link>
 ))}
 </div>
 )}
 </div>
 )}
 </div>
 );
};

interface CalendarGridProps {
 today: Date;
 selected: Date | null;
 setSelected: (date: Date) => void;
 itemsFor: (day: Date) => PositionedItem[];
}

interface MonthGridProps extends CalendarGridProps {
 cells: (Date | null)[];
}

const MonthGrid: React.FC<MonthGridProps> = ({ cells, today, selected, setSelected, itemsFor }) => (
 <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
 <div
 style={{
 display: 'grid',
 gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
 }}
 >
 {WEEKDAY_LABELS.map((weekday) => (
 <div
 key={weekday}
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
 {weekday}
 </div>
 ))}
 {cells.map((day, index) => {
 if (!day) {
 return (
 <div
 key={index}
 style={{
 minHeight: 96,
 borderBottom: 'var(--tn-line)',
 borderRight: 'var(--tn-line)',
 }}
 />
 );
 }
 const items = itemsFor(day);
 const isToday = sameDay(day, today);
 const isSelected = selected !== null && sameDay(day, selected);
 const max = 3;
 return (
 <div
 key={index}
 onClick={() => setSelected(day)}
 style={{
 minHeight: 96,
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
 {day.getDate()}
 </div>
 {items.slice(0, max).map((item, itemIndex) => (
 <div
 key={itemIndex}
 style={{
 fontSize: 11,
 padding: '2px 6px',
 borderRadius: 3,
 background: 'var(--tn-chip)',
 marginBottom: 2,
 overflow: 'hidden',
 textOverflow: 'ellipsis',
 whiteSpace: 'nowrap',
 borderLeft: `3px solid ${TYPE_COLOR[item.type]}`,
 }}
 title={`${item.type}: ${item.raw.title} · ${formatItemTime(item)}`}
 >
 {item.hasTime && (
 <span style={{ color: 'var(--tn-fg-muted)', marginRight: 4 }}>{formatClock(item.date)}</span>
 )}
 {item.raw.title}
 </div>
 ))}
 {items.length > max && (
 <button
 type="button"
 onClick={(event) => {
 event.stopPropagation();
 setSelected(day);
 }}
 style={{
 fontSize: 10,
 color: 'var(--tn-fg-muted)',
 marginTop: 2,
 border: 0,
 background: 'transparent',
 padding: 0,
 cursor: 'pointer',
 textDecoration: 'underline',
 }}
 title={`Show all ${items.length} items for this date`}
 >
 +{items.length - max} more
 </button>
 )}
 </div>
 );
 })}
 </div>
 </div>
);

interface WeekTimeGridProps extends CalendarGridProps {
 days: Date[];
}

interface TimedLayout {
 item: PositionedItem;
 columnIndex: number;
 columnCount: number;
 stackOffset: number;
 dense: boolean;
}

const itemEndTime = (item: PositionedItem) => {
 if (item.endDate && sameDay(item.date, item.endDate) && item.endDate > item.date) {
 return item.endDate.getTime();
 }
 return item.date.getTime() + 45 * 60 * 1000;
};

const layoutTimedItems = (items: PositionedItem[]): TimedLayout[] => {
 const sorted = [...items].sort((a, b) => a.date.getTime() - b.date.getTime());
 const groups: PositionedItem[][] = [];
 let currentGroup: PositionedItem[] = [];
 let currentGroupEnd = 0;

 sorted.forEach((item) => {
 const start = item.date.getTime();
 const end = itemEndTime(item);
 if (currentGroup.length === 0 || start < currentGroupEnd) {
 currentGroup.push(item);
 currentGroupEnd = Math.max(currentGroupEnd, end);
 return;
 }
 groups.push(currentGroup);
 currentGroup = [item];
 currentGroupEnd = end;
 });
 if (currentGroup.length > 0) groups.push(currentGroup);

 return groups.flatMap<TimedLayout>((group) => {
 if (group.length > 3) {
 const denseColumns = 3;
 const prioritySorted = [...group].sort((a, b) => {
 if (a.type !== b.type) {
 if (a.type === 'Event') return -1;
 if (b.type === 'Event') return 1;
 }
 return a.date.getTime() - b.date.getTime();
 });
 return prioritySorted.map((item, index) => ({
 item,
 columnIndex: index % denseColumns,
 columnCount: denseColumns,
 stackOffset: Math.floor(index / denseColumns) * 46,
 dense: true,
 }));
 }

 const activeColumns: Array<{ column: number; end: number }> = [];
 const layouts: Array<{ item: PositionedItem; columnIndex: number }> = [];
 group.forEach((item) => {
 const start = item.date.getTime();
 for (let index = activeColumns.length - 1; index >= 0; index--) {
 if (activeColumns[index].end <= start) activeColumns.splice(index, 1);
 }
 let columnIndex = 0;
 while (activeColumns.some((column) => column.column === columnIndex)) columnIndex += 1;
 activeColumns.push({ column: columnIndex, end: itemEndTime(item) });
 layouts.push({ item, columnIndex });
 });
 const columnCount = Math.max(1, ...layouts.map((layout) => layout.columnIndex + 1));
 return layouts.map((layout) => ({ ...layout, columnCount, stackOffset: 0, dense: false }));
 });
};

const WeekTimeGrid: React.FC<WeekTimeGridProps> = ({ days, today, selected, setSelected, itemsFor }) => {
 const hourCount = TIME_GRID_END_HOUR - TIME_GRID_START_HOUR;
 const totalHeight = hourCount * TIME_SLOT_HEIGHT;
 const hours = Array.from({ length: hourCount + 1 }, (_, index) => TIME_GRID_START_HOUR + index);

 const timedPosition = (item: PositionedItem) => {
 const minutes = item.date.getHours() * 60 + item.date.getMinutes();
 const startMinutes = TIME_GRID_START_HOUR * 60;
 const endMinutes = TIME_GRID_END_HOUR * 60;
 const clamped = Math.min(Math.max(minutes, startMinutes), endMinutes - 30);
 const top = ((clamped - startMinutes) / (endMinutes - startMinutes)) * totalHeight;
 const durationMinutes = item.endDate && sameDay(item.date, item.endDate)
 ? Math.max(30, Math.round((item.endDate.getTime() - item.date.getTime()) / 60000))
 : 45;
 const height = Math.min(140, Math.max(28, (durationMinutes / 60) * TIME_SLOT_HEIGHT));
 return { top, height };
 };

 return (
 <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
 <div
 style={{
 maxHeight: 'min(78vh, 920px)',
 overflow: 'auto',
 overscrollBehavior: 'contain',
 }}
 >
 <div style={{ minWidth: 960 }}>
 <div
 style={{
 display: 'grid',
 gridTemplateColumns: '72px repeat(7, minmax(120px, 1fr))',
 borderBottom: 'var(--tn-line)',
 position: 'sticky',
 top: 0,
 zIndex: 5,
 background: 'var(--tn-card)',
 }}
 >
 <div />
 {days.map((day) => {
 const isToday = sameDay(day, today);
 const isSelected = selected !== null && sameDay(day, selected);
 return (
 <button
 key={day.toISOString()}
 type="button"
 onClick={() => setSelected(day)}
 style={{
 padding: '10px 8px',
 border: '0',
 borderLeft: 'var(--tn-line)',
 background: isSelected ? 'var(--tn-active)' : isToday ? 'var(--tn-hover)' : 'transparent',
 color: isToday ? 'var(--tn-accent)' : 'var(--tn-fg)',
 cursor: 'pointer',
 textAlign: 'center',
 }}
 >
 <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--tn-fg-muted)' }}>
 {day.toLocaleDateString('en-US', { weekday: 'short' })}
 </div>
 <div style={{ marginTop: 2, fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
 {day.getDate()}
 </div>
 </button>
 );
 })}
 </div>

 <div
 style={{
 display: 'grid',
 gridTemplateColumns: '72px repeat(7, minmax(120px, 1fr))',
 borderBottom: 'var(--tn-line)',
 position: 'sticky',
 top: 72,
 zIndex: 4,
 background: 'var(--tn-card)',
 }}
 >
 <div
 style={{
 padding: '10px 8px',
 fontSize: 11,
 fontWeight: 600,
 color: 'var(--tn-fg-muted)',
 textTransform: 'uppercase',
 }}
 >
 All-day
 </div>
 {days.map((day) => {
 const allDayItems = itemsFor(day).filter((item) => !item.hasTime);
 return (
 <div
 key={`all-day-${day.toISOString()}`}
 style={{
 minHeight: 54,
 padding: 6,
 borderLeft: 'var(--tn-line)',
 background: sameDay(day, today) ? 'color-mix(in srgb, var(--tn-accent) 5%, transparent)' : 'transparent',
 }}
 >
 {allDayItems.slice(0, 3).map((item) => (
 <button
 key={`${item.type}-${item.raw.id}`}
 type="button"
 onClick={() => setSelected(day)}
 style={{
 display: 'block',
 width: '100%',
 marginBottom: 4,
 padding: '3px 6px',
 border: '0',
 borderRadius: 6,
 borderLeft: `3px solid ${TYPE_COLOR[item.type]}`,
 background: 'var(--tn-chip)',
 color: 'var(--tn-fg)',
 cursor: 'pointer',
 fontSize: 11,
 overflow: 'hidden',
 textAlign: 'left',
 textOverflow: 'ellipsis',
 whiteSpace: 'nowrap',
 }}
 title={`${item.type}: ${item.raw.title}`}
 >
 {item.raw.title}
 </button>
 ))}
 {allDayItems.length > 3 && (
 <div style={{ fontSize: 10, color: 'var(--tn-fg-muted)' }}>+{allDayItems.length - 3} more</div>
 )}
 </div>
 );
 })}
 </div>

 <div
 style={{
 display: 'grid',
 gridTemplateColumns: '72px repeat(7, minmax(120px, 1fr))',
 }}
 >
 <div style={{ position: 'relative', height: totalHeight }}>
 {hours.map((hour, index) => (
 <div
 key={hour}
 style={{
 position: 'absolute',
 top: index * TIME_SLOT_HEIGHT - 8,
 right: 10,
 fontSize: 11,
 color: 'var(--tn-fg-muted)',
 fontVariantNumeric: 'tabular-nums',
 }}
 >
 {formatHour(hour)}
 </div>
 ))}
 </div>
 {days.map((day) => {
 const timedItems = itemsFor(day).filter((item) => item.hasTime);
 const timedLayouts = layoutTimedItems(timedItems);
 return (
 <div
 key={`time-${day.toISOString()}`}
 onClick={() => setSelected(day)}
 style={{
 position: 'relative',
 height: totalHeight,
 borderLeft: 'var(--tn-line)',
 background: sameDay(day, today) ? 'color-mix(in srgb, var(--tn-accent) 5%, transparent)' : 'transparent',
 cursor: 'pointer',
 }}
 >
 {Array.from({ length: hourCount + 1 }, (_, index) => (
 <div
 key={index}
 style={{
 position: 'absolute',
 left: 0,
 right: 0,
 top: index * TIME_SLOT_HEIGHT,
 borderTop: 'var(--tn-line)',
 }}
 />
 ))}
 {timedLayouts.map(({ item, columnIndex, columnCount, stackOffset, dense }, index) => {
 const { top, height } = timedPosition(item);
 const visualHeight = dense ? Math.min(height, 42) : height;
 const visualTop = Math.min(top + stackOffset, Math.max(0, totalHeight - visualHeight));
 const width = `calc(${100 / columnCount}% - ${columnCount === 1 ? 12 : 8}px)`;
 const left = `calc(${(100 / columnCount) * columnIndex}% + 6px)`;
 return (
 <button
 key={`${item.type}-${item.raw.id}-${index}`}
 type="button"
 onClick={(event) => {
 event.stopPropagation();
 setSelected(day);
 }}
 style={{
 position: 'absolute',
 top: visualTop,
 left,
 width,
 height: visualHeight,
 padding: '4px 6px',
 border: 'var(--tn-line)',
 borderLeft: `4px solid ${TYPE_COLOR[item.type]}`,
 borderRadius: 8,
 background: 'var(--tn-card)',
 color: 'var(--tn-fg)',
 boxShadow: '0 8px 18px color-mix(in srgb, var(--tn-fg) 12%, transparent)',
 cursor: 'pointer',
 overflow: 'hidden',
 textAlign: 'left',
 zIndex: item.type === 'Event' ? 50 : 2 + columnIndex + Math.floor(stackOffset / 46),
 }}
 title={`${item.type}: ${item.raw.title} · ${formatItemTime(item)}`}
 >
 <div style={{ fontSize: 10, lineHeight: 1.15, color: 'var(--tn-fg-muted)', fontVariantNumeric: 'tabular-nums' }}>
 {formatItemTime(item)}
 </div>
 <div style={{ fontSize: 11, lineHeight: 1.18, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
 {item.raw.title}
 </div>
 {visualHeight >= 44 && (
 <div style={{ fontSize: 9, lineHeight: 1.1, color: TYPE_COLOR[item.type], textTransform: 'uppercase' }}>{item.type}</div>
 )}
 </button>
 );
 })}
 </div>
 );
 })}
 </div>
 </div>
 </div>
 </div>
 );
};

export default withAuth(CalendarPage);
