import React, { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { StatusType } from '@/lib/types';
import {
 buildCalendarItems,
 groupItemsByDate,
 type CalendarItem,
} from '@/lib/calendarItems';

// Dashboard side widget: themed mini-month + selected-day item list.
// Replaces react-calendar (whose stylesheet was always dark blue) with a
// hand-rolled grid that uses --tn-* tokens — so it follows the active
// theme just like /calendar does.

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function sameDay(a: Date, b: Date) {
 return (
 a.getFullYear() === b.getFullYear() &&
 a.getMonth() === b.getMonth() &&
 a.getDate() === b.getDate()
 );
}

export const CalendarWidget: React.FC = () => {
 const goals = useStore((s) => s.goals);
 const storeTasks = useStore((s) => s.tasks);
 const storeTodos = useStore((s) => s.todos);
 const storeEvents = useStore((s) => s.events);

 const [cursor, setCursor] = useState(() => new Date());
 const [selected, setSelected] = useState(() => new Date());

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
 itemsByDate.get(selected.toDateString()) ?? [];

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
 gap: 2,
 marginBottom: 4,
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
 gap: 2,
 marginBottom: 16,
 }}
 >
 {cells.map((d, i) => {
 if (!d) return <div key={i} style={{ aspectRatio: '1 / 1' }} />;
 const isToday = sameDay(d, today);
 const isSelected = sameDay(d, selected);
 const dayItems = itemsByDate.get(d.toDateString()) ?? [];
 return (
 <button
 key={i}
 onClick={() => setSelected(d)}
 style={{
 aspectRatio: '1 / 1',
 borderRadius: 'var(--tn-r-md, 6px)',
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
 border: 'none',
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
 {selectedItems.length === 0 ? (
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
 {selectedItems.slice(0, 6).map((item, index) => {
 const dueDate = new Date(item.due_date!);
 const isOverdue = dueDate < today && !sameDay(dueDate, today);
 return (
 <div
 key={`${item.id}-${index}`}
 style={{
 padding: '8px 10px',
 borderRadius: 'var(--tn-r-md, 6px)',
 border: 'var(--tn-line)',
 background: isOverdue
 ? 'var(--tn-pr-high-bg, var(--tn-hover))'
 : 'var(--tn-hover)',
 }}
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
 }}
 >
 <span>{item.itemType}</span>
 <span>·</span>
 <span>{item.status}</span>
 {(item as any).goalTitle && (
 <>
 <span>·</span>
 <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
 {(item as any).goalTitle}
 </span>
 </>
 )}
 </div>
 </div>
 );
 })}
 {selectedItems.length > 6 && (
 <div
 style={{
 fontSize: 11,
 color: 'var(--tn-fg-muted)',
 textAlign: 'center',
 paddingTop: 4,
 }}
 >
 + {selectedItems.length - 6} more
 </div>
 )}
 </div>
 )}
 </div>
 </div>
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
