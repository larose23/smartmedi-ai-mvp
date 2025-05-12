# Advanced API Features Documentation

This document describes the advanced features available in the SmartMedi AI API client.

## Table of Contents
1. [API Versioning](#api-versioning)
2. [Caching Strategies](#caching-strategies)
3. [Logging and Monitoring](#logging-and-monitoring)

## API Versioning

The API client supports versioning to ensure backward compatibility and smooth transitions between API versions.

### Configuration

```typescript
const apiClient = new ApiClient({
  baseUrl: 'https://api.example.com',
  version: 'v1' // Default version
});
```

### Usage

- Version is automatically added to API URLs (e.g., `/api/v1/patients`)
- Version information is sent in the `X-API-Version` header
- Can be overridden per request if needed

## Caching Strategies

The API client implements multiple caching strategies to optimize performance and reduce server load.

### Available Strategies

1. **Memory Cache (Default)**
   - Simple in-memory caching
   - No expiration
   - Good for static data

2. **LRU Cache**
   - Least Recently Used eviction
   - Configurable size limit
   - Ideal for frequently accessed data

3. **Time-based Cache**
   - Configurable TTL (Time To Live)
   - Automatic expiration
   - Good for semi-static data

4. **Stale-While-Revalidate**
   - Returns cached data immediately
   - Updates cache in background
   - Perfect for real-time data

### Configuration

```typescript
const apiClient = new ApiClient({
  baseUrl: 'https://api.example.com',
  cacheStrategy: 'stale-while-revalidate',
  cacheTTL: 300000 // 5 minutes
});
```

### Usage Examples

```typescript
// Use stale-while-revalidate for real-time data
await apiClient.get('/patients/123', {
  cacheStrategy: 'stale-while-revalidate'
});

// Use LRU cache for large lists
await apiClient.get('/patients', {
  cacheStrategy: 'lru',
  maxSize: 100
});

// Use time-based cache for semi-static data
await apiClient.get('/departments', {
  cacheStrategy: 'time',
  cacheTTL: 3600000 // 1 hour
});
```

## Logging and Monitoring

The API client includes a comprehensive logging and monitoring system.

### Features

- Multiple log levels (debug, info, warn, error)
- Request/Response logging
- Performance monitoring
- Error tracking
- Integration with external monitoring services

### Configuration

```typescript
const apiClient = new ApiClient({
  baseUrl: 'https://api.example.com',
  logging: {
    level: 'debug',
    enableConsole: true,
    enableMonitoring: true,
    monitoringEndpoint: 'https://monitoring.example.com/logs'
  }
});
```

### Log Levels

- `debug`: Detailed information for debugging
- `info`: General operational information
- `warn`: Warning messages for potential issues
- `error`: Error messages for actual problems

### Performance Monitoring

```typescript
// Automatic timing of API requests
const patient = await apiClient.get('/patients/123');
// Duration is automatically logged

// Manual timing of operations
logger.startTimer('operation-id');
// ... perform operation ...
logger.endTimer('operation-id', 'Operation completed');
```

### Error Tracking

```typescript
try {
  await apiClient.get('/patients/123');
} catch (error) {
  // Error is automatically logged with stack trace
  // and request context
}
```

### Monitoring Integration

The logger can send logs to external monitoring services:

```typescript
const logger = new Logger({
  level: 'info',
  enableMonitoring: true,
  monitoringEndpoint: 'https://monitoring.example.com/logs'
});
```

## Best Practices

1. **API Versioning**
   - Always specify API version in client configuration
   - Use version headers for backward compatibility
   - Plan version transitions carefully

2. **Caching**
   - Choose appropriate strategy based on data type
   - Set reasonable TTL values
   - Monitor cache hit rates
   - Clear cache when data is updated

3. **Logging**
   - Use appropriate log levels
   - Include relevant context in logs
   - Monitor error rates
   - Set up alerts for critical errors

## Troubleshooting

### Common Issues

1. **Cache Issues**
   - Clear cache using `apiClient.clearCache()`
   - Check cache strategy configuration
   - Verify TTL settings

2. **Logging Issues**
   - Check log level configuration
   - Verify monitoring endpoint
   - Check network connectivity for monitoring

3. **Version Issues**
   - Verify version in URL
   - Check version headers
   - Ensure backward compatibility

## Security Considerations

1. **Caching**
   - Don't cache sensitive data
   - Use appropriate TTL for sensitive data
   - Clear cache on logout

2. **Logging**
   - Sanitize sensitive data in logs
   - Use appropriate log levels
   - Secure monitoring endpoints

3. **Versioning**
   - Maintain backward compatibility
   - Document breaking changes
   - Plan version deprecation 