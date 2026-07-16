"use client";

import { SessionProvider, useSession, signOut } from 'next-auth/react';
import { Session } from 'next-auth';
import Header from '../components/ui/header';
import { RouteBoundary } from '../components/ui/RouteBoundary';
import { AppShell } from '@/components/design/AppShell';
import { usePathname, useRouter } from 'next/navigation';
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { setApiAccessToken, usersApi, userPrefsApi } from '@/lib/api';
import { usePinnedGoals } from '@/store/usePinnedGoals';
import { useRecentGoals } from '@/store/useRecentGoals';
import { useGoalColors } from '@/store/useGoalColors';

const SessionContext = createContext<Session | null>(null);

function SessionPasser({ children }: { children: React.ReactNode }) {
 const { data: session, status } = useSession();
 const router = useRouter();
 const timeoutRef = useRef<NodeJS.Timeout | null>(null);

 useEffect(() => {
 setApiAccessToken(session?.accessToken);
 }, [session?.accessToken]);
 
 // Hydrate account-level preferences once per authenticated session. Existing
 // local-only values are uploaded the first time so the migration is lossless.
 useEffect(() => {
 if (status !== 'authenticated') return;
 let cancelled = false;
 void (async () => {
 try {
 const user = await usersApi.me();
 if (cancelled) return;
 const pinned = user.pinned_goal_ids ?? usePinnedGoals.getState().pinned;
 const recent = user.recent_goal_ids ?? useRecentGoals.getState().ids;
 const colors = user.goal_color_overrides ?? useGoalColors.getState().overrides;
 if (
 user.pinned_goal_ids == null ||
 user.recent_goal_ids == null ||
 user.goal_color_overrides == null
 ) {
 await userPrefsApi.updateMe({
 pinned_goal_ids: pinned,
 recent_goal_ids: recent,
 goal_color_overrides: colors,
 });
 }
 if (cancelled) return;
 usePinnedGoals.getState().hydrate(pinned);
 useRecentGoals.getState().hydrate(recent);
 useGoalColors.getState().hydrate(colors);
 } catch (error) {
 console.warn('Failed to sync cross-platform preferences:', error);
 }
 })();
 return () => { cancelled = true; };
 }, [status]);

 // Session expiration monitoring
 useEffect(() => {
 // Clear any existing timeout
 if (timeoutRef.current) {
 clearTimeout(timeoutRef.current);
 }

 // Don't do anything while loading
 if (status === 'loading') return;

 // Only redirect after NextAuth has definitively resolved the session.
 if (status === 'unauthenticated') {
 const currentPath = window.location.pathname;
 if (!['/login', '/signup'].includes(currentPath)) {
 console.log('No session, redirecting to login');
 router.push('/login');
 }
 return;
 }

 // Only set up expiration monitoring if we have an authenticated session
 if (status === 'authenticated' && session?.expires) {
 const expirationTime = new Date(session.expires).getTime();
 const currentTime = new Date().getTime();

 // If session is already expired
 if (currentTime >= expirationTime) {
 // Don't loop: if we're already on /login or /signup, the user
 // is in the auth flow — clear the stale cookie via /api/auth/signout
 // WITHOUT redirect, which would re-trigger this effect.
 const onAuthPage = ['/login', '/signup'].includes(window.location.pathname);
 if (onAuthPage) {
 signOut({ redirect: false });
 return;
 }
 console.warn('Session expired. Redirecting to login...');
 signOut({
 callbackUrl: '/login?expired=1',
 redirect: true
 });
 return;
 }

 // Calculate time until expiration (with 2 minute buffer)
 const timeUntilExpiration = Math.max(0, expirationTime - currentTime - 120000); // 2 minutes before expiration
 
 // Set timeout to handle expiration
 timeoutRef.current = setTimeout(() => {
 console.warn('Session will expire soon. Auto-redirecting to login...');
 signOut({ 
 callbackUrl: '/login?expired=1',
 redirect: true 
 });
 }, timeUntilExpiration);
 }

 return () => {
 if (timeoutRef.current) {
 clearTimeout(timeoutRef.current);
 }
 };
 }, [session, status, router]);

 // Set up periodic session check (every 10 minutes, less aggressive)
 useEffect(() => {
 if (status !== 'authenticated') return;

 const intervalId = setInterval(() => {
 // Only check if we have both session and expiration time
 if (session?.expires && status === 'authenticated') {
 const expirationTime = new Date(session.expires).getTime();
 const currentTime = new Date().getTime();
 
 // Add a small buffer to avoid false positives
 if (currentTime >= expirationTime + 60000) { // 1 minute buffer
 console.warn('Session expired during periodic check. Redirecting to login...');
 signOut({ 
 callbackUrl: '/login?expired=1',
 redirect: true 
 });
 }
 }
 }, 10 * 60 * 1000); // Check every 10 minutes (less frequent)

 return () => clearInterval(intervalId);
 }, [session, status]);
 
 return (
 <SessionContext.Provider value={session}>
 {children}
 </SessionContext.Provider>
 );
}

export function useAppSession() {
 return useContext(SessionContext);
}

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
 const pathname = usePathname() ||""
 // Routes that render WITHOUT the design app shell (sidebar + topbar).
 // Auth/onboarding/static prototype pages live here.
 const bareLayoutPages = ['/login', '/signup', '/logout']
 const isBareLayout = bareLayoutPages.some(p =>
 pathname === p || pathname.startsWith(`${p}/`)
 );

 if (isBareLayout) {
 return (
 <SessionProvider>
 <SessionPasser>
 <RouteBoundary>{children}</RouteBoundary>
 </SessionPasser>
 </SessionProvider>
 );
 }

 // Every authenticated route renders inside <AppShell>: design's
 // sidebar + topbar + mobile tabbar, themed via `data-theme` on <html>.
 // This is what makes theme switching repaint the whole product, not
 // just the picker page.
 return (
 <SessionProvider>
 <SessionPasser>
 <AppShell>
 <RouteBoundary>{children}</RouteBoundary>
 </AppShell>
 </SessionPasser>
 </SessionProvider>
 );
}
