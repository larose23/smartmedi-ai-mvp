import Logger from './logger';

describe('Logger', () => {
  let logger: Logger;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    logger = new Logger({ level: 'debug' });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Log Levels', () => {
    it('should log messages at or above the configured level', () => {
      logger = new Logger({ level: 'warn' });
      
      logger.log('debug', 'debug message');
      logger.log('info', 'info message');
      logger.log('warn', 'warn message');
      logger.log('error', 'error message');
      
      expect(consoleSpy).toHaveBeenCalledTimes(2); // Only warn and error
    });

    it('should include timestamp and level in log messages', () => {
      logger.log('info', 'test message');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\] INFO: test message/),
        undefined
      );
    });
  });

  describe('Performance Monitoring', () => {
    it('should track operation duration', () => {
      const operationId = 'test-operation';
      
      logger.startTimer(operationId);
      logger.endTimer(operationId, 'Operation completed');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\] INFO: Operation completed/),
        expect.objectContaining({
          duration: expect.stringMatching(/\d+\.\d+ms/)
        })
      );
    });

    it('should handle missing timer gracefully', () => {
      logger.endTimer('non-existent', 'Should not log');
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('API Request/Response Logging', () => {
    it('should log API requests with sanitized headers', () => {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer secret-token',
        'X-API-Key': 'api-key-123'
      };
      
      logger.logRequest('GET', '/api/test', headers);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\] DEBUG: API Request: GET \/api\/test/),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'Authorization': '[REDACTED]',
            'X-API-Key': '[REDACTED]'
          }
        })
      );
    });

    it('should log API responses with status and duration', () => {
      logger.logResponse('GET', '/api/test', 200, 150);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\] DEBUG: API Response: GET \/api\/test/),
        expect.objectContaining({
          status: 200,
          duration: '150.00ms'
        })
      );
    });

    it('should log API errors with stack trace', () => {
      const error = new Error('API Error');
      error.stack = 'Error stack trace';
      
      logger.logError('GET', '/api/test', error, { context: 'test' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\] ERROR: API Error: GET \/api\/test/),
        expect.objectContaining({
          error: 'API Error',
          stack: 'Error stack trace',
          context: 'test'
        })
      );
    });
  });

  describe('Log Management', () => {
    it('should maintain log size limit', () => {
      logger = new Logger({ level: 'info', maxLogSize: 2 });
      
      logger.log('info', 'message 1');
      logger.log('info', 'message 2');
      logger.log('info', 'message 3');
      
      const logs = logger.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].message).toBe('message 2');
      expect(logs[1].message).toBe('message 3');
    });

    it('should clear logs', () => {
      logger.log('info', 'test message');
      logger.clearLogs();
      
      expect(logger.getLogs()).toHaveLength(0);
    });
  });

  describe('Monitoring Integration', () => {
    let fetchSpy: jest.SpyInstance;
    
    beforeEach(() => {
      fetchSpy = jest.spyOn(global, 'fetch').mockImplementation();
      logger = new Logger({
        level: 'info',
        enableMonitoring: true,
        monitoringEndpoint: 'https://monitoring.example.com/logs'
      });
    });

    afterEach(() => {
      fetchSpy.mockRestore();
    });

    it('should send logs to monitoring endpoint', async () => {
      logger.log('info', 'test message', { context: 'test' });
      
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://monitoring.example.com/logs',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: expect.stringContaining('test message')
        })
      );
    });

    it('should handle monitoring endpoint errors gracefully', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('Network error'));
      
      logger.log('info', 'test message');
      
      // Should not throw error
      expect(fetchSpy).toHaveBeenCalled();
    });
  });
}); 