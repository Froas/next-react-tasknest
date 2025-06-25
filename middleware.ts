// middleware.ts
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
  const cookie = request.cookies.get('next-auth.session-token');
  const isAuthenticated = !!cookie;
  const pathname = new URL(request.url).pathname;

  // Check if the current path is a protected route
  const isProtected = protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );

  // Check if the current path is a public route
  const isPublic = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );

  // If it's a protected route and user is not authenticated, redirect to login
  if (isProtected && !isAuthenticated) {
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
