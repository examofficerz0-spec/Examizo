import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'exammaster_super_secret_jwt_key_2026_student';

// Web Crypto HMAC-SHA256 signature verification for high-speed edge middleware
async function verifyToken(token: string): Promise<any | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode and parse payload
    const normalizedPayload = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      '='
    );
    const payloadJson = atob(paddedPayload);
    const payload = JSON.parse(payloadJson);

    // Check expiration timestamp
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    // Verify cryptographic HMAC-SHA256 signature
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const normalizedSig = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    const paddedSig = normalizedSig.padEnd(
      normalizedSig.length + ((4 - (normalizedSig.length % 4)) % 4),
      '='
    );
    const binarySig = atob(paddedSig);
    const sigBytes = new Uint8Array(binarySig.length);
    for (let i = 0; i < binarySig.length; i++) {
      sigBytes[i] = binarySig.charCodeAt(i);
    }

    const data = enc.encode(`${headerB64}.${payloadB64}`);
    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, data);

    if (!isValid) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

// Routes that do NOT require authentication
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/privacy',
  '/terms',
  '/gallery',
];

const PUBLIC_API_PREFIXES = [
  '/api/courses',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/google',
  '/api/auth/reset-password',
  '/api/gallery',
  '/api/seed',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow Next.js internals, static files, favicon, etc.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/images') ||
    pathname === '/favicon.ico' ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('student_token')?.value;
  const user = token ? await verifyToken(token) : null;
  const isAuthenticated = !!user;

  // 2. Check if path is public
  const isPublicPage = PUBLIC_PATHS.includes(pathname);
  const isPublicApi = PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isPublicPage || isPublicApi) {
    const response = NextResponse.next();
    applySecurityHeaders(response);
    return response;
  }

  // 4. If path is a protected API and user is not authenticated -> 401
  if (pathname.startsWith('/api/')) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized: You must log in to access this portal resource.' },
        { status: 401 }
      );
    }
    const response = NextResponse.next();
    applySecurityHeaders(response);
    return response;
  }

  // 5. If path is a protected Page and user is not authenticated -> Redirect to /login
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 6. If user is authenticated but has not selected/locked a course yet:
  // Restrict them from entering inside the portal pages until they pick their course track.
  const hasLockedCourse = Boolean(user && user.lockedCourseId && String(user.lockedCourseId).trim().length > 0);
  if (!hasLockedCourse) {
    const isCourseSelectionPath = pathname === '/course-selection';
    const isAllowedApi = pathname.startsWith('/api/course') || pathname.startsWith('/api/courses') || pathname.startsWith('/api/auth');

    if (!isCourseSelectionPath && !isAllowedApi && !pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/course-selection', request.url));
    }
  }

  const response = NextResponse.next();
  applySecurityHeaders(response);
  return response;
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
