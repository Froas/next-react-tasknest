"use client"; 

import { SessionProvider } from 'next-auth/react';
import Header from '../components/ui/header';
import { usePathname } from 'next/navigation';

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() || ""
    const noHeaderPages = ['/login', '/signup']

    return (
        <SessionProvider>
            {!noHeaderPages.includes(pathname) && <Header />}
            {children}
        </SessionProvider>
    );
}
