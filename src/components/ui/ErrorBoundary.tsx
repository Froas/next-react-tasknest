'use client';

import React from 'react';

interface ErrorBoundaryState {
 error: Error | null;
}

interface ErrorBoundaryProps {
 children: React.ReactNode;
 fallback?: (error: Error, reset: () => void) => React.ReactNode;
 resetKey?: unknown;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
 state: ErrorBoundaryState = { error: null };

 static getDerivedStateFromError(error: Error): ErrorBoundaryState {
 return { error };
 }

 componentDidCatch(error: Error, info: React.ErrorInfo) {
 console.error('Uncaught error in component tree:', error, info);
 }

 componentDidUpdate(prevProps: ErrorBoundaryProps) {
 // Reset on navigation when consumer passes a `resetKey` (e.g. pathname),
 // so a per-route boundary recovers when the user navigates away.
 if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
 this.setState({ error: null });
 }
 }

 reset = () => {
 this.setState({ error: null });
 };

 render() {
 const { error } = this.state;
 if (error) {
 if (this.props.fallback) {
 return this.props.fallback(error, this.reset);
 }
 return (
 <div className="min-h-screen flex items-center justify-center bg-muted dark:bg-card px-4">
 <div className="max-w-md w-full text-center bg-card dark:bg-card rounded-xl border border-border dark:border-border p-8 shadow-sm">
 <h1 className="text-2xl font-semibold text-foreground mb-3">Something went wrong</h1>
 <p className="text-foreground dark:text-muted-foreground/60 mb-6 break-words">
 {error.message || 'An unexpected error occurred while rendering this page.'}
 </p>
 <div className="flex justify-center space-x-3">
 <button
 onClick={this.reset}
 className="px-4 py-2 rounded-lg bg-card dark:bg-card text-white hover:bg-card dark:hover:bg-muted transition-colors"
 >
 Try again
 </button>
 <button
 onClick={() => {
 if (typeof window !== 'undefined') window.location.href = '/';
 }}
 className="px-4 py-2 rounded-lg border border-border dark:border-border text-foreground dark:text-muted-foreground/60 hover:bg-muted dark:hover:bg-card transition-colors"
 >
 Back to dashboard
 </button>
 </div>
 </div>
 </div>
 );
 }
 return this.props.children;
 }
}
