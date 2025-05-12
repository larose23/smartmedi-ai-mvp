import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private static instance: RateLimiter;
  private store: RateLimitStore;
  private config: RateLimitConfig;

  private constructor(config: RateLimitConfig) {
    this.store = {};
    this.config = config;
  }

  public static getInstance(config: RateLimitConfig): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter(config);
    }
    return RateLimiter.instance;
  }

  public check(key: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const record = this.store[key] || { count: 0, resetTime: now + this.config.windowMs };

    // Reset if window has passed
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + this.config.windowMs;
    }

    // Increment counter
    record.count += 1;
    this.store[key] = record;

    // Check if over limit
    const allowed = record.count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - record.count);

    return {
      allowed,
      remaining,
      resetTime: record.resetTime,
    };
  }

  public cleanup(): void {
    const now = Date.now();
    for (const key in this.store) {
      if (now > this.store[key].resetTime) {
        delete this.store[key];
      }
    }
  }
}

// Default rate limit configuration
const defaultConfig: RateLimitConfig = {
  windowMs: 60000, // 1 minute
  maxRequests: 100,
  message: 'Too many requests, please try again later.',
};

// Rate limit middleware
export const rateLimit = (config: Partial<RateLimitConfig> = {}) => {
  const limiter = RateLimiter.getInstance({ ...defaultConfig, ...config });

  return async (request: NextRequest) => {
    // Get client identifier (IP + User Agent)
    const ip = request.ip || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const key = `${ip}:${userAgent}`;

    // Check rate limit
    const { allowed, remaining, resetTime } = limiter.check(key);

    // Create response
    const response = NextResponse.next();

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', String(config.maxRequests || defaultConfig.maxRequests));
    response.headers.set('X-RateLimit-Remaining', String(remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetTime / 1000)));

    if (!allowed) {
      return new NextResponse(
        JSON.stringify({ error: config.message || defaultConfig.message }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((resetTime - Date.now()) / 1000)),
          },
        }
      );
    }

    return response;
  };
};

// Cleanup expired rate limit records periodically
setInterval(() => {
  RateLimiter.getInstance(defaultConfig).cleanup();
}, 60000); // Clean up every minute 