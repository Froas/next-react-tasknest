import Link from "next/link";

export default function NotFound() {
 return (
 <div className="min-h-screen flex items-center justify-center bg-muted dark:bg-card px-4">
 <div className="max-w-md w-full text-center bg-card dark:bg-card rounded-xl border border-border dark:border-border p-8 shadow-sm">
 <p className="text-6xl font-bold text-muted-foreground/60 dark:text-foreground mb-4">404</p>
 <h1 className="text-2xl font-semibold text-foreground mb-3">Page not found</h1>
 <p className="text-foreground dark:text-muted-foreground/60 mb-6">
 The page you&apos;re looking for doesn&apos;t exist or has been moved.
 </p>
 <Link
 href="/"
 className="inline-block px-4 py-2 rounded-lg bg-card dark:bg-card text-white hover:bg-card dark:hover:bg-muted transition-colors"
 >
 Back to dashboard
 </Link>
 </div>
 </div>
 );
}
