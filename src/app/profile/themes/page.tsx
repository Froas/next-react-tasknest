'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import {
 DESIGN_THEMES,
 type DesignTheme,
 useDesignTheme,
} from '@/context/DesignThemeContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type Filter = 'all' | 'light' | 'dark' | 'playful' | 'serious';

const FILTERS: { id: Filter; label: string }[] = [
 { id: 'all', label: 'All' },
 { id: 'light', label: 'Light' },
 { id: 'dark', label: 'Dark' },
 { id: 'playful', label: 'Playful' },
 { id: 'serious', label: 'Serious' },
];

function matchesFilter(theme: DesignTheme, filter: Filter): boolean {
 switch (filter) {
 case 'all':
 return true;
 case 'light':
 return !theme.dark;
 case 'dark':
 return !!theme.dark;
 case 'playful':
 return theme.family.toLowerCase().includes('playful');
 case 'serious':
 return theme.family.toLowerCase().includes('serious');
 }
}

export default function ThemesPage() {
 const { theme: current, setTheme, themes } = useDesignTheme();
 const [filter, setFilter] = useState<Filter>('all');

 const filtered = useMemo(
 () => themes.filter((t) => matchesFilter(t, filter)),
 [themes, filter],
 );

 const currentTheme = themes.find((t) => t.id === current);

 return (
 <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
 <div className="mb-2">
 <Link
 href="/profile"
 className="text-sm text-muted-foreground hover:text-foreground"
 >
 ← Settings
 </Link>
 </div>

 <header className="mb-6">
 <h1 className="text-3xl font-semibold tracking-tight">Themes</h1>
 <p className="mt-2 text-muted-foreground">
 Change the entire visual language of TaskNest. Your selection applies
 everywhere and is saved to this device.
 </p>
 </header>

 {currentTheme && (
 <section className="mb-8 rounded-xl border bg-card p-5 shadow-sm">
 <div className="flex items-start justify-between gap-4">
 <div>
 <div className="text-xs uppercase tracking-wider text-muted-foreground">
 Current theme
 </div>
 <div className="mt-1 text-xl font-semibold">
 {currentTheme.name}
 </div>
 <div className="mt-1 text-sm text-muted-foreground">
 {currentTheme.tagline}
 </div>
 </div>
 <div className="flex gap-1.5">
 {currentTheme.swatches.map((c, i) => (
 <span
 key={i}
 className="h-7 w-7 rounded-md border"
 style={{ background: c }}
 aria-hidden
 />
 ))}
 </div>
 </div>
 </section>
 )}

 <div className="mb-6 flex flex-wrap gap-2">
 {FILTERS.map((f) => (
 <Button
 key={f.id}
 variant={filter === f.id ? 'default' : 'outline'}
 size="sm"
 onClick={() => setFilter(f.id)}
 >
 {f.label}
 </Button>
 ))}
 </div>

 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
 {filtered.map((t) => (
 <ThemeCard
 key={t.id}
 theme={t}
 active={t.id === current}
 onPick={() => setTheme(t.id)}
 />
 ))}
 </div>

 <section className="mt-10 rounded-xl border bg-card p-5 shadow-sm">
 <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <h2 className="font-semibold">Preview all screens</h2>
 <p className="mt-1 text-sm text-muted-foreground">
 Open the full design prototype — 50+ screens (Today, Goals,
 Tasks, Calendar, Notes, Review, Settings, auth, modals…) with
 live theme switching. Sample data only.
 </p>
 </div>
 <div className="flex flex-wrap gap-2">
 <Button asChild variant="outline">
 <a href="/design/welcome.html" target="_blank" rel="noreferrer">
 Open prototype ↗
 </a>
 </Button>
 <Button asChild variant="ghost">
 <a href="/design/mobile.html" target="_blank" rel="noreferrer">
 Mobile view
 </a>
 </Button>
 </div>
 </div>
 </section>

 <p className="mt-10 text-center text-xs text-muted-foreground">
 Themes change the visual layer only — your goals, tasks, and data are
 unaffected.
 </p>
 </div>
 );
}

