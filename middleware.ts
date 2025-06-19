// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Add paths that should be publicly accessible without authentication
const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password', '/api/auth'];
// Paths that require authentication but have special conditions (e.g., force-change-password)
const CONDITIONALLY_PROTECTED_PATHS = ['/force-change-password'];


export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = request.cookies.has('authUser');

  // Allow access to public assets and Next.js internals
  if (pathname.startsWith('/_next/') || pathname.endsWith('.png') || pathname.endsWith('.svg') || pathname.endsWith('.ico')) {
    return NextResponse.next();
  }
  
  const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path));

  if (isAuthenticated) {
    // If authenticated and trying to access public auth pages (login, signup, etc.), redirect to dashboard
    // unless it's the /force-change-password page, which is handled by context/page logic
    if (isPublicPath && path !== '/api/auth') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // The logic for redirecting to/from /force-change-password will be primarily handled
    // by the AuthContext and the page itself, as middleware doesn't easily know the `mustChangePassword` state.
    // Middleware just ensures /force-change-password is protected if not authenticated.
  } else { // Not authenticated
    // If trying to access a protected route (not public, not /force-change-password for an initial check)
    if (!isPublicPath && !CONDITIONALLY_PROTECTED_PATHS.includes(pathname)) {
        const loginUrl = new URL('/login', request.url);
        if (pathname !== '/') {
            loginUrl.searchParams.set('redirect', pathname);
        }
        return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - files in public folder (e.g. /vite.svg)
     * Adjust if your public assets are served differently
     */
    '/((?!api/|_next/static|_next/image|favicon.ico|.+?/assets/|.+?\\.png$|.+?\\.svg$).*)',
  ],
};
