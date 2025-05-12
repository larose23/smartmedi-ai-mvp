import { createClient } from '@supabase/supabase-js';
import { securityLogger } from '../security/logger';

// Query cache configuration
interface CacheConfig {
  ttl: number;
  maxSize: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  hits: number;
}

class QueryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    this.startCleanupInterval();
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, 60000); // Clean up every minute
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.ttl) {
        this.cache.delete(key);
      }
    }

    // If cache is still too large, remove least accessed entries
    if (this.cache.size > this.config.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].hits - b[1].hits);
      const entriesToRemove = entries.slice(0, entries.length - this.config.maxSize);
      for (const [key] of entriesToRemove) {
        this.cache.delete(key);
      }
    }
  }

  public get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.config.ttl) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.data;
  }

  public set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0
    });
  }

  public invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// Initialize query cache
const queryCache = new QueryCache({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 1000 // Maximum number of cached queries
});

// Initialize Supabase client with optimized settings
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10 // Limit events per second to prevent overwhelming
      }
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-application-name': 'smartmedi-ai-mvp'
      }
    }
  }
);

// Add response interceptor for error handling
supabase.rest.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Log error
    securityLogger.log({
      type: 'supabase',
      severity: 'high',
      message: 'Supabase request failed',
      metadata: {
        error: error.message,
        status: error.status,
        url: error.config?.url
      }
    });

    // Handle specific error cases
    if (error.status === 401) {
      // Handle authentication error
      try {
        await supabase.auth.refreshSession();
      } catch (refreshError) {
        securityLogger.log({
          type: 'supabase',
          severity: 'high',
          message: 'Failed to refresh session',
          metadata: { error: refreshError.message }
        });
      }
    } else if (error.status === 429) {
      // Handle rate limiting
      const retryAfter = error.headers?.['retry-after'] || 5;
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    }

    return Promise.reject(error);
  }
);

// Add request interceptor for performance monitoring and caching
supabase.rest.interceptors.request.use(
  (config) => {
    const startTime = Date.now();
    config.metadata = { startTime };

    // Check cache for GET requests
    if (config.method === 'get') {
      const cacheKey = `${config.url}${JSON.stringify(config.params || {})}`;
      const cachedData = queryCache.get(cacheKey);
      if (cachedData) {
        return {
          ...config,
          adapter: () => Promise.resolve({
            data: cachedData,
            status: 200,
            statusText: 'OK',
            headers: {},
            config
          })
        };
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Monitor query performance and handle caching
const queryPerformanceThreshold = 1000; // 1 second
supabase.rest.interceptors.response.use(
  (response) => {
    const startTime = response.config.metadata?.startTime;
    if (startTime) {
      const duration = Date.now() - startTime;
      if (duration > queryPerformanceThreshold) {
        securityLogger.log({
          type: 'performance',
          severity: 'medium',
          message: 'Slow Supabase query detected',
          metadata: {
            duration,
            url: response.config.url,
            method: response.config.method
          }
        });
      }
    }

    // Cache successful GET responses
    if (response.config.method === 'get' && response.status === 200) {
      const cacheKey = `${response.config.url}${JSON.stringify(response.config.params || {})}`;
      queryCache.set(cacheKey, response.data);
    }

    return response;
  },
  (error) => Promise.reject(error)
);

// Export initialized client and cache
export { queryCache };
export default supabase; 