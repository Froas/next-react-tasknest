'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Radio } from 'lucide-react';
import { AuthRequiredError, notesApi, type NoteItem } from '@/lib/api';
import { isRadarDue, radarBucket } from '@/lib/radar';

const dateKey = () => {
 const now = new Date();
 return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const RadarTodayPanel: React.FC = () => {
 const [signals, setSignals] = useState<NoteItem[]>([]);
 const todayKey = useMemo(dateKey, []);
 const load = useCallback(async () => {
 try {
 const rows = await notesApi.getAll();
 setSignals(rows.filter((row) => row.kind === 'signal'));
 } catch (caught) {
 if (!(caught instanceof AuthRequiredError)) console.error('Failed to load Today radar:', caught);
 }
 }, []);

 useEffect(() => {
 void load();
 const refresh = () => void load();
 window.addEventListener('tasknest:radar-changed', refresh);
 return () => window.removeEventListener('tasknest:radar-changed', refresh);
 }, [load]);

 const due = signals.filter((signal) => isRadarDue(signal, todayKey));
 const inbox = signals.filter((signal) => radarBucket(signal) === 'inbox');
 const rows = [...due, ...inbox.filter((signal) => !due.some((item) => item.id === signal.id))].slice(0, 3);
 if (rows.length === 0) return null;

 return (
 <section className="mb-4 rounded-2xl border p-3" style={{ border: 'var(--tn-line)', background: 'var(--tn-card)' }}>
 <div className="mb-2 flex items-center justify-between gap-3">
 <div className="flex items-center gap-2">
 <Radio className="h-4 w-4" style={{ color: 'var(--tn-accent)' }} />
 <div>
 <h4 className="text-sm font-semibold">Radar</h4>
 <p className="text-xs text-muted-foreground">{due.length} due · {inbox.length} waiting for a decision</p>
 </div>
 </div>
 <Link href={due[0] ? `/radar?view=${radarBucket(due[0])}&signal=${due[0].id}` : '/radar?view=inbox'} className="text-xs hover:underline" style={{ color: 'var(--tn-accent)' }}>
 Process signals →
 </Link>
 </div>
 <div className="grid gap-2 sm:grid-cols-3">
 {rows.map((signal) => (
 <Link
 key={signal.id}
 href={`/radar?view=${radarBucket(signal)}&signal=${signal.id}`}
 className="min-w-0 rounded-xl border px-3 py-2 text-sm"
 style={{ border: 'var(--tn-line)', color: 'var(--tn-fg)', background: 'var(--tn-active)' }}
 >
 <span className="block truncate font-medium">{signal.title}</span>
 <span className="block truncate text-xs text-muted-foreground">
 {isRadarDue(signal, todayKey) ? 'Due now' : 'Inbox'} · {signal.signal_domain ?? 'other'}
 </span>
 </Link>
 ))}
 </div>
 </section>
 );
};
