import Cache from './cache';

describe('Cache', () => {
  let cache: Cache;

  beforeEach(() => {
    cache = new Cache({ strategy: 'memory' });
  });

  describe('Basic Operations', () => {
    it('should set and get values', () => {
      cache.set('test', { data: 'value' });
      expect(cache.get('test')).toEqual({ data: 'value' });
    });

    it('should return null for non-existent keys', () => {
      expect(cache.get('non-existent')).toBeNull();
    });

    it('should delete values', () => {
      cache.set('test', { data: 'value' });
      cache.delete('test');
      expect(cache.get('test')).toBeNull();
    });

    it('should clear all values', () => {
      cache.set('test1', { data: 'value1' });
      cache.set('test2', { data: 'value2' });
      cache.clear();
      expect(cache.get('test1')).toBeNull();
      expect(cache.get('test2')).toBeNull();
    });
  });

  describe('Time-based Cache', () => {
    beforeEach(() => {
      cache = new Cache({ 
        strategy: 'time',
        ttl: 100 // 100ms TTL
      });
    });

    it('should expire entries after TTL', async () => {
      cache.set('test', { data: 'value' });
      expect(cache.get('test')).toEqual({ data: 'value' });
      
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cache.get('test')).toBeNull();
    });
  });

  describe('LRU Cache', () => {
    beforeEach(() => {
      cache = new Cache({ 
        strategy: 'lru',
        maxSize: 2
      });
    });

    it('should evict least recently used entries when full', () => {
      cache.set('test1', { data: 'value1' });
      cache.set('test2', { data: 'value2' });
      cache.set('test3', { data: 'value3' });
      
      expect(cache.get('test1')).toBeNull(); // Should be evicted
      expect(cache.get('test2')).toEqual({ data: 'value2' });
      expect(cache.get('test3')).toEqual({ data: 'value3' });
    });

    it('should update LRU order on get', () => {
      cache.set('test1', { data: 'value1' });
      cache.set('test2', { data: 'value2' });
      
      cache.get('test1'); // Access test1 to make it most recently used
      cache.set('test3', { data: 'value3' });
      
      expect(cache.get('test1')).toEqual({ data: 'value1' });
      expect(cache.get('test2')).toBeNull(); // Should be evicted
      expect(cache.get('test3')).toEqual({ data: 'value3' });
    });
  });

  describe('Stale-While-Revalidate', () => {
    beforeEach(() => {
      cache = new Cache({ 
        strategy: 'stale-while-revalidate'
      });
    });

    it('should return cached data while revalidating', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ data: 'fresh' });
      
      // First call - no cache
      const result1 = await cache.handleStaleWhileRevalidate('test', fetchFn);
      expect(result1).toEqual({ data: 'fresh' });
      expect(fetchFn).toHaveBeenCalledTimes(1);
      
      // Second call - should return cached data and revalidate
      const result2 = await cache.handleStaleWhileRevalidate('test', fetchFn);
      expect(result2).toEqual({ data: 'fresh' });
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('should handle fetch errors during revalidation', async () => {
      const fetchFn = jest.fn()
        .mockResolvedValueOnce({ data: 'initial' })
        .mockRejectedValueOnce(new Error('Fetch failed'));
      
      // First call - no cache
      const result1 = await cache.handleStaleWhileRevalidate('test', fetchFn);
      expect(result1).toEqual({ data: 'initial' });
      
      // Second call - should return cached data even if revalidation fails
      const result2 = await cache.handleStaleWhileRevalidate('test', fetchFn);
      expect(result2).toEqual({ data: 'initial' });
    });
  });

  describe('Metadata Handling', () => {
    it('should store and retrieve metadata', () => {
      const metadata = {
        etag: 'abc123',
        lastModified: '2024-01-01T00:00:00Z'
      };
      
      cache.set('test', { data: 'value' }, metadata);
      const result = cache.get('test');
      expect(result).toEqual({ data: 'value' });
    });
  });
}); 