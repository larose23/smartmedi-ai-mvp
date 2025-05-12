/**
 * Tests for the API Monitoring Service
 */

import monitoringService from '../monitoring';
import { MonitoringMetrics, MonitoringEvent } from '../monitoring';

describe('MonitoringService', () => {
  beforeEach(() => {
    // Reset metrics before each test
    jest.clearAllMocks();
  });

  describe('trackRequest', () => {
    it('should track request metrics correctly', () => {
      const startTime = Date.now() - 100; // Simulate 100ms request
      monitoringService.trackRequest('GET', '/api/patients', startTime);

      const metrics = monitoringService.getMetrics();
      expect(metrics.requestCount).toBe(1);
      expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(100);
    });

    it('should track multiple requests and calculate average response time', () => {
      const startTime1 = Date.now() - 100;
      const startTime2 = Date.now() - 200;

      monitoringService.trackRequest('GET', '/api/patients', startTime1);
      monitoringService.trackRequest('POST', '/api/appointments', startTime2);

      const metrics = monitoringService.getMetrics();
      expect(metrics.requestCount).toBe(2);
      expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(150);
    });
  });

  describe('trackError', () => {
    it('should track error metrics correctly', () => {
      const error = new Error('API Error');
      monitoringService.trackError('GET', '/api/patients', error, 500);

      const metrics = monitoringService.getMetrics();
      expect(metrics.errorCount).toBe(1);
    });

    it('should track error events with correct data', () => {
      const error = new Error('API Error');
      monitoringService.trackError('GET', '/api/patients', error, 500);

      const events = monitoringService.getEvents();
      const errorEvent = events.find(e => e.type === 'error');

      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data.method).toBe('GET');
      expect(errorEvent?.data.url).toBe('/api/patients');
      expect(errorEvent?.data.error).toBe('API Error');
      expect(errorEvent?.data.status).toBe(500);
    });
  });

  describe('trackCache', () => {
    it('should track cache hits and misses correctly', () => {
      monitoringService.trackCache('patient-123', true);
      monitoringService.trackCache('patient-456', false);

      const metrics = monitoringService.getMetrics();
      expect(metrics.cacheHitRate).toBe(0.5); // 1 hit out of 2 requests
    });

    it('should track cache events with correct data', () => {
      monitoringService.trackCache('patient-123', true);

      const events = monitoringService.getEvents();
      const cacheEvent = events.find(e => e.type === 'cache');

      expect(cacheEvent).toBeDefined();
      expect(cacheEvent?.data.key).toBe('patient-123');
      expect(cacheEvent?.data.hit).toBe(true);
    });
  });

  describe('trackVersion', () => {
    it('should track API version usage correctly', () => {
      monitoringService.trackVersion('v1');
      monitoringService.trackVersion('v1');
      monitoringService.trackVersion('v2');

      const metrics = monitoringService.getMetrics();
      expect(metrics.versionUsage['v1']).toBe(2);
      expect(metrics.versionUsage['v2']).toBe(1);
    });

    it('should track version events with correct data', () => {
      monitoringService.trackVersion('v1');

      const events = monitoringService.getEvents();
      const versionEvent = events.find(e => e.type === 'version');

      expect(versionEvent).toBeDefined();
      expect(versionEvent?.data.version).toBe('v1');
    });
  });

  describe('getMetrics', () => {
    it('should return a copy of metrics', () => {
      const metrics1 = monitoringService.getMetrics();
      const metrics2 = monitoringService.getMetrics();

      expect(metrics1).toEqual(metrics2);
      expect(metrics1).not.toBe(metrics2); // Should be a copy
    });
  });

  describe('getEvents', () => {
    it('should return recent events with limit', () => {
      // Add multiple events
      for (let i = 0; i < 150; i++) {
        monitoringService.trackRequest('GET', `/api/test${i}`, Date.now());
      }

      const events = monitoringService.getEvents(100);
      expect(events.length).toBe(100);
      expect(events[0].type).toBe('request');
    });

    it('should return all events if limit is not specified', () => {
      // Add multiple events
      for (let i = 0; i < 50; i++) {
        monitoringService.trackRequest('GET', `/api/test${i}`, Date.now());
      }

      const events = monitoringService.getEvents();
      expect(events.length).toBe(50);
    });
  });
}); 