'use client';

import React from 'react';
import { withAuth } from '@/hoc/withAuth';

const ReviewPage: React.FC = () => {
 return (
 <div className="page">
 <div className="page-head">
 <div className="page-eyebrow">This week</div>
 <h1 className="page-title">Review</h1>
 <p className="page-lede">
 A weekly look at where you spent attention, and where the work
 moved.
 </p>
 </div>

 <div className="section">
 <div className="stats">
 <div className="stat">
 <div className="s-label">Tasks closed</div>
 <div className="s-value">12</div>
 <div className="s-delta up">+3 vs last week</div>
 </div>
 <div className="stat">
 <div className="s-label">Focus hours</div>
 <div className="s-value">42.5</div>
 <div className="s-delta up">+18% vs avg</div>
 </div>
 <div className="stat">
 <div className="s-label">Streak</div>
 <div className="s-value">
 13<small>d</small>
 </div>
 <div className="s-delta">writing unbroken</div>
 </div>
 <div className="stat">
 <div className="s-label">Overdue</div>
 <div className="s-value">1</div>
 <div className="s-delta down">deploy-to-vercel</div>
 </div>
 </div>
 </div>

 <div className="section">
 <div className="section-head">
 <h2>Time, by goal</h2>
 </div>
 <div className="card">
 <div
 style={{
 display: 'flex',
 gap: 0,
 height: 12,
 borderRadius: 6,
 overflow: 'hidden',
 marginBottom: 14,
 }}
 >
 <div style={{ flex: 38, background: 'var(--tn-warm)' }} />
 <div style={{ flex: 24, background: 'var(--tn-moss)' }} />
 <div style={{ flex: 22, background: 'var(--tn-slate)' }} />
 <div style={{ flex: 16, background: 'var(--tn-plum)' }} />
 </div>
 <div
 style={{
 display: 'grid',
 gridTemplateColumns: 'repeat(4, 1fr)',
 gap: 14,
 }}
 >
 {[
 { color: 'var(--tn-warm)', label: 'Brand', hours: '16.2' },
 { color: 'var(--tn-moss)', label: 'Run', hours: '10.0' },
 { color: 'var(--tn-slate)', label: 'Read', hours: '9.3' },
 { color: 'var(--tn-plum)', label: 'Work', hours: '7.0' },
 ].map((row) => (
 <div key={row.label}>
 <div
 style={{
 display: 'flex',
 alignItems: 'center',
 gap: 6,
 marginBottom: 4,
 }}
 >
 <span
 style={{
 width: 10,
 height: 10,
 borderRadius: 3,
 background: row.color,
 }}
 />
 <b style={{ fontSize: 13 }}>{row.label}</b>
 </div>
 <div
 style={{
 fontSize: 22,
 fontWeight: 600,
 letterSpacing: '-0.02em',
 }}
 >
 {row.hours}
 <small
 style={{
 fontSize: 12,
 color: 'var(--tn-fg-muted)',
 fontWeight: 400,
 }}
 >
 h
 </small>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>

 <div className="section">
 <div className="section-head">
 <h2>Wins &amp; misses</h2>
 </div>
 <div
 style={{
 display: 'grid',
 gridTemplateColumns: '1fr 1fr',
 gap: 16,
 }}
 >
 <div className="card">
 <h3
 style={{
 fontSize: 14,
 color: 'var(--tn-good)',
 marginBottom: 12,
 letterSpacing: '0.04em',
 textTransform: 'uppercase',
 }}
 >
 ★ Wins
 </h3>
 <ul
 style={{
 listStyle: 'none',
 display: 'flex',
 flexDirection: 'column',
 gap: 8,
 padding: 0,
 margin: 0,
 }}
 >
 <li style={{ fontSize: 14 }}>
 ✓ Shipped the MDX parser ahead of schedule.
 </li>
 <li style={{ fontSize: 14 }}>
 ✓ 13-day writing streak — longest this year.
 </li>
 <li style={{ fontSize: 14 }}>
 ✓ Beta call confirmed import bug priority.
 </li>
 </ul>
 </div>
 <div className="card">
 <h3
 style={{
 fontSize: 14,
 color: 'var(--tn-bad)',
 marginBottom: 12,
 letterSpacing: '0.04em',
 textTransform: 'uppercase',
 }}
 >
 ○ Misses
 </h3>
 <ul
 style={{
 listStyle: 'none',
 display: 'flex',
 flexDirection: 'column',
 gap: 8,
 padding: 0,
 margin: 0,
 }}
 >
 <li style={{ fontSize: 14 }}>
 ○ Deploy slipped past target date.
 </li>
 <li style={{ fontSize: 14 }}>
 ○ Missed Saturday's long run — recovered Sunday.
 </li>
 <li style={{ fontSize: 14 }}>
 ○ Case study draft still at 0%.
 </li>
 </ul>
 </div>
 </div>
 </div>
 </div>
 );
};

export default withAuth(ReviewPage);
