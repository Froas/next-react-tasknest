"use client";

import { SessionProvider, useSession, signOut } from 'next-auth/react';
import { Session } from 'next-auth';
import { RouteBoundary } from '../components/ui/RouteBoundary';
import { AppShell } from '@/components/design/AppShell';
import { usePathname, useRouter } from 'next/navigation';
import React, { createContext, useContext, useEffect } from 'react';
import { setApiAccessToken, usersApi, userPrefsApi } from '@/lib/api';
import { usePinnedGoals } from '@/store/usePinnedGoals';
import { useRecentGoals } from '@/store/useRecentGoals';
import { useGoalColors } from '@/store/useGoalColors';

const SessionContext = createContext<Session | null>(null);

function SessionPasser({ children }: { children: React.ReactNode }) {
 const { data: session, status } = useSession();
 const router = useRouter();

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

 // NextAuth refreshes the one-hour API token in its server-side JWT callback.
 // Only a failed/expired 30-day refresh session should send the user to login.
 useEffect(() => {
 if (status === 'loading') return;

 if (status === 'unauthenticated') {
 const currentPath = window.location.pathname;
 if (!['/login', '/signup'].includes(currentPath)) {
 router.push('/login');
 }
 return;
 }

 if (status === 'authenticated' && session?.error === 'RefreshAccessTokenError') {
 signOut({
 callbackUrl: '/login?expired=1',
 redirect: true
 });
 }
 }, [session?.error, status, router]);
 
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
 <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus>
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
 <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus>
 <SessionPasser>
 <AppShell>
 <RouteBoundary>{children}</RouteBoundary>
 </AppShell>
 </SessionPasser>
 </SessionProvider>
 );
}
