import { GoalItem as Goal, MilestoneItem as Milestone, TaskItem as Task, TodoItem as Todo, Event, StatusType } from './types';

// Build a minimal RFC 5545 ICS document covering everything dated in the
// goal-tree plus standalone events. Designed to import into Google Calendar,
// Apple Calendar, Outlook etc. Only includes items that are still open.

const escape = (s: string) =>
 s
 .replace(/\\/g, '\\\\')
 .replace(/\n/g, '\\n')
 .replace(/,/g, '\\,')
 .replace(/;/g, '\\;');

// Format a Date as ICS UTC stamp (YYYYMMDDTHHMMSSZ). Used for DTSTAMP.
const formatUtc = (d: Date) =>
 d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

// Format a date-only ICS value (YYYYMMDD) for VALUE=DATE properties.
const formatDateOnly = (iso: string): string => {
 const d = new Date(iso);
 const y = d.getUTCFullYear();
 const m = String(d.getUTCMonth() + 1).padStart(2, '0');
 const day = String(d.getUTCDate()).padStart(2, '0');
 return `${y}${m}${day}`;
};

// Format a datetime ICS value (UTC).
const formatDateTime = (iso: string): string => formatUtc(new Date(iso));

interface VEventInput {
 uid: string;
 summary: string;
 description?: string;
 start: string;
 end?: string;
 allDay?: boolean;
 location?: string;
}

const buildVEvent = (e: VEventInput): string => {
 const lines = ['BEGIN:VEVENT'];
 lines.push(`UID:${e.uid}@tasknest`);
 lines.push(`DTSTAMP:${formatUtc(new Date())}`);
 if (e.allDay) {
 lines.push(`DTSTART;VALUE=DATE:${formatDateOnly(e.start)}`);
 if (e.end) lines.push(`DTEND;VALUE=DATE:${formatDateOnly(e.end)}`);
 } else {
 lines.push(`DTSTART:${formatDateTime(e.start)}`);
 if (e.end) lines.push(`DTEND:${formatDateTime(e.end)}`);
 }
 lines.push(`SUMMARY:${escape(e.summary)}`);
 if (e.description) lines.push(`DESCRIPTION:${escape(e.description)}`);
 if (e.location) lines.push(`LOCATION:${escape(e.location)}`);
 lines.push('END:VEVENT');
 return lines.join('\r\n');
};

export interface IcsBuildOptions {
 goals: Goal[];
 events: Event[];
 // Limit to items that aren't finished / cancelled.
 onlyOpen?: boolean;
}

export const buildIcs = ({ goals, events, onlyOpen = true }: IcsBuildOptions): string => {
 const lines = [
 'BEGIN:VCALENDAR',
 'VERSION:2.0',
 'PRODID:-//TaskNest//EN',
 'CALSCALE:GREGORIAN',
 ];

 const skipFinished = (status: StatusType) =>
 onlyOpen && (status === StatusType.FINISHED || status === StatusType.CANCELLED);

 goals.forEach((goal) => {
 if (goal.end_datetime && !skipFinished(goal.status)) {
 lines.push(
 buildVEvent({
 uid: `goal-${goal.id}`,
 summary: `🎯 ${goal.title}`,
 description: goal.description,
 start: goal.end_datetime,
 allDay: true,
 })
 );
 }

 goal.milestones?.forEach((m: Milestone) => {
 const due = m.due_date ?? m.end_datetime;
 if (due && !skipFinished(m.status)) {
 lines.push(
 buildVEvent({
 uid: `milestone-${m.id}`,
 summary: `🚩 ${m.title}`,
 description: `${m.description ?? ''}\nGoal: ${goal.title}`,
 start: due,
 allDay: true,
 })
 );
 }

 m.tasks?.forEach((t: Task) => {
 if (t.due_date && !skipFinished(t.status)) {
 lines.push(
 buildVEvent({
 uid: `task-${t.id}`,
 summary: `✅ ${t.title}`,
 description: `${t.description ?? ''}\n${goal.title} · ${m.title}`,
 start: t.due_date,
 allDay: true,
 })
 );
 }
 t.todos?.forEach((todo: Todo) => {
 if (todo.due_date && !skipFinished(todo.status)) {
 lines.push(
 buildVEvent({
 uid: `todo-${todo.id}`,
 summary: `🔁 ${todo.title}`,
 description: `${todo.description ?? ''}\n${goal.title} · ${m.title} · ${t.title}`,
 start: todo.due_date,
 allDay: true,
 })
 );
 }
 });
 });
 });
 });

 events.forEach((e) => {
 if (!e.start_datetime) return;
 if (skipFinished(e.status)) return;
 lines.push(
 buildVEvent({
 uid: `event-${e.id}`,
 summary: e.title,
 description: e.description,
 start: e.start_datetime,
 end: e.end_datetime,
 location: e.location,
 })
 );
 });

 lines.push('END:VCALENDAR');
 return lines.join('\r\n');
};

export const downloadIcsFile = (filename: string, ics: string) => {
 if (typeof window === 'undefined') return;
 const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = filename;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 URL.revokeObjectURL(url);
};
