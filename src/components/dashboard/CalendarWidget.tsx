import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import {
 buildCalendarItems,
 calendarDateKey,
 calendarItemHref,
 groupItemsByDate,
 isCalendarItemActionable,
 parseCalendarDate,
 sortCalendarItemsByDate,
 type CalendarItem,
} from '@/lib/calendarItems';
import { AuthRequiredError, metricsApi, todoOccurrencesApi } from '@/lib/api';
import { TODAY_DATA_CHANGED_EVENT } from '@/lib/todaySync';

// Dashboard side widget: themed mini-month + selected-day item list.
// Replaces react-calendar (whose stylesheet was always dark blue) with a
// hand-rolled grid that uses --tn-* tokens — so it follows the active
// theme just like /calendar does.

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const selectDay = (
 day: Date,
 setSelected: React.Dispatch<React.SetStateAction<Date>>,
 setShowAllSelectedItems: React.Dispatch<React.SetStateAction<boolean>>,
) => {
 setSelected(day);
 setShowAllSelectedItems(false);
};

function sameDay(a: Date, b: Date) {
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

function formatItemTime(item: CalendarItem): string {
 if (!item.due_date || !hasExplicitTime(item.due_date)) return 'All day';
 const start = parseCalendarDate(item.due_date);
 const end = item.end_date ? parseCalendarDate(item.end_date) : undefined;
 if (end && sameDay(start, end) && end > start) return `${formatClock(start)}–${formatClock(end)}`;
 return formatClock(start);
}

export const CalendarWidget: React.FC = () => {
 const goals = useStore((s) => s.goals);
 const storeTasks = useStore((s) => s.tasks);
 const storeTodos = useStore((s) => s.todos);
 const storeEvents = useStore((s) => s.events);

 const [cursor, setCursor] = useState(() => new Date());
 const [selected, setSelected] = useState(() => new Date());
 const [showAllSelectedItems, setShowAllSelectedItems] = useState(false);
 const [showAllAttentionItems, setShowAllAttentionItems] = useState(false);
 const [todayRoutineCount, setTodayRoutineCount] = useState(0);
 const [todayMetricCount, setTodayMetricCount] = useState(0);

 useEffect(() => {
 let cancelled = false;
 const loadTodaySummary = async () => {
 try {
 const [occurrences, metrics] = await Promise.all([
 todoOccurrencesApi.today(),
 metricsApi.today(),
 ]);
 if (cancelled) return;
 setTodayRoutineCount(occurrences.filter((item) => item.status === 'open').length);
 setTodayMetricCount(metrics.length);
 } catch (error) {
 if (error instanceof AuthRequiredError) return;
 console.warn('Failed to load Today summary for calendar widget:', error);
 }
 };
 void loadTodaySummary();
 window.addEventListener(TODAY_DATA_CHANGED_EVENT, loadTodaySummary);
 return () => {
 cancelled = true;
 window.removeEventListener(TODAY_DATA_CHANGED_EVENT, loadTodaySummary);
 };
 }, []);

 const items = useMemo<CalendarItem[]>(
 () => buildCalendarItems(goals, storeTasks, storeTodos, storeEvents),
 [goals, storeTasks, storeTodos, storeEvents],
 );
 const itemsByDate = useMemo(() => groupItemsByDate(items), [items]);

 const cells = useMemo(() => {
 const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
 const startOffset = (first.getDay() + 6) % 7; // Monday-first
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

 const today = new Date();
 const monthLabel = cursor.toLocaleDateString('en-US', {
 month: 'long',
 year: 'numeric',
 });

 const selectedItems =
 itemsByDate.get(calendarDateKey(selected)) ?? [];
 const visibleSelectedItems = showAllSelectedItems ? selectedItems : selectedItems.slice(0, 6);
 const selectedIsToday = sameDay(selected, today);
 const hasTodaySummary = selectedIsToday && (todayRoutineCount > 0 || todayMetricCount > 0);
 const todayAttentionItems = useMemo(() => {
 const todayStart = new Date(today);
 todayStart.setHours(0, 0, 0, 0);
 return sortCalendarItemsByDate(
 items.filter((item) => {
 if (!isCalendarItemActionable(item)) return false;
 const due = parseCalendarDate(item.due_date);
 due.setHours(0, 0, 0, 0);
 return due <= todayStart;
 }),
 );
 }, [items, today]);
 const visibleAttentionItems = showAllAttentionItems ? todayAttentionItems : todayAttentionItems.slice(0, 5);

 const openToday = (event: React.MouseEvent<HTMLAnchorElement>) => {
 const target = document.getElementById('today-dashboard');
 if (!target) return;
 event.preventDefault();
 target.scrollIntoView({ behavior: 'smooth', block: 'start' });
 target.focus({ preventScroll: true });
 window.history.replaceState(null, '', '#today-dashboard');
 };

 return (
 <div
 style={{
 background: 'var(--tn-card)',
 border: 'var(--tn-card-border, var(--tn-line))',
 borderRadius: 'var(--tn-r-lg, 12px)',
 padding: 20,
 boxShadow: 'var(--tn-shadow)',
 color: 'var(--tn-fg)',
 }}
 >
 <div
 style={{
 display: 'flex',
 alignItems: 'center',
 marginBottom: 12,
 gap: 6,
 }}
 >
 <button
 onClick={() =>
 setCursor(
 new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
 )
 }
 aria-label="Previous month"
 style={navBtn}
 >
 ‹
 </button>
 <div
 style={{
 flex: 1,
 textAlign: 'center',
 fontSize: 14,
 fontWeight: 600,
 fontFamily: 'var(--tn-font-display, var(--tn-font-sans))',
 color: 'var(--tn-fg)',
 }}
 >
 {monthLabel}
 </div>
 <button
 onClick={() =>
 setCursor(
 new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
 )
 }
 aria-label="Next month"
 style={navBtn}
 >
 ›
 </button>
 </div>

 <div
 style={{
 display: 'grid',
 gridTemplateColumns: 'repeat(7, 1fr)',
 borderTop: 'var(--tn-line)',
 borderLeft: 'var(--tn-line)',
 }}
 >
 {WEEKDAYS.map((w) => (
 <div
 key={w}
 style={{
 fontSize: 10,
 textAlign: 'center',
 color: 'var(--tn-fg-muted)',
 letterSpacing: '0.06em',
 textTransform: 'uppercase',
 padding: '4px 0',
 borderRight: 'var(--tn-line)',
 borderBottom: 'var(--tn-line)',
 }}
 >
 {w[0]}
 </div>
 ))}
 </div>

 <div
 style={{
 display: 'grid',
 gridTemplateColumns: 'repeat(7, 1fr)',
 marginBottom: 16,
 borderLeft: 'var(--tn-line)',
 }}
 >
 {cells.map((d, i) => {
 if (!d) return (
 <div
 key={i}
 style={{
 aspectRatio: '1 / 1',
 borderRight: 'var(--tn-line)',
 borderBottom: 'var(--tn-line)',
 background: 'color-mix(in srgb, var(--tn-muted, #f3f4f6) 30%, transparent)',
 }}
 />
 );
 const isToday = sameDay(d, today);
 const isSelected = sameDay(d, selected);
 const dayItems = itemsByDate.get(calendarDateKey(d)) ?? [];
 return (
 <button
 key={i}
 onClick={() => {
 selectDay(d, setSelected, setShowAllSelectedItems);
 setShowAllAttentionItems(false);
 }}
 style={{
 aspectRatio: '1 / 1',
 borderRadius: 'var(--tn-r-md, 6px)',
 border: '0',
 borderRight: 'var(--tn-line)',
 borderBottom: 'var(--tn-line)',
 background: isSelected
 ? 'var(--tn-accent)'
 : isToday
 ? 'var(--tn-hover)'
 : 'transparent',
 color: isSelected
 ? 'var(--tn-on-accent)'
 : isToday
 ? 'var(--tn-accent)'
 : 'var(--tn-fg)',
 fontWeight: isToday || isSelected ? 600 : 500,
 fontSize: 12,
 cursor: 'pointer',
 display: 'flex',
 flexDirection: 'column',
 alignItems: 'center',
 justifyContent: 'center',
 position: 'relative',
 fontVariantNumeric: 'tabular-nums',
 }}
 >
 {d.getDate()}
 {dayItems.length > 0 && (
 <span
 style={{
 position: 'absolute',
 bottom: 2,
 width: 4,
 height: 4,
 borderRadius: 999,
 background: isSelected
 ? 'var(--tn-on-accent)'
 : 'var(--tn-accent)',
 }}
 />
 )}
 </button>
 );
 })}
 </div>

 <div>
 <h4
 style={{
 fontSize: 12,
 fontWeight: 600,
 color: 'var(--tn-fg-muted)',
 marginBottom: 8,
 letterSpacing: '0.04em',
 textTransform: 'uppercase',
 }}
 >
 Items for{' '}
 {selected.toLocaleDateString('en-US', {
 month: 'short',
 day: 'numeric',
 })}
 </h4>
 {selectedIsToday && todayAttentionItems.length > 0 && (
 <div style={{ marginBottom: 12 }}>
 <div
 style={{
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'space-between',
 gap: 8,
 marginBottom: 6,
 }}
 >
 <span
 style={{
 fontSize: 11,
 fontWeight: 600,
 color: 'var(--tn-fg-muted)',
 letterSpacing: '0.04em',
 textTransform: 'uppercase',
 }}
 >
 Needs attention now
 </span>
 <span style={{ fontSize: 11, color: 'var(--tn-fg-muted)' }}>
 {todayAttentionItems.length}
 </span>
 </div>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
 {visibleAttentionItems.map((item, index) => (
 <CalendarItemLink key={`attention-${item.id}-${index}`} item={item} overdueToday={today} />
 ))}
 {todayAttentionItems.length > 5 && (
 <button
 type="button"
 onClick={() => setShowAllAttentionItems((current) => !current)}
 style={{
 width: '100%',
 display: 'block',
 border: 'var(--tn-line)',
 borderRadius: 'var(--tn-r-md, 6px)',
 background: 'transparent',
 color: 'var(--tn-accent)',
 fontSize: 11,
 padding: '6px 8px',
 textAlign: 'center',
 cursor: 'pointer',
 }}
 >
 {showAllAttentionItems
 ? 'Show less'
 : `Show +${todayAttentionItems.length - 5} more`}
 </button>
 )}
 </div>
 </div>
 )}
 {hasTodaySummary && (
 <Link
 href="/#today-dashboard"
 onClick={openToday}
 style={{
 display: 'block',
 marginBottom: 12,
 border: 'var(--tn-line)',
 borderRadius: 'var(--tn-r-md, 6px)',
 background: 'color-mix(in srgb, var(--tn-accent) 7%, var(--tn-card))',
 color: 'inherit',
 padding: '8px 10px',
 textDecoration: 'none',
 }}
 title="Open Today routines and metrics"
 >
 <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tn-fg)', marginBottom: 2 }}>
 Today routines & metrics
 </div>
 <div style={{ fontSize: 11, color: 'var(--tn-fg-muted)' }}>
 {todayRoutineCount} open routine{todayRoutineCount === 1 ? '' : 's'} · {todayMetricCount} metric{todayMetricCount === 1 ? '' : 's'}
 </div>
 </Link>
 )}
 {selectedItems.length === 0 && !hasTodaySummary ? (
 <p
 style={{
 fontSize: 13,
 color: 'var(--tn-fg-muted)',
 }}
 >
 No items for this date.
 </p>
 ) : (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
 {visibleSelectedItems.map((item, index) => (
 <CalendarItemLink key={`${item.id}-${index}`} item={item} overdueToday={today} />
 ))}
 {selectedItems.length > 6 && (
 <button
 type="button"
 onClick={() => setShowAllSelectedItems((current) => !current)}
 style={{
 width: '100%',
 border: 'var(--tn-line)',
 borderRadius: 'var(--tn-r-md, 6px)',
 background: 'transparent',
 fontSize: 11,
 color: 'var(--tn-fg-muted)',
 textAlign: 'center',
 padding: '6px 8px',
 cursor: 'pointer',
 }}
 >
 {showAllSelectedItems ? 'Show less' : `+ ${selectedItems.length - 6} more`}
 </button>
 )}
 </div>
 )}
 </div>
 </div>
 );
};

const CalendarItemLink: React.FC<{ item: CalendarItem; overdueToday: Date }> = ({ item, overdueToday }) => {
 const dueDate = parseCalendarDate(item.due_date);
 const isOverdue = dueDate < overdueToday && !sameDay(dueDate, overdueToday);
 return (
 <Link
 href={calendarItemHref(item)}
 style={{
 display: 'block',
 padding: '8px 10px',
 borderRadius: 'var(--tn-r-md, 6px)',
 border: 'var(--tn-line)',
 background: isOverdue
 ? 'var(--tn-pr-high-bg, var(--tn-hover))'
 : 'var(--tn-hover)',
 color: 'inherit',
 textDecoration: 'none',
 transition: 'transform 120ms ease, filter 120ms ease',
 }}
 title={`Open ${item.itemType.toLowerCase()}: ${item.title}`}
 >
 <div
 style={{
 fontSize: 13,
 fontWeight: 500,
 color: 'var(--tn-fg)',
 marginBottom: 2,
 }}
 >
 {item.title}
 </div>
 <div
 style={{
 fontSize: 11,
 color: 'var(--tn-fg-muted)',
 display: 'flex',
 gap: 6,
 alignItems: 'center',
 flexWrap: 'wrap',
 }}
 >
 <span>{formatItemTime(item)}</span>
 <span>·</span>
 <span>{item.itemType}</span>
 <span>·</span>
 <span>{item.status}</span>
 {item.goalTitle && (
 <>
 <span>·</span>
 <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
 {item.goalTitle}
 </span>
 </>
 )}
 </div>
 </Link>
 );
};

const navBtn: React.CSSProperties = {
 width: 24,
 height: 24,
 background: 'transparent',
 border: 'var(--tn-line)',
 borderRadius: 'var(--tn-r-md, 4px)',
 color: 'var(--tn-fg)',
 cursor: 'pointer',
 fontSize: 14,
 lineHeight: 1,
 display: 'grid',
 placeItems: 'center',
};
