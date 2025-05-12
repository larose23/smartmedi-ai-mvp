import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';

const CSRF_TOKEN_COOKIE = 'csrf-token';
const CSRF_TOKEN_HEADER = 'x-csrf-token';

export function setCSRFTokenCookie() {
  const token = randomBytes(32).toString('hex');
  cookies().set(CSRF_TOKEN_COOKIE, token, { httpOnly: true, sameSite: 'lax' });
  return token;
}

export function validateCSRFToken(token: string | null) {
  const cookieToken = cookies().get(CSRF_TOKEN_COOKIE)?.value;
  return token && cookieToken && token === cookieToken;
} 