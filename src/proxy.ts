import { NextRequest, NextResponse } from 'next/server';

const publicRoutes = ['/login', '/signup', '/logout', '/design'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie =
    request.cookies.get('next-auth.session-token') ??
    request.cookies.get('__Secure-next-auth.session-token');
  const isAuthenticated = Boolean(sessionCookie);

  const isPublic = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const isStaticAsset =
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/static/') ||
    /\.(css|js|jsx|html|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico|webmanifest|map|json)$/.test(
      pathname,
    );

  if (!isPublic && !isStaticAsset && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
