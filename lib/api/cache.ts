/**
 * Advanced Caching System for API Client
 * 
 * Implements different caching strategies:
 * - Memory Cache (default)
 * - LRU Cache
 * - Time-based Cache
 * - Stale-While-Revalidate
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  etag?: string;
  lastModified?: string;
}

interface CacheConfig {
  strategy: 'memory' | 'lru' | 'time' | 'stale-while-revalidate';
  maxSize?: number;
  ttl?: number;
  staleWhileRevalidate?: boolean;
}

class Cache {
  private cache: Map<string, CacheEntry<any>>;
  private config: CacheConfig;
  private maxSize: number;
  private ttl: number;

  constructor(config: CacheConfig = { strategy: 'memory' }) {
    this.cache = new Map();
    this.config = config;
    this.maxSize = config.maxSize || 1000;
    this.ttl = config.ttl || 60000; // Default 1 minute
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if entry is expired
    if (this.isExpired(entry)) {
      this.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, metadata?: { etag?: string; lastModified?: string }): void {
    // Handle LRU eviction if needed
    if (this.config.strategy === 'lru' && this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      etag: metadata?.etag,
      lastModified: metadata?.lastModified
    };

    this.cache.set(key, entry);
  }

  /**
   * Delete a value from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Check if an entry is expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    if (this.config.strategy === 'time') {
      return Date.now() - entry.timestamp > this.ttl;
    }
    return false;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.config.strategy !== 'lru') return;

    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Handle stale-while-revalidate strategy
   */
  async handleStaleWhileRevalidate<T>(
    key: string,
    fetchFn: () => Promise<T>,
    metadata?: { etag?: string; lastModified?: string }
  ): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached) {
      // Start revalidation in background
      fetchFn().then(newData => {
        this.set(key, newData, metadata);
      }).catch(() => {
        // Silently fail revalidation
      });
      
      return cached;
    }

    // No cache, fetch fresh data
    const freshData = await fetchFn();
    this.set(key, freshData, metadata);
    return freshData;
  }
}

export default Cache; 