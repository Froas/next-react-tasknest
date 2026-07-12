'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { withAuth } from '@/hoc/withAuth';
import { notesApi, tagsApi, type NoteItem } from '@/lib/api';
import { toast } from '@/store/useToast';
import { useStore } from '@/store/useStore';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { Markdown } from '@/components/ui/Markdown';
import { InlineSelect, InlineText } from '@/components/ui/InlineEdit';

const TAG_OPTIONS = ['brand', 'run', 'read', 'work', 'life'] as const;
type NoteKindFilter = 'all' | 'note' | 'signal';
const NOTE_KIND_OPTIONS = ['note', 'signal'] as const;

const sortNotes = (items: NoteItem[]) =>
 [...items].sort((a, b) => {
 if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);
 return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
 });

const NotesPage: React.FC = () => {
 useDocumentTitle('Notes');
 const goals = useStore((state) => state.goals);
 const [notes, setNotes] = useState<NoteItem[]>([]);
 const [tagOptions, setTagOptions] = useState<string[]>([...TAG_OPTIONS]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [selectedId, setSelectedId] = useState<string | null>(null);
 const [creating, setCreating] = useState(false);
 const [search, setSearch] = useState('');
 const [tagFilter, setTagFilter] = useState('all');
 const [kindFilter, setKindFilter] = useState<NoteKindFilter>('all');
 const [sourceFilter, setSourceFilter] = useState('all');

 // Initial fetch.
 useEffect(() => {
 let cancelled = false;
 (async () => {
 try {
 const params = new URLSearchParams(window.location.search);
 const requestedKind = params.get('kind');
 const requestedTag = params.get('tag');
 const requestedSource = params.get('source');
 const requestedNoteId = params.get('noteId');
 if (requestedKind === 'note' || requestedKind === 'signal') setKindFilter(requestedKind);
 if (requestedTag) setTagFilter(requestedTag);
 if (requestedSource) setSourceFilter(requestedSource);
 const data = await notesApi.getAll();
 if (cancelled) return;
 setNotes(sortNotes(data));
 if (data.length > 0) {
 const preferred = requestedNoteId && data.some((note) => note.id === requestedNoteId)
 ? requestedNoteId
 : data[0].id;
 setSelectedId(preferred);
 }
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
 const noteTags = useMemo(
 () => Array.from(new Set(notes.map((note) => note.tag).filter((tag): tag is string => Boolean(tag)))).sort(),
 [notes],
 );
 const noteSources = useMemo(
 () => Array.from(new Set(notes.map((note) => note.source).filter((source): source is string => Boolean(source)))).sort(),
 [notes],
 );
 const filteredNotes = useMemo(() => {
 const query = search.trim().toLowerCase();
 return notes.filter((note) => {
 const matchesTag = tagFilter === 'all' || note.tag === tagFilter;
 const matchesKind = kindFilter === 'all' || (note.kind ?? 'note') === kindFilter;
 const matchesSource = sourceFilter === 'all' || note.source === sourceFilter;
 const matchesQuery =
 !query ||
 note.title.toLowerCase().includes(query) ||
 (note.body ?? '').toLowerCase().includes(query) ||
 (note.tag ?? '').toLowerCase().includes(query) ||
 (note.source ?? '').toLowerCase().includes(query);
 return matchesTag && matchesKind && matchesSource && matchesQuery;
 });
 }, [notes, search, tagFilter, kindFilter, sourceFilter]);
 const relationLabels = useMemo(() => {
 const labels = new Map<string, string>();
 goals.forEach((goal) => {
 labels.set(`goal:${goal.id}`, `Goal · ${goal.title}`);
 (goal.tasks ?? []).forEach((task) => {
 labels.set(`task:${task.id}`, `Routine · ${goal.title} / ${task.title}`);
 });
 (goal.milestones ?? []).forEach((milestone) => {
 milestone.tasks.forEach((task) => {
 labels.set(`task:${task.id}`, `Task · ${goal.title} / ${milestone.title} / ${task.title}`);
 });
 });
 });
 return labels;
 }, [goals]);

 useEffect(() => {
 let cancelled = false;
 (async () => {
 try {
 const tags = await tagsApi.getAll();
 if (!cancelled) {
 setTagOptions(
 Array.from(new Set([...TAG_OPTIONS, ...tags.map((tag) => tag.name)])).sort(),
 );
 }
 } catch {
 }
 })();
 return () => {
 cancelled = true;
 };
 }, []);

 function handleSelectNote(id: string) {
 setSelectedId(id);
 const params = new URLSearchParams(window.location.search);
 params.set('noteId', id);
 if (kindFilter === 'all') params.delete('kind');
 else params.set('kind', kindFilter);
 if (tagFilter === 'all') params.delete('tag');
 else params.set('tag', tagFilter);
 if (sourceFilter === 'all') params.delete('source');
 else params.set('source', sourceFilter);
 const query = params.toString();
 window.history.replaceState(null, '', query ? `${window.location.pathname}?${query}` : window.location.pathname);
 }

 async function handleCreate() {
 setCreating(true);
 setError(null);
 try {
 const note = await notesApi.create({
 title: kindFilter === 'signal' ? 'New signal' : 'New note',
 body: '',
 tag: tagFilter !== 'all' ? tagFilter : '',
 pinned: false,
 kind: kindFilter === 'signal' ? 'signal' : 'note',
 source: sourceFilter !== 'all' ? sourceFilter : null,
 });
 setNotes((current) => sortNotes([note, ...current]));
 setSelectedId(note.id);
 } catch (e) {
 setError(e instanceof Error ? e.message : 'Failed to create note');
 } finally {
 setCreating(false);
 }
 }

 async function saveNotePatch(patch: Partial<Pick<NoteItem, 'title' | 'body' | 'tag' | 'pinned' | 'kind' | 'source'>>) {
 if (!selected) return;
 const title = (patch.title ?? selected.title).trim();
 if (!title) {
 setError('Note title is required');
 return;
 }

 setError(null);
 try {
 const nextBody = patch.body !== undefined && patch.body !== null ? patch.body.trim() : undefined;
 const nextTag = patch.tag !== undefined && patch.tag !== null ? patch.tag.trim() : undefined;
 const nextSource = patch.source !== undefined && patch.source !== null ? patch.source.trim() : undefined;
 const updated = await notesApi.update({
 id: selected.id,
 title,
 body: patch.body !== undefined
 ? (nextBody ? patch.body : null)
 : selected.body ?? null,
 tag: patch.tag !== undefined
 ? (nextTag || null)
 : selected.tag ?? null,
 pinned: patch.pinned ?? selected.pinned,
 kind: patch.kind ?? selected.kind ?? 'note',
 source: patch.source !== undefined
 ? (nextSource || null)
 : selected.source ?? null,
 });
 setNotes((current) => sortNotes(current.map((note) => (note.id === updated.id ? updated : note))));
 if (updated.tag && !tagOptions.includes(updated.tag)) {
 setTagOptions((current) => Array.from(new Set([...current, updated.tag!])).sort());
 }
 setSelectedId(updated.id);
 toast.success('Note updated');
 } catch (e) {
 setError(e instanceof Error ? e.message : 'Failed to save note');
 }
 }

 async function handleDelete(id: string) {
 if (!window.confirm('Move this note to trash?')) return;
 setError(null);
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
 className="page notes-page"
 style={{
 display: 'grid',
 gap: 24,
 maxWidth: 1400,
 }}
 >
 <div className="min-w-0">
 <div className="page-eyebrow" style={{ marginBottom: 10 }}>
 {loading ? 'Loading…' : `${filteredNotes.length} / ${notes.length} notes`}
 </div>
 <h1 className="page-title" style={{ fontSize: 32, marginBottom: 14 }}>
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

 <div className="filter-toolbar" style={{ position: 'static', marginBottom: 14, padding: 10 }}>
 <input
 type="search"
 value={search}
 onChange={(event) => setSearch(event.target.value)}
 placeholder="Search notes…"
 className="filter-input"
 aria-label="Search notes"
 />
 <select
 value={kindFilter}
 onChange={(event) => setKindFilter(event.target.value as NoteKindFilter)}
 className="filter-select"
 aria-label="Filter notes by kind"
 >
 <option value="all">All kinds</option>
 <option value="note">Notes</option>
 <option value="signal">Signals</option>
 </select>
 <select
 value={tagFilter}
 onChange={(event) => setTagFilter(event.target.value)}
 className="filter-select"
 aria-label="Filter notes by tag"
 >
 <option value="all">All tags</option>
 {noteTags.map((tag) => (
 <option key={tag} value={tag}>{tag}</option>
 ))}
 </select>
 <select
 value={sourceFilter}
 onChange={(event) => setSourceFilter(event.target.value)}
 className="filter-select"
 aria-label="Filter notes by source"
 >
 <option value="all">All sources</option>
 {noteSources.map((source) => (
 <option key={source} value={source}>{source}</option>
 ))}
 </select>
 </div>

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
 No notes yet. Click “+ New note” to start.
 </div>
 )}

 {!loading && notes.length > 0 && filteredNotes.length === 0 && (
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
 No notes match this filter.
 </div>
 )}

 <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
 {filteredNotes.map((n) => (
 <div
 key={n.id}
 onClick={() => handleSelectNote(n.id)}
 style={{
 padding: '12px 14px',
 borderRadius: 8,
 cursor: 'pointer',
 background:
 selectedId === n.id ? 'var(--tn-active)' : 'transparent',
 border: selectedId === n.id ? '1px solid color-mix(in srgb, var(--tn-accent) 34%, transparent)' : '1px solid transparent',
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
 <b style={{ fontSize: 14, fontWeight: 600, color: 'var(--tn-fg)' }}>{n.title}</b>
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
 flexWrap: 'wrap',
 }}
 >
 {n.kind === 'signal' && (
 <span className="pill" style={{ borderColor: 'var(--tn-accent)', color: 'var(--tn-accent)' }}>
 signal
 </span>
 )}
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
 {n.source && (
 <span className="pill">
 src: {n.source}
 </span>
 )}
 {(n.task_id || n.goal_id) && (
 <span className="pill">
 {relationLabels.get(n.task_id ? `task:${n.task_id}` : `goal:${n.goal_id}`) ?? 'linked'}
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

 <div className="min-w-0">
 {selected ? (
 <div className="card">
 <div
 style={{
 display: 'flex',
 alignItems: 'center',
 gap: 10,
 marginBottom: 16,
 flexWrap: 'wrap',
 }}
 >
 <InlineSelect
 value={selected.kind ?? 'note'}
 options={NOTE_KIND_OPTIONS}
 ariaLabel="Edit note kind"
 onSave={(kind) => saveNotePatch({ kind })}
 renderValue={(kind) => (
 <span
 className="pill"
 style={kind === 'signal' ? { borderColor: 'var(--tn-accent)', color: 'var(--tn-accent)' } : undefined}
 >
 {kind}
 </span>
 )}
 />
 <InlineText
 value={selected.tag ?? ''}
 placeholder="tag"
 ariaLabel="Edit note tag"
 className={
 selected.tag && (TAG_OPTIONS as readonly string[]).includes(selected.tag)
 ? `pill tag-${selected.tag}`
 : 'pill'
 }
 onSave={(tag) => saveNotePatch({ tag })}
 renderValue={(tag) => tag}
 />
 <InlineText
 value={selected.source ?? ''}
 placeholder="source"
 ariaLabel="Edit note source"
 className="pill"
 onSave={(source) => saveNotePatch({ source })}
 renderValue={(source) => `source: ${source}`}
 />
 {(selected.task_id || selected.goal_id) && (
 <span className="pill">
 {relationLabels.get(selected.task_id ? `task:${selected.task_id}` : `goal:${selected.goal_id}`) ?? 'linked'}
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
 <button
 type="button"
 className="btn btn-ghost"
 onClick={() => saveNotePatch({ pinned: !selected.pinned })}
 style={{
 marginLeft: 'auto',
 padding: '4px 10px',
 fontSize: 12,
 color: selected.pinned ? 'var(--tn-accent)' : 'var(--tn-fg-muted)',
 }}
 >
 {selected.pinned ? '★ pinned' : '☆ pin'}
 </button>
 <button
 className="btn btn-ghost"
 style={{
 padding: '4px 10px',
 fontSize: 12,
 color: 'var(--tn-bad)',
 }}
 onClick={() => handleDelete(selected.id)}
 >
 Move to trash
 </button>
 </div>
 <InlineText
 value={selected.title}
 placeholder="Untitled note"
 ariaLabel="Edit note title"
 required
 onSave={(title) => saveNotePatch({ title })}
 className="mb-4"
 editClassName="text-3xl font-bold"
 renderValue={(title) => (
 <h2
 style={{
 fontSize: 30,
 fontWeight: 800,
 letterSpacing: '-0.03em',
 lineHeight: 1.1,
 color: 'var(--tn-fg)',
 }}
 >
 {title}
 </h2>
 )}
 />
 <div className="mt-2" style={{ color: 'var(--tn-fg)', fontSize: 16, lineHeight: 1.65 }}>
 <InlineText
 value={selected.body ?? ''}
 placeholder="Empty note. Click to add body."
 ariaLabel="Edit note body"
 multiline
 onSave={(body) => saveNotePatch({ body })}
 className="group block min-h-24 rounded-xl border border-transparent px-4 py-3 hover:border-border hover:bg-muted"
 editClassName="min-h-40 max-h-[60vh] resize-y font-mono text-sm leading-6"
 renderValue={(body) => (
 <div className="max-w-none break-words">
 <Markdown source={body} />
 </div>
 )}
 />
 </div>
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
