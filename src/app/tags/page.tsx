'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { withAuth } from '@/hoc/withAuth';
import { tagsApi } from '@/lib/api';
import { Tag } from '@/lib/types';
import { toast } from '@/store/useToast';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const DEFAULT_COLOR = '#6a8a5a';

const TagsPage: React.FC = () => {
 useDocumentTitle('Tags');
 const [tags, setTags] = useState<Tag[]>([]);
 const [filter, setFilter] = useState('');
 const [name, setName] = useState('');
 const [color, setColor] = useState(DEFAULT_COLOR);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [isLoading, setIsLoading] = useState(true);
 const [isSaving, setIsSaving] = useState(false);

 useEffect(() => {
 const loadTags = async () => {
 try {
 const loadedTags = await tagsApi.getAll();
 setTags(loadedTags);
 } catch (error) {
 console.error('Failed to load tags:', error);
 toast.error('Failed to load tags');
 } finally {
 setIsLoading(false);
 }
 };

 loadTags();
 }, []);

 const visibleTags = useMemo(() => {
 const query = filter.trim().toLowerCase();
 return tags
 .filter((tag) => tag.name.toLowerCase().includes(query))
 .sort((a, b) => a.name.localeCompare(b.name));
 }, [filter, tags]);

 const resetForm = () => {
 setName('');
 setColor(DEFAULT_COLOR);
 setEditingId(null);
 };

 const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
 event.preventDefault();
 const trimmedName = name.trim();
 if (!trimmedName) {
 toast.error('Tag name is required');
 return;
 }

 setIsSaving(true);
 try {
 if (editingId) {
 const updatedTag = await tagsApi.update({ id: editingId, name: trimmedName, color });
 setTags((currentTags) => currentTags.map((tag) => (tag.id === updatedTag.id ? updatedTag : tag)));
 toast.success('Tag updated');
 } else {
 const createdTag = await tagsApi.create({ name: trimmedName, color });
 setTags((currentTags) => [...currentTags, createdTag]);
 toast.success('Tag created');
 }
 resetForm();
 } catch (error) {
 console.error('Failed to save tag:', error);
 toast.error('Failed to save tag');
 } finally {
 setIsSaving(false);
 }
 };

 const handleEdit = (tag: Tag) => {
 setEditingId(tag.id);
 setName(tag.name);
 setColor(tag.color || DEFAULT_COLOR);
 };

 const handleDelete = async (tag: Tag) => {
 if (!window.confirm(`Delete #${tag.name}?`)) return;

 try {
 await tagsApi.delete(tag.id);
 setTags((currentTags) => currentTags.filter((item) => item.id !== tag.id));
 if (editingId === tag.id) resetForm();
 toast.success('Tag deleted');
 } catch (error) {
 console.error('Failed to delete tag:', error);
 toast.error('Failed to delete tag');
 }
 };

 return (
 <div className="page">
 <div className="page-head">
 <div className="page-eyebrow">
 {tags.length} tags
 </div>
 <h1 className="page-title">Tags</h1>
 <p className="page-lede">
 Tags cut across the goal hierarchy — group things by theme, not structure.
 </p>
 </div>

 <div className="section">
 <form
 onSubmit={handleSubmit}
 className="card"
 style={{ display: 'grid', gap: 14, marginBottom: 18 }}
 >
 <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'end' }}>
 <label style={{ display: 'grid', gap: 6 }}>
 <span style={{ fontSize: 12, color: 'var(--tn-fg-muted)' }}>Tag name</span>
 <input
 value={name}
 onChange={(event) => setName(event.target.value)}
 type="text"
 placeholder="health, learning, side-project…"
 style={{
 padding: '8px 12px',
 border: 'var(--tn-line)',
 borderRadius: 'var(--tn-r-md, 6px)',
 background: 'var(--tn-card)',
 color: 'var(--tn-fg)',
 fontSize: 13,
 }}
 />
 </label>
 <label style={{ display: 'grid', gap: 6 }}>
 <span style={{ fontSize: 12, color: 'var(--tn-fg-muted)' }}>Color</span>
 <input
 value={color}
 onChange={(event) => setColor(event.target.value)}
 type="color"
 style={{
 width: 46,
 height: 36,
 padding: 3,
 border: 'var(--tn-line)',
 borderRadius: 'var(--tn-r-md, 6px)',
 background: 'var(--tn-card)',
 }}
 />
 </label>
 <button className="btn btn-primary" type="submit" disabled={isSaving}>
 {isSaving ? 'Saving…' : editingId ? 'Save tag' : '+ New tag'}
 </button>
 </div>
 {editingId && (
 <button type="button" className="btn btn-ghost" style={{ justifySelf: 'start' }} onClick={resetForm}>
 Cancel editing
 </button>
 )}
 </form>

 <div style={{ display: 'flex', marginBottom: 18, gap: 10 }}>
 <input
 value={filter}
 onChange={(event) => setFilter(event.target.value)}
 type="text"
 placeholder="Filter tags…"
 style={{
 maxWidth: 320,
 padding: '8px 12px',
 border: 'var(--tn-line)',
 borderRadius: 'var(--tn-r-md, 6px)',
 background: 'var(--tn-card)',
 color: 'var(--tn-fg)',
 fontSize: 13,
 flex: 1,
 }}
 />
 </div>

 <div className="card" style={{ padding: 0 }}>
 {isLoading ? (
 <div style={{ padding: '28px 20px', color: 'var(--tn-fg-muted)' }}>Loading tags…</div>
 ) : visibleTags.length > 0 ? (
 visibleTags.map((tag, index) => (
 <div
 key={tag.id}
 style={{
 display: 'grid',
 gridTemplateColumns: 'auto 1fr auto auto',
 gap: 14,
 alignItems: 'center',
 padding: '14px 20px',
 borderBottom: index < visibleTags.length - 1 ? 'var(--tn-line)' : 'none',
 }}
 >
 <span
 style={{
 width: 14,
 height: 14,
 borderRadius: 4,
 background: tag.color || DEFAULT_COLOR,
 }}
 />
 <b style={{ fontSize: 14, fontWeight: 500 }}>#{tag.name}</b>
 <button
 className="btn btn-ghost"
 style={{ padding: '4px 10px', fontSize: 12 }}
 onClick={() => handleEdit(tag)}
 >
 Edit
 </button>
 <button
 className="btn btn-ghost"
 style={{
 padding: '4px 10px',
 fontSize: 12,
 color: 'var(--tn-bad)',
 }}
 onClick={() => handleDelete(tag)}
 >
 Delete
 </button>
 </div>
 ))
 ) : (
 <div style={{ padding: '28px 20px', color: 'var(--tn-fg-muted)' }}>
 {filter ? 'No tags match this filter.' : 'No tags yet. Create the first one above.'}
 </div>
 )}
 </div>
 </div>
 </div>
 );
};

export default withAuth(TagsPage);
