/**
 * Advanced Logging and Monitoring System
 * 
 * Features:
 * - Multiple log levels
 * - Request/Response logging
 * - Performance monitoring
 * - Error tracking
 * - Integration with external monitoring services
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  duration?: number;
}

interface LoggerConfig {
  level: LogLevel;
  enableConsole?: boolean;
  enableMonitoring?: boolean;
  monitoringEndpoint?: string;
  maxLogSize?: number;
}

class Logger {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private startTimes: Map<string, number> = new Map();

  constructor(config: LoggerConfig) {
    this.config = {
      level: config.level || 'info',
      enableConsole: config.enableConsole ?? true,
      enableMonitoring: config.enableMonitoring ?? false,
      monitoringEndpoint: config.monitoringEndpoint,
      maxLogSize: config.maxLogSize || 1000
    };
  }

  /**
   * Log a message with the specified level
   */
  log(level: LogLevel, message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context
    };

    this.addLog(entry);
  }

  /**
   * Start timing an operation
   */
  startTimer(operationId: string): void {
    this.startTimes.set(operationId, performance.now());
  }

  /**
   * End timing an operation and log the duration
   */
  endTimer(operationId: string, message: string, context?: Record<string, any>): void {
    const startTime = this.startTimes.get(operationId);
    if (!startTime) return;

    const duration = performance.now() - startTime;
    this.startTimes.delete(operationId);

    this.log('info', message, {
      ...context,
      duration: `${duration.toFixed(2)}ms`
    });
  }

  /**
   * Log an API request
   */
  logRequest(method: string, url: string, headers?: Record<string, string>): void {
    this.log('debug', `API Request: ${method} ${url}`, {
      headers: this.sanitizeHeaders(headers)
    });
  }

  /**
   * Log an API response
   */
  logResponse(method: string, url: string, status: number, duration: number): void {
    this.log('debug', `API Response: ${method} ${url}`, {
      status,
      duration: `${duration.toFixed(2)}ms`
    });
  }

  /**
   * Log an API error
   */
  logError(method: string, url: string, error: Error, context?: Record<string, any>): void {
    this.log('error', `API Error: ${method} ${url}`, {
      error: error.message,
      stack: error.stack,
      ...context
    });
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.config.level);
  }

  /**
   * Add a log entry
   */
  private addLog(entry: LogEntry): void {
    // Maintain log size limit
    if (this.logs.length >= this.config.maxLogSize!) {
      this.logs.shift();
    }

    this.logs.push(entry);

    // Console output
    if (this.config.enableConsole) {
      const consoleMethod = entry.level === 'error' ? 'error' : 'log';
      console[consoleMethod](`[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`, entry.context || '');
    }

    // Send to monitoring service if enabled
    if (this.config.enableMonitoring && this.config.monitoringEndpoint) {
      this.sendToMonitoring(entry).catch(() => {
        // Silently fail monitoring
      });
    }
  }

  /**
   * Send log to monitoring service
   */
  private async sendToMonitoring(entry: LogEntry): Promise<void> {
    if (!this.config.monitoringEndpoint) return;

    try {
      await fetch(this.config.monitoringEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(entry)
      });
    } catch (error) {
      // Silently fail monitoring
    }
  }

  /**
   * Sanitize headers for logging
   */
  private sanitizeHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
    if (!headers) return undefined;

    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}

export default Logger; 