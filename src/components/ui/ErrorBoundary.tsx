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
 <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--tn-bg)' }}>
 <div className="card max-w-md w-full text-center" style={{ padding: 32 }}>
 <h1 className="text-2xl font-semibold text-foreground mb-3">Something went wrong</h1>
 <p className="mb-6 break-words" style={{ color: 'var(--tn-fg-muted)' }}>
 {error.message || 'An unexpected error occurred while rendering this page.'}
 </p>
 <div className="flex justify-center space-x-3">
 <button
 onClick={this.reset}
 className="btn btn-primary"
 >
 Try again
 </button>
 <button
 onClick={() => {
 if (typeof window !== 'undefined') window.location.href = '/';
 }}
 className="btn btn-secondary"
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
