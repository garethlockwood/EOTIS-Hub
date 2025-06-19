// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Add paths that should be publicly accessible without authentication
const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password', '/api/auth']; // Add /api/auth for NextAuth or similar

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for a mock auth token (replace with your actual auth check)
  // In a real app, this would involve verifying a session cookie or token
  const isAuthenticated = request.cookies.has('authUser'); // Using the same localStorage key name for simplicity

  // If trying to access a protected route and not authenticated, redirect to login
  if (!isAuthenticated && !PUBLIC_PATHS.some(path => pathname.startsWith(path)) && !pathname.startsWith('/_next/') && !pathname.endsWith('.png') && !pathname.endsWith('.svg')) {
    const loginUrl = new URL('/login', request.url);
    // If trying to access a specific page, redirect back to it after login
    if (pathname !== '/') { // Avoid adding / to redirect, could cause loop if /login is public
        loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated and trying to access login page, redirect to dashboard
  if (isAuthenticated && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Configure the matcher to run the middleware on relevant paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - files in public folder (e.g. /vite.svg)
     * Match all paths starting with /app or /login
     * Adjust if your public assets are served differently
     */
    // '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    '/((?!api/|_next/static|_next/image|favicon.ico|.+?/assets/|.+?\\.png$).*)',
  ],
};
