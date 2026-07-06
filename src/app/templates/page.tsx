'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { withAuth } from '@/hoc/withAuth';
import { templatesApi, type TemplateItem } from '@/lib/api';

const TAG_PILL_KNOWN = ['brand', 'run', 'read', 'work', 'life'];

const TemplatesPage: React.FC = () => {
 const router = useRouter();
 const [templates, setTemplates] = useState<TemplateItem[]>([]);
 const [loading, setLoading] = useState(true);
 const [instantiatingId, setInstantiatingId] = useState<string | null>(null);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 let cancelled = false;
 (async () => {
 try {
 const data = await templatesApi.getAll();
 if (!cancelled) setTemplates(data);
 } catch (e) {
 if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load templates');
 } finally {
 if (!cancelled) setLoading(false);
 }
 })();
 return () => {
 cancelled = true;
 };
 }, []);

 async function handleUse(id: string) {
 setInstantiatingId(id);
 setError(null);
 try {
 const goal = await templatesApi.instantiate(id);
 router.push(`/goal/${goal.id}`);
 } catch (e) {
 setError(e instanceof Error ? e.message : 'Failed to use template');
 } finally {
 setInstantiatingId(null);
 }
 }

 return (
 <div className="page">
 <div className="page-head">
 <div className="page-eyebrow">
 Templates ·{' '}
 {loading
 ? 'loading…'
 : `${templates.length} starter plan${templates.length === 1 ? '' : 's'}`}
 </div>
 <h1 className="page-title">Start from a template</h1>
 <p className="page-lede">
 Each template is a complete goal with milestones and tasks. Pick
 one — you can change everything later.
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

 {!loading && templates.length === 0 && (
 <div
 className="card"
 style={{
 textAlign: 'center',
 color: 'var(--tn-fg-muted)',
 padding: 40,
 }}
 >
 <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--tn-fg)' }}>
 No templates yet
 </h3>
 <p style={{ fontSize: 13 }}>
 Templates appear here once the backend is seeded or you create
 your own via the API.
 </p>
 </div>
 )}

 <div className="section">
 <div
 style={{
 display: 'grid',
 gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
 gap: 14,
 }}
 >
 {templates.map((t) => {
 const blueprintMilestones = t.blueprint?.milestones?.length ?? 0;
 const blueprintTasks =
 t.blueprint?.milestones?.reduce(
 (a, m) => a + (m.tasks?.length ?? 0),
 0,
 ) ?? 0;
 return (
 <div
 key={t.id}
 className="card"
 style={{
 padding: 18,
 display: 'flex',
 flexDirection: 'column',
 gap: 10,
 }}
 >
 <div
 style={{ display: 'flex', alignItems: 'center', gap: 10 }}
 >
 <div
 className="gc-ico"
 style={{ width: 40, height: 40, fontSize: 20 }}
 >
 {t.emoji || '◯'}
 </div>
 <h3 style={{ fontSize: 15, fontWeight: 600 }}>{t.title}</h3>
 </div>
 {t.description && (
 <p
 style={{
 fontSize: 13,
 color: 'var(--tn-fg-muted)',
 lineHeight: 1.5,
 flex: 1,
 }}
 >
 {t.description}
 </p>
 )}
 <div
 style={{ fontSize: 12, color: 'var(--tn-fg-muted)' }}
 >
 {blueprintMilestones} milestones · {blueprintTasks} tasks
 </div>
 {t.tags && t.tags.length > 0 && (
 <div
 style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}
 >
 {t.tags.map((tg) => (
 <span
 key={tg}
 className={
 TAG_PILL_KNOWN.includes(tg)
 ? `pill tag-${tg}`
 : 'pill'
 }
 >
 {tg}
 </span>
 ))}
 </div>
 )}
 <button
 className="btn btn-primary"
 style={{ marginTop: 4 }}
 onClick={() => handleUse(t.id)}
 disabled={instantiatingId === t.id}
 >
 {instantiatingId === t.id
 ? 'Creating goal…'
 : 'Use this template'}
 </button>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 );
};

export default withAuth(TemplatesPage);
