"use client";

import { SessionProvider, useSession, signOut } from 'next-auth/react';
import { Session } from 'next-auth';
import Header from '../components/ui/header';
import { RouteBoundary } from '../components/ui/RouteBoundary';
import { AppShell } from '@/components/design/AppShell';
import { usePathname, useRouter } from 'next/navigation';
import React, { createContext, useContext, useEffect, useRef } from 'react';

const SessionContext = createContext<Session | null>(null);

function SessionPasser({ children }: { children: React.ReactNode }) {
 const { data: session, status } = useSession();
 const router = useRouter();
 const timeoutRef = useRef<NodeJS.Timeout | null>(null);
 
 // Save access token to localStorage when session is available.
 // Skip while NextAuth is still loading — otherwise the initial null session
 // would wipe the token in a window where API requests can fire unauthenticated.
 React.useEffect(() => {
 if (status === 'loading') return;
 if (session?.accessToken) {
 localStorage.setItem('access_token', session.accessToken);
 } else if (status === 'unauthenticated') {
 localStorage.removeItem('access_token');
 }
 }, [session, status]);

 // Session expiration monitoring
 useEffect(() => {
 // Clear any existing timeout
 if (timeoutRef.current) {
 clearTimeout(timeoutRef.current);
 }

 // Don't do anything while loading
 if (status === 'loading') return;

 // Only redirect to login if we're definitely unauthenticated AND have finished loading
 // AND we don't have a token in localStorage (to avoid redirect loops during page refresh)
 if (status === 'unauthenticated') {
 const currentPath = window.location.pathname;
 const hasStoredToken = localStorage.getItem('access_token');
 
 // Only redirect if we're not on login/signup pages AND we don't have a stored token
 if (!['/login', '/signup'].includes(currentPath) && !hasStoredToken) {
 console.log('No session and no stored token, redirecting to login');
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
