/**
 * API Client for SmartMedi AI
 * 
 * A standardized REST API client with:
 * - Request/response interceptors
 * - Error handling and retry logic
 * - Request caching and deduplication
 * - Performance monitoring
 */

import config from '@/lib/config';
import Cache from './cache';
import Logger from './logger';
import monitoringService from './monitoring';

// Types
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface RequestConfig extends RequestInit {
  params?: Record<string, string>;
  retries?: number;
  retryDelay?: number;
  cache?: boolean;
  cacheKey?: string;
  cacheTTL?: number; // Time-to-live in milliseconds
  headers?: Record<string, string>;
  withCredentials?: boolean;
}

interface ApiClientConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  requestInterceptors?: RequestInterceptor[];
  responseInterceptors?: ResponseInterceptor[];
  cache?: boolean;
  cacheTTL?: number;
  version?: string; // API version
  cacheStrategy?: 'memory' | 'lru' | 'time' | 'stale-while-revalidate';
  logging?: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableConsole?: boolean;
    enableMonitoring?: boolean;
    monitoringEndpoint?: string;
  };
}

type RequestInterceptor = (url: string, config: RequestConfig) => { url: string; config: RequestConfig };
type ResponseInterceptor = (response: Response, request: { url: string; config: RequestConfig }) => Promise<Response>;
type ErrorHandler = (error: Error, request: { url: string; config: RequestConfig }) => Promise<Response | void>;

// Cache
const apiCache = new Map<string, { data: any; timestamp: number }>();

// Request deduplication
const pendingRequests: Map<string, Promise<Response>> = new Map();

/**
 * ApiClient class for making standardized HTTP requests
 */
