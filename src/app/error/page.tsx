"use client";

import Link from "next/link";

const ErrorPage = () => {
 return (
 <div className="min-h-screen flex items-center justify-center bg-muted dark:bg-card px-4">
 <div className="max-w-md w-full text-center bg-card dark:bg-card rounded-xl border border-border dark:border-border p-8 shadow-sm">
 <h1 className="text-2xl font-semibold text-foreground mb-3">Something went wrong</h1>
 <p className="text-foreground dark:text-muted-foreground/60 mb-6">
 We couldn't complete the requested action. Try going back to the dashboard or signing in again.
 </p>
 <div className="flex justify-center space-x-3">
 <Link
 href="/"
 className="px-4 py-2 rounded-lg bg-card dark:bg-card text-white hover:bg-card dark:hover:bg-muted transition-colors"
 >
 Back to dashboard
 </Link>
 <Link
 href="/login"
 className="px-4 py-2 rounded-lg border border-border dark:border-border text-foreground dark:text-muted-foreground/60 hover:bg-muted dark:hover:bg-card transition-colors"
 >
 Sign in
 </Link>
 </div>
 </div>
 </div>
 );
};

export default ErrorPage;
