'use client';

import React, { useEffect, useState } from 'react';
import { withAuth } from '@/hoc/withAuth';
import { trashApi, type TrashItemBE, type TrashKind } from '@/lib/api';

const KIND_COLOR: Record<TrashKind, string> = {
 task: '#5a6f8c',
 goal: '#d8855a',
 milestone: '#8a6594',
 note: '#6a8a5a',
 event: '#c25d63',
 todo: '#c8932a',
};

const TrashPage: React.FC = () => {
 const [items, setItems] = useState<TrashItemBE[]>([]);
 const [loading, setLoading] = useState(true);
 const [busyId, setBusyId] = useState<string | null>(null);
 const [emptying, setEmptying] = useState(false);
 const [error, setError] = useState<string | null>(null);

 async function reload() {
 setLoading(true);
 setError(null);
 try {
 const data = await trashApi.list();
 setItems(data);
 } catch (e) {
 setError(e instanceof Error ? e.message : 'Failed to load trash');
 } finally {
 setLoading(false);
 }
 }

 useEffect(() => {
 reload();
 }, []);

 async function handleRestore(it: TrashItemBE) {
 setBusyId(it.id);
 try {
 await trashApi.restore(it.kind, it.id);
 setItems(items.filter((x) => x.id !== it.id));
 } catch (e) {
 setError(e instanceof Error ? e.message : 'Failed to restore');
 } finally {
 setBusyId(null);
 }
 }

 async function handlePurge(it: TrashItemBE) {
 if (!confirm(`Permanently delete this ${it.kind}? This cannot be undone.`)) return;
 setBusyId(it.id);
 try {
 await trashApi.purge(it.kind, it.id);
 setItems(items.filter((x) => x.id !== it.id));
 } catch (e) {
 setError(e instanceof Error ? e.message : 'Failed to delete');
 } finally {
 setBusyId(null);
 }
 }

 async function handleEmpty() {
 if (!confirm('Permanently delete every item in trash? This cannot be undone.')) return;
 setEmptying(true);
 try {
 await trashApi.empty();
 setItems([]);
 } catch (e) {
 setError(e instanceof Error ? e.message : 'Failed to empty trash');
 } finally {
 setEmptying(false);
 }
 }

 return (
 <div className="page">
 <div className="page-head">
 <div className="page-eyebrow">
 {loading ? 'loading…' : `${items.length} items`}
 </div>
 <h1 className="page-title">Trash</h1>
 <p className="page-lede">
 Recently deleted items. Restore in one click, or empty to free your
 mind.
 </p>
 </div>

 {error && (
 <div
 style={{
 padding: '10px 14px',
 fontSize: 13,
 marginBottom: 16,
 background: 'var(--tn-pr-high-bg)',
 color: 'var(--tn-pr-high-fg)',
 borderRadius: 8,
 }}
 >
 {error}
 </div>
 )}

 <div className="section">
 <div
 style={{
 display: 'flex',
 marginBottom: 18,
 gap: 10,
 alignItems: 'center',
 }}
 >
 <span style={{ fontSize: 13, color: 'var(--tn-fg-muted)' }}>
 Items appear here when you delete a goal, milestone, task, todo,
 event, or note.
 </span>
 <div style={{ flex: 1 }} />
 <button
 className="btn btn-ghost"
 style={{ color: 'var(--tn-bad)' }}
 onClick={handleEmpty}
 disabled={emptying || items.length === 0}
 >
 {emptying ? 'Emptying…' : 'Empty trash'}
 </button>
 </div>

 {!loading && items.length === 0 && (
 <div
 className="card"
 style={{
 textAlign: 'center',
 color: 'var(--tn-fg-muted)',
 padding: 40,
 }}
 >
 Trash is empty.
 </div>
 )}

 {items.length > 0 && (
 <div className="card" style={{ padding: 0 }}>
 {items.map((it, i) => (
 <div
 key={`${it.kind}-${it.id}`}
 style={{
 display: 'grid',
 gridTemplateColumns: '90px 1fr 160px auto auto',
 gap: 12,
 alignItems: 'center',
 padding: '14px 20px',
 borderBottom:
 i < items.length - 1 ? 'var(--tn-line)' : 'none',
 }}
 >
 <span
 style={{
 fontSize: 10,
 padding: '3px 8px',
 background: KIND_COLOR[it.kind],
 color: 'white',
 borderRadius: 4,
 fontWeight: 600,
 letterSpacing: '0.04em',
 textAlign: 'center',
 textTransform: 'uppercase',
 }}
 >
 {it.kind}
 </span>
 <b style={{ fontSize: 14, fontWeight: 500 }}>{it.title}</b>
 <span
 style={{ fontSize: 12.5, color: 'var(--tn-fg-muted)' }}
 >
 Deleted{' '}
 {new Date(it.deleted_at).toLocaleDateString('en-US', {
 month: 'short',
 day: 'numeric',
 })}
 </span>
 <button
 className="btn btn-secondary"
 style={{ padding: '4px 10px', fontSize: 12 }}
 onClick={() => handleRestore(it)}
 disabled={busyId === it.id}
 >
 {busyId === it.id ? '…' : 'Restore'}
 </button>
 <button
 className="btn btn-ghost"
 style={{
 padding: '4px 10px',
 fontSize: 12,
 color: 'var(--tn-bad)',
 }}
 onClick={() => handlePurge(it)}
 disabled={busyId === it.id}
 >
 Delete forever
 </button>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 );
};

export default withAuth(TrashPage);
