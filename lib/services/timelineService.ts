import { hipaaAuditLogger, PHICategory } from '../security/hipaa/audit';

export interface TimelineEvent {
  id: string;
  type: 'visit' | 'procedure' | 'medication' | 'lab' | 'diagnosis' | 'outcome';
  timestamp: Date;
  title: string;
  description: string;
  outcome?: {
    status: 'positive' | 'negative' | 'neutral';
    metrics: {
      name: string;
      value: number;
      unit: string;
      change: number;
    }[];
  };
  relatedEvents?: string[];
  tags?: string[];
}

export interface SimilarCase {
  id: string;
  similarity: number;
  events: TimelineEvent[];
  outcomes: {
    status: 'positive' | 'negative' | 'neutral';
    description: string;
  }[];
}

export class TimelineService {
  private static instance: TimelineService;
  private events: Map<string, TimelineEvent[]> = new Map();
  private similarCases: Map<string, SimilarCase[]> = new Map();

  private constructor() {}

  public static getInstance(): TimelineService {
    if (!TimelineService.instance) {
      TimelineService.instance = new TimelineService();
    }
    return TimelineService.instance;
  }

  async getTimelineEvents(
    patientId: string,
    timeRange: 'week' | 'month' | 'year' | 'all'
  ): Promise<TimelineEvent[]> {
    try {
      // In a real implementation, this would fetch from a database
      const events = this.events.get(patientId) || [];
      
      const now = new Date();
      const filteredEvents = events.filter(event => {
        if (timeRange === 'all') return true;
        
        const diff = now.getTime() - event.timestamp.getTime();
        const days = diff / (1000 * 60 * 60 * 24);
        
        switch (timeRange) {
          case 'week':
            return days <= 7;
          case 'month':
            return days <= 30;
          case 'year':
            return days <= 365;
          default:
            return true;
        }
      });

      await hipaaAuditLogger.logAccess(
        'system',
        'provider',
        PHICategory.PHI,
        'timeline_events_access',
        { patientId, timeRange },
        '127.0.0.1',
        'TimelineService',
        true
      );

      return filteredEvents;
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'timeline_events_access_error',
        { error: error.message },
        '127.0.0.1',
        'TimelineService'
      );
      throw error;
    }
  }

  async findSimilarCases(
    patientId: string,
    eventId: string,
    limit: number = 5
  ): Promise<SimilarCase[]> {
    try {
      const patientEvents = this.events.get(patientId) || [];
      const targetEvent = patientEvents.find(e => e.id === eventId);
      
      if (!targetEvent) {
        throw new Error('Event not found');
      }

      // In a real implementation, this would use ML/AI to find similar cases
      // For now, we'll use a simple similarity calculation based on event types
      const similarCases = Array.from(this.similarCases.entries())
        .filter(([id]) => id !== patientId)
        .map(([id, cases]) => {
          const similarity = this.calculateSimilarity(targetEvent, cases[0].events);
          return {
            ...cases[0],
            id,
            similarity
          };
        })
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      await hipaaAuditLogger.logAccess(
        'system',
        'provider',
        PHICategory.PHI,
        'similar_cases_access',
        { patientId, eventId },
        '127.0.0.1',
        'TimelineService',
        true
      );

      return similarCases;
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'similar_cases_access_error',
        { error: error.message },
        '127.0.0.1',
        'TimelineService'
      );
      throw error;
    }
  }

  private calculateSimilarity(targetEvent: TimelineEvent, caseEvents: TimelineEvent[]): number {
    // Simple similarity calculation based on event type and tags
    const typeMatch = caseEvents.some(e => e.type === targetEvent.type) ? 0.4 : 0;
    
    const tagMatches = targetEvent.tags?.reduce((score, tag) => {
      return score + (caseEvents.some(e => e.tags?.includes(tag)) ? 0.1 : 0);
    }, 0) || 0;

    return Math.min(typeMatch + tagMatches, 1);
  }

  async addEvent(
    patientId: string,
    event: Omit<TimelineEvent, 'id'>
  ): Promise<TimelineEvent> {
    try {
      const events = this.events.get(patientId) || [];
      const newEvent: TimelineEvent = {
        ...event,
        id: `event-${Date.now()}`
      };

      events.push(newEvent);
      this.events.set(patientId, events);

      await hipaaAuditLogger.logAccess(
        'system',
        'provider',
        PHICategory.PHI,
        'timeline_event_add',
        { patientId, eventId: newEvent.id },
        '127.0.0.1',
        'TimelineService',
        true
      );

      return newEvent;
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'timeline_event_add_error',
        { error: error.message },
        '127.0.0.1',
        'TimelineService'
      );
      throw error;
    }
  }

  async updateEvent(
    patientId: string,
    eventId: string,
    updates: Partial<TimelineEvent>
  ): Promise<TimelineEvent> {
    try {
      const events = this.events.get(patientId) || [];
      const eventIndex = events.findIndex(e => e.id === eventId);
      
      if (eventIndex === -1) {
        throw new Error('Event not found');
      }

      const updatedEvent = {
        ...events[eventIndex],
        ...updates
      };

      events[eventIndex] = updatedEvent;
      this.events.set(patientId, events);

      await hipaaAuditLogger.logAccess(
        'system',
        'provider',
        PHICategory.PHI,
        'timeline_event_update',
        { patientId, eventId },
        '127.0.0.1',
        'TimelineService',
        true
      );

      return updatedEvent;
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'timeline_event_update_error',
        { error: error.message },
        '127.0.0.1',
        'TimelineService'
      );
      throw error;
    }
  }

  async deleteEvent(
    patientId: string,
    eventId: string
  ): Promise<void> {
    try {
      const events = this.events.get(patientId) || [];
      const filteredEvents = events.filter(e => e.id !== eventId);
      
      if (filteredEvents.length === events.length) {
        throw new Error('Event not found');
      }

      this.events.set(patientId, filteredEvents);

      await hipaaAuditLogger.logAccess(
        'system',
        'provider',
        PHICategory.PHI,
        'timeline_event_delete',
        { patientId, eventId },
        '127.0.0.1',
        'TimelineService',
        true
      );
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'timeline_event_delete_error',
        { error: error.message },
        '127.0.0.1',
        'TimelineService'
      );
      throw error;
    }
  }
} 