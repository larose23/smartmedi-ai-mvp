import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateApiKey } from './lib/supabase';
import { rateLimit } from './lib/security/rateLimit';
import { setCSRFTokenCookie, validateCSRFToken } from './lib/security/csrf-middleware';
import { ipBlocker, checkAndRecordIP } from './lib/security/ipBlock';
import { securityLogger, logAuthEvent, logApiEvent, logSecurityViolation, logRateLimitExceeded } from './lib/security/logger';
import { rbac, Permission } from './lib/security/roles';
import { sessionManager } from './lib/security/session';
import { mfaMiddleware } from './lib/security/mfaMiddleware';
import { supabase } from './lib/supabase';
import { monitoring } from './lib/monitoring';

// List of paths that require API key validation
const API_KEY_PROTECTED_PATHS = [
  '/api/ai',
  '/api/chat',
  '/api/analysis',
];

// Define path permissions
const PATH_PERMISSIONS: Record<string, Permission[]> = {
  '/patients': [Permission.VIEW_PATIENTS],
  '/patients/create': [Permission.EDIT_PATIENTS],
  '/patients/edit': [Permission.EDIT_PATIENTS],
  '/appointments': [Permission.VIEW_APPOINTMENTS],
  '/appointments/create': [Permission.CREATE_APPOINTMENTS],
  '/appointments/edit': [Permission.EDIT_APPOINTMENTS],
  '/staff': [Permission.VIEW_STAFF],
  '/staff/edit': [Permission.EDIT_STAFF],
  '/settings': [Permission.MANAGE_SETTINGS],
  '/logs': [Permission.VIEW_LOGS],
};

// List of paths that require authentication
const AUTH_PROTECTED_PATHS = Object.keys(PATH_PERMISSIONS);

// List of paths that require CSRF protection
const CSRF_PROTECTED_PATHS = [
  '/api',
  ...AUTH_PROTECTED_PATHS,
];

// Create rate limiter with custom config for API endpoints
const apiRateLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  maxRequests: 100,
  message: 'API rate limit exceeded. Please try again later.',
});

export async function middleware(request: NextRequest) {
  const start = Date.now();
  const requestId = crypto.randomUUID();

  // Add request ID to headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);
  requestHeaders.set('x-request-start', start.toString());

  const response = NextResponse.next();
  const ip = request.ip || 'unknown';
  
  // Apply rate limiting
  const rateLimitResult = await apiRateLimiter(request);
  if (rateLimitResult.status === 429) {
    logRateLimitExceeded('Rate limit exceeded', { ip, path: request.nextUrl.pathname });
    return rateLimitResult;
  }
  
  // Check if IP is blocked
  if (ipBlocker.isBlocked(ip)) {
    logSecurityViolation('Blocked IP attempt', { ip, path: request.nextUrl.pathname });
    return new NextResponse(
      JSON.stringify({ error: 'Access denied' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Set CSP header
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://*.openai.com;"
  );

  // Check if the path requires CSRF protection
  if (CSRF_PROTECTED_PATHS.some(path => request.nextUrl.pathname.startsWith(path))) {
    if (request.method !== 'GET') {
      const csrfToken = request.headers.get('x-csrf-token');
      if (!csrfToken || !validateCSRFToken(csrfToken, request)) {
        logSecurityViolation('Invalid CSRF token', { ip, path: request.nextUrl.pathname });
        checkAndRecordIP(ip, 'Invalid CSRF token');
        return new NextResponse(
          JSON.stringify({ error: 'Invalid CSRF token' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    setCSRFTokenCookie(response);
  }

  // Check if the path requires API key validation
  if (API_KEY_PROTECTED_PATHS.some(path => request.nextUrl.pathname.startsWith(path))) {
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey) {
      logSecurityViolation('Missing API key', { ip, path: request.nextUrl.pathname });
      return new NextResponse(
        JSON.stringify({ error: 'API key is required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate the API key
    const isValid = validateApiKey(apiKey, 'openai');
    if (!isValid) {
      logSecurityViolation('Invalid API key', { ip, path: request.nextUrl.pathname });
      checkAndRecordIP(ip, 'Invalid API key');
      return new NextResponse(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    logApiEvent('API request', { ip, path: request.nextUrl.pathname });
  }

  // Check if the path requires authentication
  if (AUTH_PROTECTED_PATHS.some(path => request.nextUrl.pathname.startsWith(path))) {
    const session = request.cookies.get('sb-auth-token');
    
    if (!session) {
      logAuthEvent('Unauthenticated access attempt', { ip, path: request.nextUrl.pathname });
      // Redirect to login page if not authenticated
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Get user ID from session
    const userId = session.value.split('.')[0]; // Extract user ID from JWT

    // Check session validity
    if (!sessionManager.isSessionValid(userId)) {
      logAuthEvent('Invalid session', { ip, path: request.nextUrl.pathname, userId });
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Track user activity
    await sessionManager.trackActivity(userId);

    // Check role-based permissions
    const requiredPermissions = PATH_PERMISSIONS[request.nextUrl.pathname] || [];
    if (requiredPermissions.length > 0 && !rbac.validateAccess(userId, requiredPermissions)) {
      logAuthEvent('Unauthorized access attempt', { 
        ip, 
        path: request.nextUrl.pathname, 
        userId,
        requiredPermissions 
      });
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized access' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Add user ID and email to headers for MFA middleware
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      request.headers.set('x-user-id', user.id);
      request.headers.set('x-user-email', user.email || '');
    }
  }

  // Apply MFA middleware for sensitive operations
  const mfaResult = await mfaMiddleware(request);
  if (mfaResult.status !== 200) {
    return mfaResult;
  }

  // Track API performance
  const duration = Date.now() - start;
  monitoring.trackPerformance(`api_${request.nextUrl.pathname}`, duration);

  // Add response headers
  response.headers.set('x-request-id', requestId);
  response.headers.set('x-response-time', `${duration}ms`);

  return response;
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}; 