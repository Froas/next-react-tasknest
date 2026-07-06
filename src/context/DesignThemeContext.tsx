'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type DesignThemeId =
 | 'notion'
 | 'glass'
 | 'bento'
 | 'glass-dark'
 | 'terminal'
 | 'brutalist'
 | 'pixel'
 | 'memphis'
 | 'sketchbook'
 | 'adventure'
 | 'solarpunk'
 | 'cottagecore'
 | 'cyber';

export interface DesignTheme {
 id: DesignThemeId;
 name: string;
 tagline: string;
 swatches: [string, string, string, string];
 family: string;
 dark?: boolean;
 mono?: boolean;
}

export const DESIGN_THEMES: DesignTheme[] = [
 {
 id: 'notion',
 name: 'Doc-style',
 tagline: 'Sidebar + main + properties. Goals as living documents.',
 swatches: ['#ffffff', '#37352f', '#f7f6f3', '#2d6cdf'],
 family: 'Light · Serious',
 },
 {
 id: 'glass',
 name: 'Liquid Glass',
 tagline: 'visionOS-inspired frosted panels on a soft painterly atmosphere.',
 swatches: ['#f3d6c8', '#d8855a', '#14141a', '#6a8a5a'],
 family: 'Light · Refined',
 },
 {
 id: 'bento',
 name: 'Bento',
 tagline: 'Colourful iOS-widget tiles. Glanceable and friendly.',
 swatches: ['#161616', '#ff7a3d', '#fff4dc', '#d4f5e0'],
 family: 'Light · Playful',
 },
 {
 id: 'glass-dark',
 name: 'Glass — Dark',
 tagline: 'Frosted panels, ambient orbs, neon highlights. Late-night focus mode.',
 swatches: ['#0a0612', '#ff5fa2', '#5fe3ff', '#9d6dff'],
 family: 'Dark',
 dark: true,
 },
 {
 id: 'terminal',
 name: 'Terminal',
 tagline: 'Sidebar, log tail, REPL prompt. For mechanical-keyboard people.',
 swatches: ['#0d1117', '#7ee787', '#79c0ff', '#f2cc60'],
 family: 'Dark · Serious',
 dark: true,
 mono: true,
 },
 {
 id: 'brutalist',
 name: 'Brutalist Mono',
 tagline: 'Black, white, three-pixel rules. No radius. No mercy.',
 swatches: ['#ffffff', '#000000', '#666666', '#eeeeee'],
 family: 'Light · Serious',
 mono: true,
 },
 {
 id: 'pixel',
 name: 'Pixel — Muted',
 tagline: 'Game Boy / Playdate palette. Sage, clay, gold, paper.',
 swatches: ['#d8d4c4', '#2a2823', '#6b8e7f', '#a87b5a'],
 family: 'Light · Playful',
 mono: true,
 },
 {
 id: 'memphis',
 name:"Memphis '85",
 tagline: 'Postmodern playground. Squiggles, zigzags, dot patterns, hard shadows.',
 swatches: ['#fef6e0', '#ff4fa3', '#00b8c4', '#ffd028'],
 family: 'Light · Playful',
 },
 {
 id: 'sketchbook',
 name: 'Sketchbook',
 tagline: 'Hand-drawn frames, dashed dividers, scattered stickers.',
 swatches: ['#f7f1e3', '#2a2418', '#c44a3a', '#d8a92a'],
 family: 'Light · Playful',
 },
 {
 id: 'adventure',
 name: 'Adventure',
 tagline: 'Parchment, sealed scrolls, gold leaf. Goals as campaigns.',
 swatches: ['#f1e3c2', '#3a2814', '#c8932a', '#a14424'],
 family: 'Light · Playful',
 },
 {
 id: 'solarpunk',
 name: 'Solarpunk',
 tagline: 'Warm honey gradient, leaf-green accents. Hopeful, sun-on-skin.',
 swatches: ['#fef6e0', '#e8a948', '#7a9968', '#2d4a3a'],
 family: 'Light · Refined',
 },
 {
 id: 'cottagecore',
 name: 'Cottagecore',
 tagline: 'Soft botanicals — sage, clay, oat. Gentle and slow.',
 swatches: ['#f5ecdf', '#7a9968', '#c08465', '#4a3b2e'],
 family: 'Light · Refined',
 },
 {
 id: 'cyber',
 name: 'Cyberpunk Neon',
 tagline: 'Hot pink, electric cyan, grid floor. For shipping at 3am.',
 swatches: ['#0a0014', '#ff00b4', '#00ffc8', '#ffd700'],
 family: 'Dark · High contrast',
 dark: true,
 },
];

