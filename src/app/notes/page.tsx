'use client';

import React, { useEffect, useState } from 'react';
import { withAuth } from '@/hoc/withAuth';
import { notesApi, type NoteItem } from '@/lib/api';

const TAG_OPTIONS = ['brand', 'run', 'read', 'work', 'life'] as const;

const NotesPage: React.FC = () => {
 const [notes, setNotes] = useState<NoteItem[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [selectedId, setSelectedId] = useState<string | null>(null);
 const [creating, setCreating] = useState(false);

 // Initial fetch.
 useEffect(() => {
 let cancelled = false;
 (async () => {
 try {
 const data = await notesApi.getAll();
 if (cancelled) return;
 setNotes(data);
 if (data.length > 0) setSelectedId(data[0].id);
 } catch (e) {
 if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load notes');
 } finally {
 if (!cancelled) setLoading(false);
 }
 })();
 return () => {
 cancelled = true;
 };
 }, []);

 const selected = notes.find((n) => n.id === selectedId);

 async function handleCreate() {
 setCreating(true);
 try {
 const note = await notesApi.create({
 title: 'New note',
 body: 'Write something…',
 tag: 'work',
 pinned: false,
 });
 setNotes([note, ...notes]);
 setSelectedId(note.id);
 } catch (e) {
 setError(e instanceof Error ? e.message : 'Failed to create note');
 } finally {
 setCreating(false);
 }
 }

 async function handleDelete(id: string) {
 try {
 await notesApi.delete(id);
 const remaining = notes.filter((n) => n.id !== id);
 setNotes(remaining);
 if (selectedId === id) {
 setSelectedId(remaining[0]?.id ?? null);
 }
 } catch (e) {
 setError(e instanceof Error ? e.message : 'Failed to delete note');
 }
 }

 return (
 <div
 className="page"
 style={{
 display: 'grid',
 gridTemplateColumns: '280px 1fr',
 gap: 24,
 maxWidth: 1400,
 }}
 >
 <div>
 <div className="page-eyebrow" style={{ marginBottom: 14 }}>
 {loading ? 'Loading…' : `${notes.length} notes`}
 </div>
 <h1 className="page-title" style={{ fontSize: 24, marginBottom: 16 }}>
 Notes
 </h1>
 <button
 className="btn btn-primary"
 style={{ marginBottom: 18, width: '100%' }}
 onClick={handleCreate}
 disabled={creating || loading}
 >
 {creating ? 'Creating…' : '+ New note'}
 </button>

 {error && (
 <div
 style={{
 padding: '8px 12px',
 fontSize: 12,
 marginBottom: 12,
 background: 'var(--tn-pr-high-bg)',
 color: 'var(--tn-pr-high-fg)',
 borderRadius: 6,
 }}
 >
 {error}
 </div>
 )}

 {!loading && notes.length === 0 && (
 <div
 style={{
 padding: 16,
 fontSize: 13,
 color: 'var(--tn-fg-muted)',
 border: 'var(--tn-line)',
 borderRadius: 8,
 textAlign: 'center',
 }}
 >
 No notes yet. Click"+ New note" to start.
 </div>
 )}

 <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
 {notes.map((n) => (
 <div
 key={n.id}
 onClick={() => setSelectedId(n.id)}
 style={{
 padding: '12px 14px',
 borderRadius: 8,
 cursor: 'pointer',
 background:
 selectedId === n.id ? 'var(--tn-active)' : 'transparent',
 }}
 >
 <div
 style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}
 >
 {n.pinned && (
 <span style={{ fontSize: 11, color: 'var(--tn-accent)' }}>
 ★
 </span>
 )}
 <b style={{ fontSize: 14, fontWeight: 600 }}>{n.title}</b>
 </div>
 {n.body && (
 <p
 style={{
 fontSize: 12,
 color: 'var(--tn-fg-muted)',
 marginTop: 4,
 display: '-webkit-box',
 WebkitLineClamp: 2,
 WebkitBoxOrient: 'vertical',
 overflow: 'hidden',
 }}
 >
 {n.body}
 </p>
 )}
 <div
 style={{
 display: 'flex',
 gap: 8,
 marginTop: 6,
 alignItems: 'center',
 }}
 >
 {n.tag && (
 <span
 className={
 (TAG_OPTIONS as readonly string[]).includes(n.tag)
 ? `pill tag-${n.tag}`
 : 'pill'
 }
 >
 {n.tag}
 </span>
 )}
 <span style={{ fontSize: 11, color: 'var(--tn-fg-muted)' }}>
 {new Date(n.updated_at).toLocaleDateString('en-US', {
 month: 'short',
 day: 'numeric',
 })}
 </span>
 </div>
 </div>
 ))}
 </div>
 </div>

 <div>
 {selected ? (
 <div className="card">
 <div
 style={{
 display: 'flex',
 alignItems: 'center',
 gap: 10,
 marginBottom: 16,
 }}
 >
 {selected.tag && (
 <span
 className={
 (TAG_OPTIONS as readonly string[]).includes(selected.tag)
 ? `pill tag-${selected.tag}`
 : 'pill'
 }
 >
 {selected.tag}
 </span>
 )}
 <span style={{ fontSize: 12, color: 'var(--tn-fg-muted)' }}>
 Edited{' '}
 {new Date(selected.updated_at).toLocaleDateString('en-US', {
 month: 'long',
 day: 'numeric',
 year: 'numeric',
 })}
 </span>
 {selected.pinned && (
 <span
 style={{
 marginLeft: 'auto',
 fontSize: 12,
 color: 'var(--tn-accent)',
 }}
 >
 ★ pinned
 </span>
 )}
 <button
 className="btn btn-ghost"
 style={{
 marginLeft: selected.pinned ? 8 : 'auto',
 padding: '4px 10px',
 fontSize: 12,
 color: 'var(--tn-bad)',
 }}
 onClick={() => handleDelete(selected.id)}
 >
 Move to trash
 </button>
 </div>
 <h2
 style={{
 fontSize: 28,
 fontWeight: 700,
 letterSpacing: '-0.02em',
 marginBottom: 14,
 }}
 >
 {selected.title}
 </h2>
 <p
 style={{
 fontSize: 15,
 lineHeight: 1.7,
 color: 'var(--tn-fg)',
 whiteSpace: 'pre-wrap',
 }}
 >
 {selected.body || (
 <span style={{ color: 'var(--tn-fg-muted)' }}>
 Empty note. (Editor coming in a later pass.)
 </span>
 )}
 </p>
 </div>
 ) : (
 !loading && (
 <div
 className="card"
 style={{
 textAlign: 'center',
 color: 'var(--tn-fg-muted)',
 padding: 32,
 }}
 >
 Pick a note from the list, or create a new one.
 </div>
 )
 )}
 </div>
 </div>
 );
};

export default withAuth(NotesPage);