function ThemeCard({
 theme,
 active,
 onPick,
}: {
 theme: DesignTheme;
 active: boolean;
 onPick: () => void;
}) {
 return (
 <button
 type="button"
 onClick={onPick}
 className={cn(
 'group relative flex flex-col overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-all hover:shadow-md',
 active ? 'ring-2 ring-primary' : 'hover:-translate-y-0.5',
 )}
 >
 <ThemePreview theme={theme} />
 <div className="flex items-start justify-between gap-3 p-4">
 <div className="min-w-0">
 <div className="flex items-center gap-2">
 <h3 className="font-semibold">{theme.name}</h3>
 {active && (
 <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
 <Check size={12} />
 Active
 </span>
 )}
 </div>
 <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
 {theme.tagline}
 </p>
 <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
 {theme.family}
 </p>
 </div>
 <div className="flex shrink-0 flex-col gap-1">
 {theme.swatches.map((c, i) => (
 <span
 key={i}
 className="h-4 w-4 rounded border"
 style={{ background: c }}
 aria-hidden
 />
 ))}
 </div>
 </div>
 </button>
 );
}

/**
 * Live mini-preview rendered inside the card. Wrapped with the theme's
 * own `data-theme` attribute so CSS variables resolve from the theme's
 * scoped rules — every card paints itself with its real palette.
 */
function ThemePreview({ theme }: { theme: DesignTheme }) {
 return (
 <div
 data-theme={theme.id}
 className="theme-preview"
 style={{
 background: 'var(--tn-bg)',
 color: 'var(--tn-fg)',
 fontFamily: 'var(--tn-font-sans)',
 borderBottom: 'var(--tn-line)',
 }}
 >
 <div
 style={{
 padding: '12px 14px',
 display: 'grid',
 gridTemplateColumns: '64px 1fr',
 gap: 10,
 minHeight: 130,
 }}
 >
 {/* Mini sidebar */}
 <div
 style={{
 background: 'var(--tn-sidebar-bg, var(--tn-surface))',
 borderRight: 'var(--tn-line)',
 borderRadius: 'var(--tn-r-md, 6px)',
 padding: '8px 6px',
 display: 'flex',
 flexDirection: 'column',
 gap: 4,
 fontSize: 10,
 }}
 >
 <div
 style={{
 width: 18,
 height: 18,
 background: 'var(--tn-accent)',
 color: 'var(--tn-on-accent)',
 borderRadius: 'var(--tn-r-md, 6px)',
 display: 'grid',
 placeItems: 'center',
 fontSize: 10,
 fontWeight: 700,
 }}
 >
 T
 </div>
 <div
 style={{
 marginTop: 6,
 height: 6,
 background: 'var(--tn-active)',
 borderRadius: 4,
 }}
 />
 <div
 style={{
 height: 5,
 background: 'var(--tn-hover)',
 borderRadius: 4,
 }}
 />
 <div
 style={{
 height: 5,
 background: 'var(--tn-hover)',
 borderRadius: 4,
 }}
 />
 </div>

 {/* Mini main */}
 <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
 <div
 style={{
 fontSize: 13,
 fontWeight: 600,
 fontFamily: 'var(--tn-font-display, var(--tn-font-sans))',
 letterSpacing: '-0.01em',
 color: 'var(--tn-fg)',
 }}
 >
 Today
 </div>
 <div
 style={{
 background: 'var(--tn-card)',
 border: 'var(--tn-card-border, var(--tn-line))',
 borderRadius: 'var(--tn-r-lg, 8px)',
 padding: '8px 10px',
 boxShadow: 'var(--tn-shadow)',
 fontSize: 10,
 color: 'var(--tn-fg)',
 }}
 >
 <div
 style={{
 fontWeight: 600,
 marginBottom: 4,
 fontSize: 11,
 }}
 >
 Ship v1
 </div>
 <div
 style={{
 height: 4,
 background: 'var(--tn-bar-bg, rgba(0,0,0,.08))',
 borderRadius: 999,
 overflow: 'hidden',
 }}
 >
 <div
 style={{
 width: '62%',
 height: '100%',
 background: 'var(--tn-accent)',
 }}
 />
 </div>
 </div>
 <div style={{ display: 'flex', gap: 4 }}>
 <span
 style={{
 padding: '2px 6px',
 fontSize: 9,
 fontWeight: 500,
 background: 'var(--tn-st-prog-bg)',
 color: 'var(--tn-st-prog-fg)',
 borderRadius: 999,
 }}
 >
 In progress
 </span>
 <span
 style={{
 padding: '2px 6px',
 fontSize: 9,
 fontWeight: 500,
 background: 'var(--tn-pr-high-bg)',
 color: 'var(--tn-pr-high-fg)',
 borderRadius: 999,
 }}
 >
 High
 </span>
 </div>
 </div>
 </div>
 </div>
 );
}
