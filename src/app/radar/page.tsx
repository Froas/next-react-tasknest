'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Radio, Search } from 'lucide-react';
import { withAuth } from '@/hoc/withAuth';
import { AuthRequiredError, notesApi, type NoteItem } from '@/lib/api';
import { RADAR_BUCKETS, isRadarDue, radarBucket, type RadarBucket } from '@/lib/radar';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { Modal } from '@/components/ui/Modal';
import { RadarSignalEditor } from '@/components/radar/RadarSignalEditor';

const localDateKey = () => {
 const now = new Date();
 return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const RadarPage: React.FC = () => {
 useDocumentTitle('Radar');
 const [signals, setSignals] = useState<NoteItem[]>([]);
 const [activeBucket, setActiveBucket] = useState<RadarBucket>('inbox');
 const [selectedId, setSelectedId] = useState<string | null>(null);
 const [search, setSearch] = useState('');
 const [loading, setLoading] = useState(true);
 const [creating, setCreating] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const todayKey = useMemo(localDateKey, []);

 useEffect(() => {
 const params = new URLSearchParams(window.location.search);
 const requested = params.get('view');
 const requestedSignalId = params.get('signal');
 if (RADAR_BUCKETS.some((bucket) => bucket.id === requested)) setActiveBucket(requested as RadarBucket);
 let cancelled = false;
 (async () => {
 try {
 const rows = (await notesApi.getAll()).filter((row) => row.kind === 'signal');
 if (!cancelled) {
 setSignals(rows);
 if (requestedSignalId && rows.some((row) => row.id === requestedSignalId)) setSelectedId(requestedSignalId);
 }
 } catch (caught) {
 if (!(caught instanceof AuthRequiredError) && !cancelled) setError(caught instanceof Error ? caught.message : 'Failed to load Radar');
 } finally {
 if (!cancelled) setLoading(false);
 }
 })();
 return () => { cancelled = true; };
 }, []);

 const counts = useMemo(() => {
 const result = new Map<RadarBucket, number>(RADAR_BUCKETS.map((bucket) => [bucket.id, 0]));
 signals.forEach((signal) => result.set(radarBucket(signal), (result.get(radarBucket(signal)) ?? 0) + 1));
 return result;
 }, [signals]);
 const visibleSignals = useMemo(() => {
 const query = search.trim().toLowerCase();
 return signals
 .filter((signal) => radarBucket(signal) === activeBucket)
 .filter((signal) => !query || [signal.title, signal.body, signal.source, signal.signal_domain, signal.next_action]
 .some((value) => value?.toLowerCase().includes(query)))
 .sort((a, b) => {
 const dueDifference = Number(isRadarDue(b, todayKey)) - Number(isRadarDue(a, todayKey));
 return dueDifference || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
 });
 }, [activeBucket, search, signals, todayKey]);
 const selected = signals.find((signal) => signal.id === selectedId) ?? null;
 const dueCount = signals.filter((signal) => isRadarDue(signal, todayKey)).length;

 const createSignal = async () => {
 setCreating(true);
 setError(null);
 try {
 const signal = await notesApi.create({
 title: 'New signal',
 body: '',
 kind: 'signal',
 tag: 'signal',
 signal_domain: 'other',
 signal_stake: 'none',
 });
 setSignals((current) => [signal, ...current]);
 setActiveBucket('inbox');
 setSelectedId(signal.id);
 } catch (caught) {
 setError(caught instanceof Error ? caught.message : 'Failed to create signal');
 } finally {
 setCreating(false);
 }
 };

 const acceptSaved = (updated: NoteItem) => {
 setSignals((current) => current.map((signal) => signal.id === updated.id ? updated : signal));
 };

 return (
 <div className="page">
 <div className="page-head flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
 <div>
 <div className="page-eyebrow">Signals</div>
 <h1 className="page-title">Radar</h1>
 <p className="page-lede">Catch signals before they become regrets. Capture first, decide later.</p>
 </div>
 <button type="button" className="btn btn-primary" onClick={createSignal} disabled={creating}>
 <Plus className="h-4 w-4" /> {creating ? 'Creating…' : 'Capture signal'}
 </button>
 </div>

 {error && <div className="mb-4 rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--tn-bad)', color: 'var(--tn-bad)' }}>{error}</div>}

 <div className="mb-5 grid gap-3 sm:grid-cols-3">
 <SummaryCard label="Inbox" value={counts.get('inbox') ?? 0} detail="waiting for a decision" />
 <SummaryCard label="Due now" value={dueCount} detail="review date or deadline reached" />
 <SummaryCard label="Active" value={(counts.get('watch') ?? 0) + (counts.get('test') ?? 0) + (counts.get('act') ?? 0)} detail="watching, testing, or acting" />
 </div>

 <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
 {RADAR_BUCKETS.map((bucket) => (
 <button
 key={bucket.id}
 type="button"
 className={activeBucket === bucket.id ? 'btn btn-primary !px-3 !py-2 text-xs' : 'btn btn-secondary !px-3 !py-2 text-xs'}
 onClick={() => setActiveBucket(bucket.id)}
 >
 {bucket.label} <span className="opacity-70">{counts.get(bucket.id) ?? 0}</span>
 </button>
 ))}
 </div>

 <div className="filter-toolbar mb-4 !static">
 <Search className="h-4 w-4 text-muted-foreground" />
 <input className="filter-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search signals…" />
 </div>

 {loading ? (
 <div className="card text-sm text-muted-foreground">Loading Radar…</div>
 ) : visibleSignals.length === 0 ? (
 <div className="card text-center">
 <Radio className="mx-auto mb-3 h-8 w-8" style={{ color: 'var(--tn-accent)' }} />
 <h2 className="mb-1 text-base font-semibold">Nothing in {activeBucket}</h2>
 <p className="text-sm text-muted-foreground">Capture a weak signal from Today or create one here.</p>
 </div>
 ) : (
 <div className="grid gap-3 lg:grid-cols-2">
 {visibleSignals.map((signal) => (
 <button
 key={signal.id}
 type="button"
 onClick={() => setSelectedId(signal.id)}
 className="rounded-2xl border p-4 text-left transition-transform hover:scale-[1.01]"
 style={{ border: 'var(--tn-line)', background: 'var(--tn-card)', color: 'var(--tn-fg)' }}
 >
 <div className="mb-2 flex flex-wrap items-center gap-2">
 {isRadarDue(signal, todayKey) && <span className="pill" style={{ color: 'var(--tn-bad)', borderColor: 'var(--tn-bad)' }}>due</span>}
 <span className="pill">{signal.signal_domain ?? 'other'}</span>
 <span className="pill">{signal.signal_stake ?? 'none'} stake</span>
 {signal.source && <span className="pill">src: {signal.source}</span>}
 </div>
 <h2 className="mb-1 text-base font-semibold">{signal.title}</h2>
 {signal.body && <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{signal.body}</p>}
 <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
 {signal.review_date && <span>Review {signal.review_date}</span>}
 {signal.deadline && <span>Deadline {signal.deadline}</span>}
 {signal.next_action && <span className="truncate">Next: {signal.next_action}</span>}
 </div>
 </button>
 ))}
 </div>
 )}

 <div className="mt-5 text-right">
 <Link href="/review" className="text-sm hover:underline" style={{ color: 'var(--tn-accent)' }}>Open system review →</Link>
 </div>

 <Modal open={Boolean(selected)} title={selected?.title ?? 'Signal'} onClose={() => setSelectedId(null)} maxWidth="2xl">
 {selected && <RadarSignalEditor signal={selected} onSaved={acceptSaved} />}
 </Modal>
 </div>
 );
};

const SummaryCard: React.FC<{ label: string; value: number; detail: string }> = ({ label, value, detail }) => (
 <div className="card !p-4">
 <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
 <div className="mt-1 text-3xl font-bold">{value}</div>
 <div className="text-xs text-muted-foreground">{detail}</div>
 </div>
);

export default withAuth(RadarPage);
