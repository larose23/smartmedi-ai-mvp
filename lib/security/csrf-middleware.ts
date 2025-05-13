import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

const CSRF_TOKEN_COOKIE = 'csrf-token';

export function setCSRFTokenCookie(response: NextResponse) {
  const token = crypto.randomUUID();
  response.cookies.set(CSRF_TOKEN_COOKIE, token, { 
    httpOnly: true, 
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });
  return token;
}

export function validateCSRFToken(token: string | null, request: NextRequest) {
  const cookieToken = request.cookies.get(CSRF_TOKEN_COOKIE)?.value;
  return token && cookieToken && token === cookieToken;
} 