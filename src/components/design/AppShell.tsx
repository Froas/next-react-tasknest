'use client';

/**
 * App shell — TOP horizontal navbar variant.
 *
 * Renders all routes inside a sticky top navbar (logo + horizontal nav +
 * theme-aware search/notifications/settings icons) with full-width content
 * beneath. Mobile: condenses to a hamburger that opens a drawer.
 *
 * Replaces the earlier sidebar layout per user request. Uses the same
 * `--tn-*` design tokens so theme switching repaints chrome instantly.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Search, Settings as Cog, Menu, X, ChevronDown } from 'lucide-react';
import { useDesignTheme } from '@/context/DesignThemeContext';

interface NavItem {
 id: string;
 name: string;
 href: string;
}

// Compact primary nav across the top.
const PRIMARY_NAV: NavItem[] = [
 { id: 'today', name: 'Today', href: '/' },
 { id: 'goals', name: 'Goals', href: '/goal' },
 { id: 'milestones', name: 'Milestones', href: '/milestone' },
 { id: 'tasks', name: 'Tasks', href: '/task' },
 { id: 'todos', name: 'Todos', href: '/todo' },
 { id: 'events', name: 'Events', href: '/event' },
 { id: 'calendar', name: 'Calendar', href: '/calendar' },
];

// Secondary nav lives under a"More" dropdown so the top bar doesn't wrap.
const MORE_NAV: NavItem[] = [
 { id: 'notes', name: 'Notes', href: '/notes' },
 { id: 'tags', name: 'Tags', href: '/tags' },
 { id: 'review', name: 'Review', href: '/review' },
 { id: 'visualization', name: 'Visualization', href: '/visualization' },
 { id: 'templates', name: 'Templates', href: '/templates' },
 { id: 'archive', name: 'Archive', href: '/goal/archive' },
 { id: 'trash', name: 'Trash', href: '/trash' },
 { id: 'activity', name: 'Activity', href: '/activity' },
];

const ALL_NAV = [...PRIMARY_NAV, ...MORE_NAV];

function isActive(pathname: string, href: string): boolean {
 if (href === '/') return pathname === '/';
 return pathname === href || pathname.startsWith(href + '/');
}

interface AppShellProps {
 children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
 const pathname = usePathname() ?? '/';
 const router = useRouter();
 const [mobileOpen, setMobileOpen] = useState(false);
 const [moreOpen, setMoreOpen] = useState(false);
 const { theme, current } = useDesignTheme();

 useEffect(() => {
 setMobileOpen(false);
 setMoreOpen(false);
 }, [pathname]);

 function openSearch() {
 // Custom event — CommandPalette listens for this. Synthetic keyboard
 // events with metaKey don't always dispatch through React's listener.
 document.dispatchEvent(new Event('tasknest:open-command-palette'));
 }

 return (
 <div
 className="tn-shell"
 style={{
 minHeight: '100vh',
 background: 'var(--tn-bg, #ffffff)',
 color: 'var(--tn-fg, #111)',
 fontFamily: 'var(--tn-font-sans, system-ui, sans-serif)',
 }}
 >
 <header
 style={{
 position: 'sticky',
 top: 0,
 zIndex: 40,
 background: 'var(--tn-card, var(--tn-surface, #ffffff))',
 borderBottom: 'var(--tn-line, 1px solid rgba(0,0,0,.08))',
 backdropFilter: 'saturate(1.4) blur(8px)',
 }}
 >
 <div
 style={{
 maxWidth: 1400,
 margin: '0 auto',
 display: 'flex',
 alignItems: 'center',
 gap: 14,
 padding: '10px 24px',
 }}
 >
 {/* Brand */}
 <Link
 href="/"
 style={{
 display: 'flex',
 alignItems: 'center',
 gap: 8,
 color: 'inherit',
 textDecoration: 'none',
 fontWeight: 700,
 fontSize: 15,
 fontFamily: 'var(--tn-font-display, var(--tn-font-sans))',
 flexShrink: 0,
 }}
 >
 <span
 style={{
 width: 26,
 height: 26,
 borderRadius: 'var(--tn-r-md, 6px)',
 background: 'var(--tn-accent, #2d6cdf)',
 color: 'var(--tn-on-accent, #fff)',
 display: 'grid',
 placeItems: 'center',
 fontWeight: 700,
 fontSize: 13,
 }}
 >
 T
 </span>
 <span>TaskNest</span>
 </Link>

 {/* Desktop nav */}
 <nav
 className="tn-shell-nav"
 style={{
 display: 'flex',
 alignItems: 'center',
 gap: 2,
 flex: 1,
 // No overflow:hidden — would clip the More dropdown.
 minWidth: 0,
 }}
 >
 {PRIMARY_NAV.map((item) => {
 const active = isActive(pathname, item.href);
 return (
 <Link
 key={item.id}
 href={item.href}
 style={{
 padding: '7px 12px',
 fontSize: 13.5,
 // Use accent+on-accent for active state — guaranteed contrasting
 // pair in every theme. (Brutalist had --tn-active == --tn-fg
 // both #0a0a0a, producing black text on black bg.)
 color: active ? 'var(--tn-on-accent)' : 'var(--tn-fg-muted)',
 fontWeight: active ? 600 : 500,
 borderRadius: 'var(--tn-r-md, 6px)',
 background: active ? 'var(--tn-accent)' : 'transparent',
 textDecoration: 'none',
 whiteSpace: 'nowrap',
 }}
 >
 {item.name}
 </Link>
 );
 })}

 {/* More dropdown */}
 <div style={{ position: 'relative' }}>
 <button
 onClick={() => setMoreOpen((v) => !v)}
 style={{
 padding: '7px 10px',
 fontSize: 13.5,
 color: MORE_NAV.some((i) => isActive(pathname, i.href))
 ? 'var(--tn-fg)'
 : 'var(--tn-fg-muted)',
 fontWeight: 500,
 background: 'transparent',
 border: 'none',
 cursor: 'pointer',
 display: 'inline-flex',
 alignItems: 'center',
 gap: 3,
 borderRadius: 'var(--tn-r-md, 6px)',
 }}
 aria-haspopup="true"
 aria-expanded={moreOpen}
 >
 More <ChevronDown size={13} />
 </button>
 {moreOpen && (
 <>
 <div
 onClick={() => setMoreOpen(false)}
 style={{
 position: 'fixed',
 inset: 0,
 zIndex: 41,
 }}
 />
 <div
 style={{
 position: 'absolute',
 top: 'calc(100% + 4px)',
 right: 0,
 minWidth: 200,
 background: 'var(--tn-card)',
 border: 'var(--tn-line)',
 borderRadius: 'var(--tn-r-lg, 8px)',
 boxShadow:
 'var(--tn-shadow, 0 8px 24px rgba(0,0,0,0.15))',
 padding: 6,
 zIndex: 42,
 display: 'flex',
 flexDirection: 'column',
 gap: 1,
 }}
 >
 {MORE_NAV.map((item) => {
 const active = isActive(pathname, item.href);
 return (
 <Link
 key={item.id}
 href={item.href}
 style={{
 padding: '8px 12px',
 fontSize: 13.5,
 color: active
 ? 'var(--tn-on-accent)'
 : 'var(--tn-fg-muted)',
 background: active
 ? 'var(--tn-accent)'
 : 'transparent',
 borderRadius: 'var(--tn-r-md, 6px)',
 textDecoration: 'none',
 fontWeight: active ? 600 : 500,
 }}
 >
 {item.name}
 </Link>
 );
 })}
 </div>
 </>
 )}
 </div>
 </nav>

 {/* Right side icons */}
 <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
 <IconButton onClick={openSearch} ariaLabel="Search">
 <Search size={16} />
 </IconButton>
 <IconButton ariaLabel="Notifications">
 <Bell size={16} />
 </IconButton>
 <IconButton
 onClick={() => router.push('/profile/themes')}
 ariaLabel="Themes"
 >
 <span
 style={{
 width: 14,
 height: 14,
 borderRadius: 4,
 background: current.swatches[1],
 border: `2px solid ${current.swatches[3] || current.swatches[1]}`,
 }}
 />
 </IconButton>
 <IconButton
 onClick={() => router.push('/profile')}
 ariaLabel="Settings"
 >
 <Cog size={16} />
 </IconButton>
 {/* Mobile hamburger */}
 <button
 onClick={() => setMobileOpen(true)}
 className="tn-shell-hamburger"
 aria-label="Open menu"
 style={{
 width: 32,
 height: 32,
 display: 'none',
 placeItems: 'center',
 background: 'transparent',
 border: 'none',
 cursor: 'pointer',
 color: 'inherit',
 borderRadius: 'var(--tn-r-md, 6px)',
 }}
 >
 <Menu size={18} />
 </button>
 </div>
 </div>
 </header>

 {/* Main content */}
 <main
 style={{
 maxWidth: 1400,
 margin: '0 auto',
 padding: '24px',
 minHeight: 'calc(100vh - 60px)',
 }}
 >
 {children}
 </main>

 {/* Mobile drawer */}
 {mobileOpen && (
 <>
 <div
 onClick={() => setMobileOpen(false)}
 style={{
 position: 'fixed',
 inset: 0,
 background: 'rgba(0,0,0,0.5)',
 zIndex: 60,
 }}
 />
 <aside
 style={{
 position: 'fixed',
 top: 0,
 right: 0,
 bottom: 0,
 width: 'min(82%, 320px)',
 background: 'var(--tn-card)',
 borderLeft: 'var(--tn-line)',
 padding: '14px 14px 24px',
 zIndex: 61,
 display: 'flex',
 flexDirection: 'column',
 gap: 4,
 overflowY: 'auto',
 }}
 >
 <div
 style={{
 display: 'flex',
 alignItems: 'center',
 marginBottom: 12,
 }}
 >
 <b style={{ fontSize: 14, fontWeight: 600 }}>Menu</b>
 <div style={{ flex: 1 }} />
 <button
 onClick={() => setMobileOpen(false)}
 style={{
 background: 'transparent',
 border: 'none',
 cursor: 'pointer',
 color: 'inherit',
 padding: 4,
 }}
 aria-label="Close"
 >
 <X size={18} />
 </button>
 </div>
 {ALL_NAV.map((item) => {
 const active = isActive(pathname, item.href);
 return (
 <Link
 key={item.id}
 href={item.href}
 onClick={() => setMobileOpen(false)}
 style={{
 padding: '10px 12px',
 fontSize: 14,
 color: active ? 'var(--tn-on-accent)' : 'var(--tn-fg-muted)',
 background: active ? 'var(--tn-accent)' : 'transparent',
 borderRadius: 'var(--tn-r-md, 6px)',
 textDecoration: 'none',
 fontWeight: active ? 600 : 500,
 }}
 >
 {item.name}
 </Link>
 );
 })}
 <div
 style={{
 marginTop: 12,
 paddingTop: 12,
 borderTop: 'var(--tn-line)',
 display: 'flex',
 flexDirection: 'column',
 gap: 4,
 }}
 >
 <Link
 href="/profile/themes"
 style={{
 padding: '10px 12px',
 fontSize: 14,
 color: 'var(--tn-fg-muted)',
 borderRadius: 'var(--tn-r-md, 6px)',
 textDecoration: 'none',
 }}
 >
 Themes
 </Link>
 <Link
 href="/profile"
 style={{
 padding: '10px 12px',
 fontSize: 14,
 color: 'var(--tn-fg-muted)',
 borderRadius: 'var(--tn-r-md, 6px)',
 textDecoration: 'none',
 }}
 >
 Settings
 </Link>
 </div>
 </aside>
 </>
 )}

 {/* Inline styles for breakpoint behaviour */}
 <style jsx>{`
 @media (max-width: 880px) {
 :global(.tn-shell-nav) {
 display: none !important;
 }
 :global(.tn-shell-hamburger) {
 display: grid !important;
 }
 }
 `}</style>
 </div>
 );
}

function IconButton({
 children,
 onClick,
 ariaLabel,
}: {
 children: React.ReactNode;
 onClick?: () => void;
 ariaLabel: string;
}) {
 return (
 <button
 onClick={onClick}
 aria-label={ariaLabel}
 style={{
 width: 32,
 height: 32,
 display: 'grid',
 placeItems: 'center',
 background: 'transparent',
 border: 'none',
 cursor: 'pointer',
 color: 'inherit',
 borderRadius: 'var(--tn-r-md, 6px)',
 }}
 >
 {children}
 </button>
 );
}
