"use client"; 

import { SessionProvider, useSession } from 'next-auth/react';
import Header from '../components/ui/header';
import { usePathname } from 'next/navigation';
import React, { createContext, useContext } from 'react';

const SessionContext = createContext(null);

function SessionPasser({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
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