const DEFAULT_THEME: DesignThemeId = 'notion';
const STORAGE_KEY = 'tasknest-design-theme';

interface DesignThemeContextValue {
 theme: DesignThemeId;
 setTheme: (id: DesignThemeId) => void;
 themes: DesignTheme[];
 current: DesignTheme;
}

const DesignThemeContext = createContext<DesignThemeContextValue | undefined>(
 undefined,
);

export function useDesignTheme(): DesignThemeContextValue {
 const ctx = useContext(DesignThemeContext);
 if (!ctx) {
 throw new Error('useDesignTheme must be used inside <DesignThemeProvider>');
 }
 return ctx;
}

export function DesignThemeProvider({ children }: { children: React.ReactNode }) {
 const [theme, setThemeState] = useState<DesignThemeId>(DEFAULT_THEME);

 // Hydrate from localStorage immediately on mount (no network round-trip
 // means no FOUC). Then, in a second effect, fetch the user's
 // server-stored preferred_theme — if it differs, switch to it. This
 // means: device default first, then account override second.
 useEffect(() => {
 try {
 const saved = window.localStorage.getItem(STORAGE_KEY);
 if (saved && DESIGN_THEMES.some((t) => t.id === saved)) {
 setThemeState(saved as DesignThemeId);
 }
 } catch {
 // ignore (private mode, etc.)
 }
 }, []);

 // Account-level theme follow. Lazy import to avoid pulling api.ts into
 // SSR bundle / circular deps with the auth flow.
 //
 // IMPORTANT: only call usersApi.me() when a token actually exists.
 // `getAuthHeaders()` in api.ts triggers `signOut → /login?expired=1`
 // on a missing token (not a thrown error we can swallow), which would
 // put the login page itself into an infinite redirect loop because
 // this provider wraps every route.
 useEffect(() => {
 let cancelled = false;
 let token: string | null = null;
 try {
 token = window.localStorage.getItem('access_token');
 } catch {
 // private mode / SSR — skip
 }
 if (!token) return;
 (async () => {
 try {
 const { usersApi } = await import('@/lib/api');
 const me = await usersApi.me();
 const remote = (me as any)?.preferred_theme as
 | DesignThemeId
 | null
 | undefined;
 if (
 !cancelled &&
 remote &&
 DESIGN_THEMES.some((t) => t.id === remote)
 ) {
 setThemeState(remote);
 try {
 window.localStorage.setItem(STORAGE_KEY, remote);
 } catch {
 /* ignore */
 }
 }
 } catch {
 // Network error, stale token, etc. — fall back to local choice.
 }
 })();
 return () => {
 cancelled = true;
 };
 }, []);

 // Apply to <html> whenever theme changes.
 useEffect(() => {
 const root = document.documentElement;
 root.setAttribute('data-theme', theme);
 const current = DESIGN_THEMES.find((t) => t.id === theme);
 // Mirror dark themes into the existing `.dark` class so any
 // residual shadcn `.dark`-scoped rules keep working.
 if (current?.dark) root.classList.add('dark');
 else root.classList.remove('dark');
 }, [theme]);

 const setTheme = (id: DesignThemeId) => {
 setThemeState(id);
 try {
 window.localStorage.setItem(STORAGE_KEY, id);
 } catch {
 // ignore
 }
 // Best-effort push to server — only if we actually have a token.
 // Skipping the call when logged out avoids triggering the
 // signOut-on-missing-token path in api.ts (which would force a
 // /login?expired=1 redirect even for guest theme tweaks).
 let token: string | null = null;
 try {
 token = window.localStorage.getItem('access_token');
 } catch {
 /* ignore */
 }
 if (!token) return;
 (async () => {
 try {
 const { userPrefsApi } = await import('@/lib/api');
 await userPrefsApi.updateMe({ preferred_theme: id });
 } catch {
 /* ignore */
 }
 })();
 };

 const current = DESIGN_THEMES.find((t) => t.id === theme) ?? DESIGN_THEMES[0];

 return (
 <DesignThemeContext.Provider
 value={{ theme, setTheme, themes: DESIGN_THEMES, current }}
 >
 {children}
 </DesignThemeContext.Provider>
 );
}
