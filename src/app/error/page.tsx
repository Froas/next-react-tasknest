"use client";

import Link from "next/link";

const ErrorPage = () => {
 return (
 <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--tn-bg)' }}>
 <div className="card max-w-md w-full text-center" style={{ padding: 32 }}>
 <h1 className="text-2xl font-semibold text-foreground mb-3">Something went wrong</h1>
 <p className="mb-6" style={{ color: 'var(--tn-fg-muted)' }}>
 We couldn't complete the requested action. Try going back to the dashboard or signing in again.
 </p>
 <div className="flex justify-center space-x-3">
 <Link
 href="/"
 className="btn btn-primary"
 >
 Back to dashboard
 </Link>
 <Link
 href="/login"
 className="btn btn-secondary"
 >
 Sign in
 </Link>
 </div>
 </div>
 </div>
 );
};

export default ErrorPage;
