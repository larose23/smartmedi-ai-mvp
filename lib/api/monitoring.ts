/**
 * API Monitoring Service
 * 
 * Tracks API performance metrics and errors:
 * - Request/response times
 * - Error rates and types
 * - Cache hit/miss rates
 * - API version usage
 */

import { Logger } from './logger';

export interface MonitoringMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  cacheHitRate: number;
  versionUsage: Record<string, number>;
}

export interface MonitoringEvent {
  type: 'request' | 'error' | 'cache' | 'version';
  timestamp: number;
  data: any;
}

class MonitoringService {
  private logger: Logger;
  private metrics: MonitoringMetrics;
  private events: MonitoringEvent[];
  private readonly MAX_EVENTS = 1000;
  private readonly FLUSH_INTERVAL = 60000; // 1 minute

  constructor() {
    this.logger = new Logger({
      level: 'info',
      enableConsole: true,
      enableMonitoring: true
    });

    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      versionUsage: {}
    };

    this.events = [];

    // Start periodic metric flushing
    setInterval(() => this.flushMetrics(), this.FLUSH_INTERVAL);
  }

  /**
   * Track a new API request
   */
  trackRequest(method: string, url: string, startTime: number): void {
    const duration = Date.now() - startTime;
    
    this.metrics.requestCount++;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.requestCount - 1) + duration) / 
      this.metrics.requestCount;

    this.events.push({
      type: 'request',
      timestamp: Date.now(),
      data: {
        method,
        url,
        duration
      }
    });

    this.logger.log('debug', `API Request: ${method} ${url}`, {
      duration,
      timestamp: new Date().toISOString()
    });

    this.checkEventLimit();
  }

  /**
   * Track an API error
   */
  trackError(method: string, url: string, error: Error, status?: number): void {
    this.metrics.errorCount++;

    this.events.push({
      type: 'error',
      timestamp: Date.now(),
      data: {
        method,
        url,
        error: error.message,
        status,
        stack: error.stack
      }
    });

    this.logger.log('error', `API Error: ${method} ${url}`, {
      error: error.message,
      status,
      timestamp: new Date().toISOString()
    });

    this.checkEventLimit();
  }

  /**
   * Track cache performance
   */
  trackCache(key: string, hit: boolean): void {
    const totalCacheRequests = this.events.filter(e => e.type === 'cache').length;
    this.metrics.cacheHitRate = 
      (this.metrics.cacheHitRate * totalCacheRequests + (hit ? 1 : 0)) / 
      (totalCacheRequests + 1);

    this.events.push({
      type: 'cache',
      timestamp: Date.now(),
      data: {
        key,
        hit
      }
    });

    this.logger.log('debug', `Cache ${hit ? 'Hit' : 'Miss'}: ${key}`, {
      timestamp: new Date().toISOString()
    });

    this.checkEventLimit();
  }

  /**
   * Track API version usage
   */
  trackVersion(version: string): void {
    this.metrics.versionUsage[version] = (this.metrics.versionUsage[version] || 0) + 1;

    this.events.push({
      type: 'version',
      timestamp: Date.now(),
      data: {
        version
      }
    });

    this.checkEventLimit();
  }

  /**
   * Get current metrics
   */
  getMetrics(): MonitoringMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent events
   */
  getEvents(limit: number = 100): MonitoringEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Flush metrics to external monitoring service
   */
  private async flushMetrics(): Promise<void> {
    try {
      // Here you would typically send metrics to your monitoring service
      // For example: DataDog, New Relic, or a custom solution
      this.logger.log('info', 'Flushing metrics', {
        metrics: this.metrics,
        eventCount: this.events.length
      });

      // Clear events after successful flush
      this.events = [];
    } catch (error) {
      this.logger.log('error', 'Failed to flush metrics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check if we need to trim events
   */
  private checkEventLimit(): void {
    if (this.events.length > this.MAX_EVENTS) {
      // Keep only the most recent events
      this.events = this.events.slice(-this.MAX_EVENTS);
    }
  }
}

// Create and export a singleton instance
const monitoringService = new MonitoringService();
export default monitoringService; 