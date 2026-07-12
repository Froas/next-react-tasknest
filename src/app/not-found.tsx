import Link from "next/link";

export default function NotFound() {
 return (
 <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--tn-bg)' }}>
 <div className="card max-w-md w-full text-center" style={{ padding: 32 }}>
 <p className="text-6xl font-bold mb-4" style={{ color: 'var(--tn-fg-muted)' }}>404</p>
 <h1 className="text-2xl font-semibold text-foreground mb-3">Page not found</h1>
 <p className="mb-6" style={{ color: 'var(--tn-fg-muted)' }}>
 The page you&apos;re looking for doesn&apos;t exist or has been moved.
 </p>
 <Link
 href="/"
 className="btn btn-primary"
 >
 Back to dashboard
 </Link>
 </div>
 </div>
 );
}
