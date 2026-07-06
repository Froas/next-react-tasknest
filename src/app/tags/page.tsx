'use client';

import React from 'react';
import { withAuth } from '@/hoc/withAuth';

const TAGS = [
 { name: 'brand', color: '#d8855a', count: 12 },
 { name: 'run', color: '#6a8a5a', count: 6 },
 { name: 'read', color: '#5a6f8c', count: 4 },
 { name: 'work', color: '#8a6594', count: 8 },
 { name: 'life', color: '#c25d63', count: 5 },
 { name: 'portfolio', color: '#c8932a', count: 7 },
 { name: 'health', color: '#4d6b3a', count: 3 },
 { name: 'learning', color: '#2f4858', count: 9 },
 { name: 'side-project', color: '#a14424', count: 11 },
];

const TagsPage: React.FC = () => {
 const totalItems = TAGS.reduce((a, t) => a + t.count, 0);
 return (
 <div className="page">
 <div className="page-head">
 <div className="page-eyebrow">
 {TAGS.length} tags · {totalItems} items
 </div>
 <h1 className="page-title">Tags</h1>
 <p className="page-lede">
 Tags cut across the goal hierarchy — group things by theme, not
 structure.
 </p>
 </div>
 <div className="section">
 <div style={{ display: 'flex', marginBottom: 18, gap: 10 }}>
 <input
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
 <div style={{ flex: 1 }} />
 <button className="btn btn-primary">+ New tag</button>
 </div>
 <div className="card" style={{ padding: 0 }}>
 {TAGS.map((t, i) => (
 <div
 key={t.name}
 style={{
 display: 'grid',
 gridTemplateColumns: 'auto 1fr auto auto auto',
 gap: 14,
 alignItems: 'center',
 padding: '14px 20px',
 borderBottom:
 i < TAGS.length - 1 ? 'var(--tn-line)' : 'none',
 }}
 >
 <span
 style={{
 width: 14,
 height: 14,
 borderRadius: 4,
 background: t.color,
 }}
 />
 <b style={{ fontSize: 14, fontWeight: 500 }}>#{t.name}</b>
 <span
 style={{ fontSize: 12.5, color: 'var(--tn-fg-muted)' }}
 >
 {t.count} items
 </span>
 <button
 className="btn btn-ghost"
 style={{ padding: '4px 10px', fontSize: 12 }}
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
 >
 Delete
 </button>
 </div>
 ))}
 </div>
 </div>
 </div>
 );
};

export default withAuth(TagsPage);
