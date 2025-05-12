import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';

const CSRF_TOKEN_COOKIE = 'csrf-token';
const CSRF_TOKEN_HEADER = 'x-csrf-token';

export class CSRFProtection {
  private static instance: CSRFProtection;
  private tokenMap: Map<string, { token: string; expires: number }>;

  private constructor() {
    this.tokenMap = new Map();
  }

  public static getInstance(): CSRFProtection {
    if (!CSRFProtection.instance) {
      CSRFProtection.instance = new CSRFProtection();
    }
    return CSRFProtection.instance;
  }

  public generateToken(): string {
    const token = randomBytes(32).toString('hex');
    const expires = Date.now() + 3600000; // 1 hour expiration
    
    this.tokenMap.set(token, { token, expires });
    return token;
  }

  public validateToken(token: string): boolean {
    const stored = this.tokenMap.get(token);
    
    if (!stored) {
      return false;
    }

    if (Date.now() > stored.expires) {
      this.tokenMap.delete(token);
      return false;
    }

    return true;
  }

  public cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [token, data] of this.tokenMap.entries()) {
      if (now > data.expires) {
        this.tokenMap.delete(token);
      }
    }
  }
}

// Helper functions for Next.js
export const getCSRFToken = (): string => {
  const csrf = CSRFProtection.getInstance();
  return csrf.generateToken();
};

export const validateCSRFToken = (token: string): boolean => {
  const csrf = CSRFProtection.getInstance();
  return csrf.validateToken(token);
};

// Middleware helper
export const setCSRFTokenCookie = (response: Response): void => {
  const token = getCSRFToken();
  response.headers.set('Set-Cookie', `${CSRF_TOKEN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Secure`);
};

export const getCSRFTokenFromCookie = (): string | null => {
  const cookieStore = cookies();
  return cookieStore.get(CSRF_TOKEN_COOKIE)?.value || null;
}; 