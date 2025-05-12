/**
 * API Route Helpers for standardizing API responses
 */

import { NextResponse } from 'next/server';
import { ApiResponse, ApiError, HttpStatus } from './types';

// Standard API error response
export function errorResponse(
  message: string, 
  status: number = HttpStatus.INTERNAL_SERVER_ERROR,
  details?: Record<string, any>
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      details
    }, 
    { status }
  );
}

// Standard API success response
export function successResponse<T>(
  data: T, 
  metadata?: ApiResponse<T>['metadata']
) {
  return NextResponse.json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
    metadata
  });
}

// API request validation helper
export function validateRequest<T>(
  data: unknown, 
  validator: (data: any) => data is T,
  errorMessage: string = 'Invalid request format'
): { isValid: true, data: T } | { isValid: false, error: NextResponse } {
  if (!data || !validator(data)) {
    return {
      isValid: false,
      error: errorResponse(errorMessage, HttpStatus.BAD_REQUEST)
    };
  }
  
  return {
    isValid: true,
    data
  };
}

// API error handling middleware
export async function withErrorHandling<T>(
  handler: () => Promise<T>, 
  errorHandler?: (error: Error) => NextResponse
): Promise<T | NextResponse> {
  try {
    return await handler();
  } catch (error: any) {
    console.error('API Error:', error);
    
    if (errorHandler) {
      return errorHandler(error);
    }
    
    return errorResponse(
      error.message || 'An unexpected error occurred',
      error.status || HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

// API authentication middleware
export async function withAuth<T>(
  handler: () => Promise<T>,
  authValidator: () => Promise<boolean>,
  unauthorizedMessage: string = 'Unauthorized'
): Promise<T | NextResponse> {
  try {
    const isAuthorized = await authValidator();
    
    if (!isAuthorized) {
      return errorResponse(unauthorizedMessage, HttpStatus.UNAUTHORIZED);
    }
    
    return await handler();
  } catch (error: any) {
    return errorResponse(
      error.message || 'Authentication error',
      error.status || HttpStatus.UNAUTHORIZED
    );
  }
}

// API rate limiting middleware (simple implementation)
const rateLimitCache = new Map<string, { count: number, resetTime: number }>();

export function withRateLimit<T>(
  handler: () => Promise<T>,
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000 // 1 minute
): Promise<T | NextResponse> {
  const now = Date.now();
  const record = rateLimitCache.get(identifier) || { count: 0, resetTime: now + windowMs };
  
  // Reset counter if the window has elapsed
  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }
  
  // Increment counter
  record.count += 1;
  rateLimitCache.set(identifier, record);
  
  // Check if over limit
  if (record.count > limit) {
    return Promise.resolve(
      errorResponse(
        'Rate limit exceeded', 
        HttpStatus.TOO_MANY_REQUESTS,
        { 
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
          limit,
          remaining: 0
        }
      )
    );
  }
  
  // Execute handler with remaining count in headers
  return handler()
    .then(result => {
      if (result instanceof NextResponse) {
        result.headers.set('X-RateLimit-Limit', String(limit));
        result.headers.set('X-RateLimit-Remaining', String(limit - record.count));
        result.headers.set('X-RateLimit-Reset', String(Math.ceil(record.resetTime / 1000)));
      }
      return result;
    });
}

// Combine multiple middlewares
export function combineMiddlewares<T>(
  handler: () => Promise<T>,
  middlewares: Array<(handler: () => Promise<T>) => Promise<T | NextResponse>>
): Promise<T | NextResponse> {
  return middlewares.reduceRight(
    (acc, middleware) => () => middleware(acc),
    handler
  )();
} 