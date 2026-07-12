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
 <div
 className="card max-w-md w-full text-center"
 style={{
 padding: 32,
 borderColor: 'color-mix(in srgb, var(--tn-bad, #c25d63) 35%, transparent)',
 }}
 >
 <h2 className="text-xl font-semibold text-foreground mb-3">
 This page hit a snag
 </h2>
 <p className="mb-6 break-words" style={{ color: 'var(--tn-fg-muted)' }}>
 {error.message || 'An unexpected error occurred.'}
 </p>
 <div className="flex justify-center space-x-3">
 <button
 onClick={reset}
 className="btn btn-primary"
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
