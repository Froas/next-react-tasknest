"use client";

import { SessionProvider, useSession, signOut } from 'next-auth/react';
import { Session } from 'next-auth';
import Header from '../components/ui/header';
import { usePathname, useRouter } from 'next/navigation';
import React, { createContext, useContext, useEffect, useRef } from 'react';

const SessionContext = createContext<Session | null>(null);

function SessionPasser({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // Save access token to localStorage when session is available
    React.useEffect(() => {
        if (session?.accessToken) {
            localStorage.setItem('access_token', session.accessToken);
        } else {
            localStorage.removeItem('access_token');
        }
    }, [session]);

    // Session expiration monitoring
    useEffect(() => {
        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        if (status === 'loading') return;

        if (status === 'unauthenticated') {
            // Only redirect if we're not already on login/signup pages
            const currentPath = window.location.pathname;
            if (!['/login', '/signup'].includes(currentPath)) {
                router.push('/login');
            }
            return;
        }

        if (session?.expires) {
            const expirationTime = new Date(session.expires).getTime();
            const currentTime = new Date().getTime();
            
            // If session is already expired
            if (currentTime >= expirationTime) {
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

    // Set up periodic session check (every 5 minutes)
    useEffect(() => {
        if (status !== 'authenticated') return;

        const intervalId = setInterval(() => {
            if (session?.expires) {
                const expirationTime = new Date(session.expires).getTime();
                const currentTime = new Date().getTime();
                
                if (currentTime >= expirationTime) {
                    console.warn('Session expired during periodic check. Redirecting to login...');
                    signOut({ 
                        callbackUrl: '/login?expired=1',
                        redirect: true 
                    });
                }
            }
        }, 5 * 60 * 1000); // Check every 5 minutes

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
    const pathname = usePathname() || ""
    const noHeaderPages = ['/login', '/signup']

    return (
        <SessionProvider>
            <SessionPasser>
                {!noHeaderPages.includes(pathname) && <Header />}
                {children}
            </SessionPasser>
        </SessionProvider>
    );
}