export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;
  private retries: number;
  private retryDelay: number;
  private requestInterceptors: RequestInterceptor[];
  private responseInterceptors: ResponseInterceptor[];
  private errorHandlers: ErrorHandler[];
  private cache: Cache;
  private logger: Logger;
  private version: string;

  constructor(apiConfig: ApiClientConfig) {
    this.baseUrl = apiConfig.baseUrl;
    this.defaultHeaders = apiConfig.defaultHeaders || {};
    this.timeout = apiConfig.timeout || 30000;
    this.retries = apiConfig.retries || 3;
    this.retryDelay = apiConfig.retryDelay || 1000;
    this.requestInterceptors = apiConfig.requestInterceptors || [];
    this.responseInterceptors = apiConfig.responseInterceptors || [];
    this.errorHandlers = [];
    this.version = apiConfig.version || 'v1';

    // Initialize cache with strategy
    this.cache = new Cache({
      strategy: apiConfig.cacheStrategy || 'memory',
      ttl: apiConfig.cacheTTL || 60000
    });

    // Initialize logger
    this.logger = new Logger({
      level: apiConfig.logging?.level || 'info',
      enableConsole: apiConfig.logging?.enableConsole ?? true,
      enableMonitoring: apiConfig.logging?.enableMonitoring ?? false,
      monitoringEndpoint: apiConfig.logging?.monitoringEndpoint
    });
  }

  /**
   * Add a request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add a response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Add an error handler
   */
  addErrorHandler(handler: ErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Clear the API cache
   */
  clearCache(): void {
    apiCache.clear();
  }

  /**
   * Remove a specific item from cache
   */
  invalidateCache(cacheKey: string): void {
    apiCache.delete(cacheKey);
  }

  /**
   * Make an HTTP request
   */
  async request<T = any>(url: string, method: HttpMethod, requestConfig: RequestConfig = {}): Promise<T> {
    const operationId = `${method}-${url}-${Date.now()}`;
    const startTime = Date.now();
    
    this.logger.startTimer(operationId);
    this.logger.logRequest(method, url, requestConfig.headers);

    // Track API version usage
    monitoringService.trackVersion(this.version);

    try {
      // Add version to URL if not already present
      let fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
      if (!fullUrl.includes('/v') && !url.startsWith('http')) {
        fullUrl = fullUrl.replace('/api/', `/api/${this.version}/`);
      }

      let config: RequestConfig = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Version': this.version,
          ...this.defaultHeaders,
          ...requestConfig.headers
        },
        retries: requestConfig.retries !== undefined ? requestConfig.retries : this.retries,
        retryDelay: requestConfig.retryDelay !== undefined ? requestConfig.retryDelay : this.retryDelay,
        cache: requestConfig.cache !== undefined ? requestConfig.cache : true,
        cacheTTL: requestConfig.cacheTTL !== undefined ? requestConfig.cacheTTL : this.cacheTTL,
        ...requestConfig
      };

      // Process request through interceptors
      for (const interceptor of this.requestInterceptors) {
        const result = interceptor(fullUrl, config);
        fullUrl = result.url;
        config = result.config;
      }

      // Handle caching for GET requests
      if (method === 'GET' && config.cache) {
        const cacheKey = config.cacheKey || `${method}:${fullUrl}:${JSON.stringify(config.body)}`;
        
        if (this.cache.config.strategy === 'stale-while-revalidate') {
          const result = await this.cache.handleStaleWhileRevalidate(
            cacheKey,
            () => this.executeFetch<T>(fullUrl, config, cacheKey, true),
            {
              etag: config.headers?.['If-None-Match'],
              lastModified: config.headers?.['If-Modified-Since']
            }
          );

          // Track cache performance
          monitoringService.trackCache(cacheKey, result.fromCache);
          monitoringService.trackRequest(method, url, startTime);

          return result.data;
        }

        const cachedData = this.cache.get<T>(cacheKey);
        if (cachedData) {
          this.logger.log('debug', `Cache hit for ${cacheKey}`);
          monitoringService.trackCache(cacheKey, true);
          monitoringService.trackRequest(method, url, startTime);
          return cachedData;
        }

        monitoringService.trackCache(cacheKey, false);
      }

      const response = await this.executeFetch<T>(fullUrl, config, cacheKey, config.cache);
      this.logger.endTimer(operationId, `Request completed: ${method} ${url}`, {
        status: response.status,
        cached: !!cachedData
      });

      monitoringService.trackRequest(method, url, startTime);
      return response;
    } catch (error) {
      this.logger.logError(method, url, error as Error, {
        config: requestConfig
      });

      monitoringService.trackError(method, url, error as Error);
      throw error;
    }
  }

  /**
   * Execute a fetch request with retry logic
   */
  private async executeFetch<T>(
    url: string,
    config: RequestConfig,
    cacheKey: string,
    shouldCache: boolean
  ): Promise<T> {
    let retries = config.retries || 0;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (attempt > 0 && config.retryDelay) {
          await new Promise(resolve => setTimeout(resolve, config.retryDelay! * attempt));
        }

        const response = await fetch(url, config);
        
        for (const interceptor of this.responseInterceptors) {
          response = await interceptor(response, { url, config });
        }

        if (!response.ok) {
          const errorText = await response.text();
          const error = new Error(`API Error (${response.status}): ${errorText}`);
          
          let handled = false;
          for (const handler of this.errorHandlers) {
            const result = await handler(error, { url, config });
            if (result instanceof Response) {
              response = result;
              handled = true;
              break;
            }
          }

          if (!handled) {
            throw error;
          }
        }

        const data = await response.json();

        if (shouldCache) {
          this.cache.set(cacheKey, data, {
            etag: response.headers.get('ETag') || undefined,
            lastModified: response.headers.get('Last-Modified') || undefined
          });
        }

        return data;
      } catch (error) {
        lastError = error as Error;
        
        const shouldRetry = attempt < retries && !this.isAbortError(error as Error);
        
        if (!shouldRetry) {
          for (const handler of this.errorHandlers) {
            try {
              const result = await handler(error as Error, { url, config });
              if (result instanceof Response) {
                const data = await result.json();
                return data;
              }
            } catch (handlerError) {
              // Continue to the next handler
            }
          }
          
          throw lastError;
        }
      }
    }

    throw lastError;
  }

  /**
   * Check if an error is an AbortError
   */
  private isAbortError(error: Error): boolean {
    return error.name === 'AbortError';
  }

  /**
   * Convenience method for GET requests
   */
  async get<T = any>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, 'GET', config);
  }

  /**
   * Convenience method for POST requests
   */
  async post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, 'POST', {
      ...config,
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * Convenience method for PUT requests
   */
  async put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, 'PUT', {
      ...config,
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * Convenience method for PATCH requests
   */
  async patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, 'PATCH', {
      ...config,
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * Convenience method for DELETE requests
   */
  async delete<T = any>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, 'DELETE', config);
  }
}

// Create default interceptors
const defaultRequestInterceptor: RequestInterceptor = (url, config) => {
  // Add app version header
  config.headers = {
    ...config.headers,
    'X-App-Version': config.app?.ENV || 'development'
  };
  return { url, config };
};

const defaultResponseInterceptor: ResponseInterceptor = async (response, request) => {
  // Log API response times in development
  if (config.app.DEBUG_MODE) {
    console.log(`API ${request.config.method} ${request.url}: ${response.status}`);
  }
  return response;
};

const defaultErrorHandler: ErrorHandler = async (error, request) => {
  // Log errors in development
  if (config.app.DEBUG_MODE) {
    console.error(`API Error: ${request.config.method} ${request.url}`, error);
  }
  
  // Handle timeout errors explicitly
  if (error.name === 'AbortError') {
    console.error('Request timed out:', request.url);
  }
  
  // Pass the error along
  return Promise.reject(error);
};

// Create and export a default API client instance
export const apiClient = new ApiClient({
  baseUrl: config.app.URL,
  defaultHeaders: {
    'Accept': 'application/json',
    'X-Client': 'SmartMedi-Web'
  },
  timeout: 15000, // 15 seconds
  retries: 2,
  retryDelay: 500,
  requestInterceptors: [defaultRequestInterceptor],
  responseInterceptors: [defaultResponseInterceptor],
  cache: true,
  cacheTTL: 60000, // 1 minute
  version: 'v1'
});

// Add the default error handler
apiClient.addErrorHandler(defaultErrorHandler);

export default apiClient; 