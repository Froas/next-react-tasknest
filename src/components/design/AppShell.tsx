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

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Bell, Search, Settings as Cog, Menu, X, ChevronDown, LogOut } from 'lucide-react';
import { useDesignTheme } from '@/context/DesignThemeContext';
import { groupNavItems, useNavPreferences } from '@/lib/navPreferences';

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
 const { primaryItems, moreItems } = useNavPreferences();
 const moreGroups = useMemo(() => groupNavItems(moreItems), [moreItems]);
 const moreGroupColumns = useMemo(() => [
 moreGroups.filter((_, index) => index % 2 === 0),
 moreGroups.filter((_, index) => index % 2 === 1),
 ], [moreGroups]);

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
 className="tn-shell-bar"
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
 className="tn-shell-brand"
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
 <span className="tn-shell-brand-name">TaskNest</span>
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
 {primaryItems.map((item) => {
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
 {moreItems.length > 0 && (
 <div style={{ position: 'relative' }}>
 <button
 onClick={() => setMoreOpen((v) => !v)}
 style={{
 padding: '7px 10px',
 fontSize: 13.5,
 color: moreItems.some((i) => isActive(pathname, i.href))
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
 left: '50%',
 transform: 'translateX(-50%)',
 width: 440,
 maxWidth: 'min(440px, calc(100vw - 32px))',
 background: 'var(--tn-card)',
 border: 'var(--tn-line)',
 borderRadius: 'var(--tn-r-lg, 8px)',
 boxShadow:
 'var(--tn-shadow, 0 8px 24px rgba(0,0,0,0.15))',
 padding: 14,
 zIndex: 42,
 display: 'grid',
 gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
 gap: 22,
 }}
 >
 {moreGroupColumns.map((groups, columnIndex) => (
 <div key={columnIndex} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
 {groups.map((group) => (
 <NavGroup key={group.id} label={group.label} items={group.items} pathname={pathname} />
 ))}
 </div>
 ))}
 </div>
 </>
 )}
 </div>
 )}
 </nav>

 {/* Right side icons */}
 <div className="tn-shell-actions" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
 <IconButton onClick={openSearch} ariaLabel="Search">
 <Search size={16} />
 </IconButton>
 <IconButton ariaLabel="Notifications" className="tn-shell-icon-optional">
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
 onClick={() => router.push('/profile#navigation')}
 ariaLabel="Settings"
 className="tn-shell-icon-optional"
 >
 <Cog size={16} />
 </IconButton>
 <IconButton
 onClick={() => void signOut({ callbackUrl: '/login' })}
 ariaLabel="Sign out"
 className="tn-shell-icon-optional"
 >
 <LogOut size={16} />
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
 className="tn-shell-main"
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
 type="button"
 onClick={() => void signOut({ callbackUrl: '/login' })}
 style={{
 background: 'transparent',
 border: 'none',
 cursor: 'pointer',
 color: 'var(--tn-fg-muted)',
 padding: 8,
 display: 'grid',
 placeItems: 'center',
 borderRadius: 'var(--tn-r-md, 6px)',
 }}
 aria-label="Sign out"
 title="Sign out"
 >
 <LogOut size={18} />
 </button>
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
 {primaryItems.map((item) => {
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
 {moreGroups.length > 0 && (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 14, paddingTop: 16, borderTop: 'var(--tn-line)' }}>
 {moreGroups.map((group) => (
 <NavGroup key={group.id} label={group.label} items={group.items} pathname={pathname} mobile />
 ))}
 </div>
 )}
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
 <button
 type="button"
 onClick={() => void signOut({ callbackUrl: '/login' })}
 style={{
 padding: '10px 12px',
 fontSize: 14,
 color: 'var(--tn-fg-muted)',
 background: 'transparent',
 border: 'none',
 borderRadius: 'var(--tn-r-md, 6px)',
 textAlign: 'left',
 cursor: 'pointer',
 fontFamily: 'inherit',
 }}
 >
 Sign out
 </button>
 </div>
 </aside>
 </>
 )}

 {/* Inline styles for breakpoint behaviour */}
 <style jsx>{`
 @media (max-width: 880px) {
 :global(.tn-shell-bar) {
 padding: 10px 16px !important;
 gap: 10px !important;
 }
 :global(.tn-shell-nav) {
 display: none !important;
 }
 :global(.tn-shell-actions) {
 margin-left: auto !important;
 gap: 2px !important;
 }
 :global(.tn-shell-hamburger) {
 display: grid !important;
 }
 :global(.tn-shell-main) {
 padding: 16px !important;
 }
 }
 @media (max-width: 520px) {
 :global(.tn-shell-bar) {
 padding: 8px 12px !important;
 gap: 8px !important;
 }
 :global(.tn-shell-brand) {
 min-width: 0 !important;
 gap: 7px !important;
 }
 :global(.tn-shell-brand-name) {
 max-width: 86px;
 overflow: hidden;
 text-overflow: ellipsis;
 white-space: nowrap;
 }
 :global(.tn-shell-icon) {
 width: 44px !important;
 height: 44px !important;
 }
 :global(.tn-shell-icon-optional) {
 display: none !important;
 }
 :global(.tn-shell-hamburger) {
 width: 44px !important;
 height: 44px !important;
 }
 :global(.tn-shell-main) {
 padding: 12px !important;
 }
 }
 `}</style>
 </div>
 );
}

function NavGroup({
 label,
 items,
 pathname,
 mobile = false,
}: {
 label: string;
 items: ReturnType<typeof groupNavItems>[number]['items'];
 pathname: string;
 mobile?: boolean;
}) {
 return (
 <section style={{ minWidth: 0 }}>
 <div
 style={{
 padding: mobile ? '0 12px 5px' : '0 8px 5px',
 color: 'var(--tn-fg-muted)',
 fontSize: 10.5,
 fontWeight: 700,
 letterSpacing: '.09em',
 textTransform: 'uppercase',
 opacity: 0.72,
 }}
 >
 {label}
 </div>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
 {items.map((item) => {
 const active = isActive(pathname, item.href);
 return (
 <Link
 key={item.id}
 href={item.href}
 style={{
 padding: mobile ? '9px 12px' : '7px 8px',
 fontSize: mobile ? 14 : 13.5,
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
 </div>
 </section>
 );
}

function IconButton({
 children,
 onClick,
 ariaLabel,
 className,
}: {
 children: React.ReactNode;
 onClick?: () => void;
 ariaLabel: string;
 className?: string;
}) {
 return (
 <button
 onClick={onClick}
 aria-label={ariaLabel}
 className={`tn-shell-icon${className ? ` ${className}` : ''}`}
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
