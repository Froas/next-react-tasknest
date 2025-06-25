// src/middleware.ts
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

// Define protected routes
const protectedRoutes = [
  '/',
  '/goal',
  '/milestone',
  '/task',
  '/subtask',
  '/todo',
  '/event',
  '/visualization'
];

// Define public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/signup',
  '/logout'
];

export async function middleware(request: NextRequest) {
  // Check for any NextAuth session cookie
  const cookies = request.cookies;
  const sessionCookie = cookies.get('next-auth.session-token') || cookies.get('__Secure-next-auth.session-token');
  const isAuthenticated = !!sessionCookie;
  const pathname = new URL(request.url).pathname;

  // Check if the current path is a public route or a static asset/API route
  const isPublic = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
  const isStaticAsset = pathname.startsWith('/_next/') || pathname.startsWith('/api/') || pathname.startsWith('/static/') || pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$/);

  // If it's not a public route or static asset and user is not authenticated, redirect to login
  if (!isPublic && !isStaticAsset && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login?redirect=' + encodeURIComponent(pathname), request.url));
  }

  // If user is authenticated and tries to access login/signup, redirect to home
  if (isAuthenticated && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If it's a public route or user is authenticated, allow the request
  return NextResponse.next();
}

// Configure the matcher to apply middleware to all routes
export const config = {
  matcher: '/:path*',
};
