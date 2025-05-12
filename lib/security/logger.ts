import { config } from '../config';
import { supabase } from '../supabase';

interface SecurityEvent {
  timestamp: number;
  type: 'auth' | 'api' | 'csrf' | 'rate_limit' | 'ip_block';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metadata: Record<string, any>;
}

interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  lastUpdated: number;
}

class SecurityLogger {
  private static instance: SecurityLogger;
  private events: SecurityEvent[] = [];
  private readonly maxEvents: number = 1000;
  private metrics: SecurityMetrics = {
    totalEvents: 0,
    eventsByType: {},
    eventsBySeverity: {},
    lastUpdated: Date.now(),
  };

  private constructor() {
    // Initialize with empty events array
    this.loadEvents();
  }

  public static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }

  private async loadEvents(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(this.maxEvents);

      if (error) throw error;

      if (data) {
        this.events = data.map(event => ({
          ...event,
          timestamp: new Date(event.timestamp).getTime(),
        }));
        this.updateMetrics();
      }
    } catch (error) {
      console.error('Failed to load security events:', error);
    }
  }

  public async log(event: Omit<SecurityEvent, 'timestamp'>): Promise<void> {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: Date.now(),
    };

    this.events.push(securityEvent);
    this.trimEvents();
    await this.persistEvent(securityEvent);
    this.updateMetrics();
    this.checkForAlerts(securityEvent);
  }

  private updateMetrics(): void {
    const metrics: SecurityMetrics = {
      totalEvents: this.events.length,
      eventsByType: {},
      eventsBySeverity: {},
      lastUpdated: Date.now(),
    };

    this.events.forEach(event => {
      // Count by type
      metrics.eventsByType[event.type] = (metrics.eventsByType[event.type] || 0) + 1;
      // Count by severity
      metrics.eventsBySeverity[event.severity] = (metrics.eventsBySeverity[event.severity] || 0) + 1;
    });

    this.metrics = metrics;
  }

  private async persistEvent(event: SecurityEvent): Promise<void> {
    try {
      // Store in Supabase
      const { error } = await supabase
        .from('security_events')
        .insert({
          ...event,
          timestamp: new Date(event.timestamp).toISOString(),
        });

      if (error) throw error;

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[Security Event]', event);
      }
    } catch (error) {
      console.error('Failed to persist security event:', error);
    }
  }

  private checkForAlerts(event: SecurityEvent): void {
    // Check for critical events
    if (event.severity === 'critical') {
      this.sendAlert(event);
    }

    // Check for high severity events in the last hour
    if (event.severity === 'high') {
      const highSeverityCount = this.events.filter(e => 
        e.severity === 'high' && 
        e.timestamp > Date.now() - 3600000
      ).length;

      if (highSeverityCount >= 5) {
        this.sendAlert({
          type: 'alert',
          severity: 'critical',
          message: 'Multiple high severity events detected',
          metadata: { count: highSeverityCount },
        });
      }
    }
  }

  private async sendAlert(event: SecurityEvent): Promise<void> {
    // In a real implementation, this would send alerts via email, Slack, etc.
    console.error('[SECURITY ALERT]', {
      ...event,
      timestamp: new Date(event.timestamp).toISOString(),
    });
  }

  public getMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  public getEvents(filter?: Partial<SecurityEvent>): SecurityEvent[] {
    if (!filter) {
      return [...this.events];
    }

    return this.events.filter(event => {
      return Object.entries(filter).every(([key, value]) => {
        return event[key as keyof SecurityEvent] === value;
      });
    });
  }

  public async clearEvents(): Promise<void> {
    try {
      const { error } = await supabase
        .from('security_events')
        .delete()
        .neq('id', 0); // Delete all events

      if (error) throw error;

      this.events = [];
      this.updateMetrics();
    } catch (error) {
      console.error('Failed to clear security events:', error);
    }
  }

  private trimEvents(): void {
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }
}

// Export singleton instance
export const securityLogger = SecurityLogger.getInstance();

// Helper functions for common security events
export const logAuthEvent = (message: string, metadata: Record<string, any> = {}) => {
  securityLogger.log({
    type: 'auth',
    severity: 'medium',
    message,
    metadata,
  });
};

export const logApiEvent = (message: string, metadata: Record<string, any> = {}) => {
  securityLogger.log({
    type: 'api',
    severity: 'low',
    message,
    metadata,
  });
};

export const logSecurityViolation = (message: string, metadata: Record<string, any> = {}) => {
  securityLogger.log({
    type: 'csrf',
    severity: 'high',
    message,
    metadata,
  });
};

export const logRateLimitExceeded = (message: string, metadata: Record<string, any> = {}) => {
  securityLogger.log({
    type: 'rate_limit',
    severity: 'medium',
    message,
    metadata,
  });
}; 