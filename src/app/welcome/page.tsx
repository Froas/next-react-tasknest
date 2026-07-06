'use client';

import React from 'react';
import Link from 'next/link';
import { withAuth } from '@/hoc/withAuth';
import { useDesignTheme, DESIGN_THEMES } from '@/context/DesignThemeContext';

const WelcomePage: React.FC = () => {
 const { theme, setTheme, current } = useDesignTheme();

 return (
 <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>
 {/* Hero */}
 <div
 style={{
 display: 'flex',
 alignItems: 'center',
 gap: 14,
 marginBottom: 24,
 }}
 >
 <span
 style={{
 width: 48,
 height: 48,
 borderRadius: 'var(--tn-r-lg, 10px)',
 background: 'var(--tn-fg)',
 color: 'var(--tn-bg)',
 display: 'grid',
 placeItems: 'center',
 fontWeight: 700,
 fontSize: 22,
 fontFamily: 'var(--tn-font-display, var(--tn-font-sans))',
 }}
 >
 T
 </span>
 <h2
 style={{
 fontSize: 22,
 fontWeight: 600,
 letterSpacing: '-0.01em',
 color: 'var(--tn-fg)',
 fontFamily: 'var(--tn-font-display, var(--tn-font-sans))',
 }}
 >
 TaskNest
 </h2>
 </div>

 <h1
 style={{
 fontSize: 'clamp(38px, 5vw, 60px)',
 fontWeight: 700,
 letterSpacing: '-0.03em',
 lineHeight: 1.05,
 marginBottom: 24,
 fontFamily: 'var(--tn-font-display, var(--tn-font-sans))',
 color: 'var(--tn-fg)',
 }}
 >
 Roadmap as a Service.{' '}
 <span style={{ color: 'var(--tn-fg-muted)' }}>
 One app, 13 themes, real switcher.
 </span>
 </h1>

 <p
 style={{
 fontSize: 17,
 lineHeight: 1.6,
 color: 'var(--tn-fg-muted)',
 maxWidth: 680,
 marginBottom: 40,
 }}
 >
 Big goals broken into milestones, tasks and daily todos. Pick a theme
 that matches your mood, the time of day, or the kind of work ahead —
 your data stays the same, the whole product reskins.
 </p>

 <div
 style={{
 display: 'grid',
 gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
 gap: 16,
 marginBottom: 48,
 }}
 >
 {/* Open the app */}
 <Link
 href="/"
 style={{
 background: 'var(--tn-fg)',
 color: 'var(--tn-bg)',
 padding: 28,
 borderRadius: 'var(--tn-r-lg, 14px)',
 textDecoration: 'none',
 display: 'flex',
 flexDirection: 'column',
 gap: 12,
 minHeight: 200,
 }}
 >
 <span
 style={{
 fontSize: 11,
 letterSpacing: '0.1em',
 textTransform: 'uppercase',
 opacity: 0.6,
 }}
 >
 Start
 </span>
 <h3
 style={{
 fontSize: 22,
 fontWeight: 600,
 letterSpacing: '-0.01em',
 }}
 >
 Open the app →
 </h3>
 <p style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.5 }}>
 Dashboard, goals, tasks, calendar, notes, review — everything you
 built so far in the active theme:{' '}
 <b style={{ opacity: 1 }}>{current.name}</b>.
 </p>
 </Link>

 {/* Browse themes */}
 <Link
 href="/profile/themes"
 style={{
 background: 'var(--tn-card)',
 border: 'var(--tn-line)',
 padding: 28,
 borderRadius: 'var(--tn-r-lg, 14px)',
 textDecoration: 'none',
 color: 'var(--tn-fg)',
 display: 'flex',
 flexDirection: 'column',
 gap: 12,
 minHeight: 200,
 boxShadow: 'var(--tn-shadow)',
 }}
 >
 <span
 style={{
 fontSize: 11,
 letterSpacing: '0.1em',
 textTransform: 'uppercase',
 color: 'var(--tn-fg-muted)',
 }}
 >
 Customise
 </span>
 <h3
 style={{
 fontSize: 22,
 fontWeight: 600,
 letterSpacing: '-0.01em',
 }}
 >
 Browse themes
 </h3>
 <p
 style={{
 fontSize: 13,
 color: 'var(--tn-fg-muted)',
 lineHeight: 1.5,
 }}
 >
 13 fully-built design systems. Click to apply, your choice follows
 your account.
 </p>
 <div
 style={{
 display: 'flex',
 gap: 6,
 marginTop: 'auto',
 flexWrap: 'wrap',
 }}
 >
 {DESIGN_THEMES.slice(0, 8).map((t) => (
 <span
 key={t.id}
 title={t.name}
 style={{
 width: 18,
 height: 18,
 borderRadius: 4,
 background: t.swatches[1],
 border: `2px solid ${t.swatches[3] || t.swatches[1]}`,
 }}
 />
 ))}
 <span
 style={{
 fontSize: 11,
 color: 'var(--tn-fg-muted)',
 alignSelf: 'center',
 }}
 >
 + {DESIGN_THEMES.length - 8} more
 </span>
 </div>
 </Link>

 {/* Prototype */}
 <a
 href="/design/welcome.html"
 target="_blank"
 rel="noreferrer"
 style={{
 background: 'var(--tn-card)',
 border: 'var(--tn-line)',
 padding: 28,
 borderRadius: 'var(--tn-r-lg, 14px)',
 textDecoration: 'none',
 color: 'var(--tn-fg)',
 display: 'flex',
 flexDirection: 'column',
 gap: 12,
 minHeight: 200,
 boxShadow: 'var(--tn-shadow)',
 }}
 >
 <span
 style={{
 fontSize: 11,
 letterSpacing: '0.1em',
 textTransform: 'uppercase',
 color: 'var(--tn-fg-muted)',
 }}
 >
 Preview
 </span>
 <h3
 style={{
 fontSize: 22,
 fontWeight: 600,
 letterSpacing: '-0.01em',
 }}
 >
 Design prototype ↗
 </h3>
 <p
 style={{
 fontSize: 13,
 color: 'var(--tn-fg-muted)',
 lineHeight: 1.5,
 }}
 >
 Static HTML prototype with all 50+ screens (auth, modals, edge
 states, mobile) — sample data only.
 </p>
 </a>
 </div>

 {/* Quick theme jump */}
 <section>
 <div
 style={{
 fontSize: 11,
 letterSpacing: '0.1em',
 textTransform: 'uppercase',
 color: 'var(--tn-fg-muted)',
 marginBottom: 12,
 }}
 >
 Quick theme jump
 </div>
 <div
 style={{
 display: 'grid',
 gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
 gap: 8,
 }}
 >
 {DESIGN_THEMES.map((t) => {
 const active = t.id === theme;
 return (
 <button
 key={t.id}
 onClick={() => setTheme(t.id)}
 style={{
 display: 'flex',
 alignItems: 'center',
 gap: 10,
 padding: '10px 12px',
 background: active ? 'var(--tn-active)' : 'var(--tn-card)',
 border: 'var(--tn-line)',
 borderRadius: 'var(--tn-r-md, 8px)',
 color: 'var(--tn-fg)',
 cursor: 'pointer',
 textAlign: 'left',
 fontWeight: active ? 600 : 500,
 fontSize: 13,
 }}
 aria-label={`Switch to ${t.name} theme`}
 >
 <span
 style={{
 width: 22,
 height: 22,
 borderRadius: 4,
 background: `linear-gradient(135deg, ${t.swatches[0]} 0% 50%, ${t.swatches[1]} 50% 100%)`,
 border: `1px solid ${t.swatches[2] || 'rgba(0,0,0,0.1)'}`,
 flexShrink: 0,
 }}
 />
 <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
 {t.name}
 </span>
 {active && (
 <span
 style={{
 fontSize: 10,
 color: 'var(--tn-fg-muted)',
 }}
 >
 ✓
 </span>
 )}
 </button>
 );
 })}
 </div>
 </section>
 </div>
 );
};

export default withAuth(WelcomePage);
