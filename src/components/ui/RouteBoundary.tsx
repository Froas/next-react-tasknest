'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { ErrorBoundary } from './ErrorBoundary';

// Lighter-weight error boundary scoped to the current route. Header,
// sidebar, and global UI keep working even if the page content throws.
// `resetKey` is wired to pathname so navigating away clears the error.
export const RouteBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 const pathname = usePathname();

 return (
 <ErrorBoundary
 resetKey={pathname}
 fallback={(error, reset) => (
 <div className="min-h-[60vh] flex items-center justify-center px-4">
 <div className="max-w-md w-full text-center bg-card dark:bg-card rounded-xl border border-red-200 dark:border-red-800 p-8 shadow-sm">
 <h2 className="text-xl font-semibold text-foreground mb-3">
 This page hit a snag
 </h2>
 <p className="text-foreground dark:text-muted-foreground/60 mb-6 break-words">
 {error.message || 'An unexpected error occurred.'}
 </p>
 <div className="flex justify-center space-x-3">
 <button
 onClick={reset}
 className="px-4 py-2 rounded-lg bg-card dark:bg-card text-white hover:bg-card dark:hover:bg-muted"
 >
 Reload section
 </button>
 </div>
 </div>
 </div>
 )}
 >
 {children}
 </ErrorBoundary>
 );
};
