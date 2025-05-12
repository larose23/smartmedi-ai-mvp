import { supabase } from '@/lib/supabase';
import { NotificationService, NotificationPriority, NotificationType } from './NotificationService';

export enum CriticalEventType {
  SECURITY_BREACH = 'security_breach',
  SYSTEM_FAILURE = 'system_failure',
  DATA_LOSS = 'data_loss',
  COMPLIANCE_VIOLATION = 'compliance_violation',
  PATIENT_SAFETY = 'patient_safety'
}

export enum EscalationLevel {
  LEVEL_1 = 'level_1', // Initial notification
  LEVEL_2 = 'level_2', // Team lead notification
  LEVEL_3 = 'level_3', // Management notification
  LEVEL_4 = 'level_4'  // Executive notification
}

export interface CriticalEvent {
  id: string;
  type: CriticalEventType;
  title: string;
  description: string;
  severity: NotificationPriority;
  status: 'active' | 'acknowledged' | 'resolved';
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  acknowledged_by?: string;
  resolved_by?: string;
  escalation_level: EscalationLevel;
  related_events?: string[];
  metadata?: Record<string, any>;
}

export interface EscalationPath {
  level: EscalationLevel;
  delay_minutes: number;
  notification_channels: string[];
  team_roles: string[];
  message_template: string;
}

export class CriticalEventService {
  private static readonly ESCALATION_PATHS: Record<EscalationLevel, EscalationPath> = {
    [EscalationLevel.LEVEL_1]: {
      level: EscalationLevel.LEVEL_1,
      delay_minutes: 0,
      notification_channels: ['in_app', 'email'],
      team_roles: ['on_call'],
      message_template: 'Critical event detected: {title}. Immediate attention required.'
    },
    [EscalationLevel.LEVEL_2]: {
      level: EscalationLevel.LEVEL_2,
      delay_minutes: 15,
      notification_channels: ['in_app', 'email', 'sms'],
      team_roles: ['team_lead', 'on_call'],
      message_template: 'Critical event escalation: {title}. No response received for 15 minutes.'
    },
    [EscalationLevel.LEVEL_3]: {
      level: EscalationLevel.LEVEL_3,
      delay_minutes: 30,
      notification_channels: ['in_app', 'email', 'sms', 'push'],
      team_roles: ['management', 'team_lead', 'on_call'],
      message_template: 'Critical event escalation: {title}. No response received for 30 minutes.'
    },
    [EscalationLevel.LEVEL_4]: {
      level: EscalationLevel.LEVEL_4,
      delay_minutes: 60,
      notification_channels: ['in_app', 'email', 'sms', 'push'],
      team_roles: ['executive', 'management', 'team_lead', 'on_call'],
      message_template: 'Critical event escalation: {title}. No response received for 60 minutes.'
    }
  };

  static async createCriticalEvent(
    type: CriticalEventType,
    title: string,
    description: string,
    severity: NotificationPriority,
    metadata?: Record<string, any>
  ): Promise<CriticalEvent> {
    try {
      // Create critical event record
      const { data: event, error: eventError } = await supabase
        .from('critical_events')
        .insert({
          type,
          title,
          description,
          severity,
          status: 'active',
          escalation_level: EscalationLevel.LEVEL_1,
          metadata
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Check for similar active events
      const similarEvents = await this.findSimilarEvents(event);
      if (similarEvents.length > 0) {
        // Update related events
        await this.updateRelatedEvents(event.id, similarEvents.map(e => e.id));
      }

      // Start escalation process
      await this.startEscalation(event);

      return event;
    } catch (error) {
      console.error('Error creating critical event:', error);
      throw error;
    }
  }

  static async acknowledgeEvent(
    eventId: string,
    userId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('critical_events')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: userId
        })
        .eq('id', eventId);

      if (error) throw error;

      // Notify team about acknowledgment
      await this.notifyTeam(eventId, 'acknowledged', userId);
    } catch (error) {
      console.error('Error acknowledging event:', error);
      throw error;
    }
  }

  static async resolveEvent(
    eventId: string,
    userId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('critical_events')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: userId
        })
        .eq('id', eventId);

      if (error) throw error;

      // Notify team about resolution
      await this.notifyTeam(eventId, 'resolved', userId);
    } catch (error) {
      console.error('Error resolving event:', error);
      throw error;
    }
  }

  static async escalateEvent(eventId: string): Promise<void> {
    try {
      const { data: event, error: eventError } = await supabase
        .from('critical_events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      if (event.status !== 'active') return;

      const currentLevel = event.escalation_level;
      const nextLevel = this.getNextEscalationLevel(currentLevel);

      if (!nextLevel) return;

      // Update escalation level
      const { error: updateError } = await supabase
        .from('critical_events')
        .update({ escalation_level: nextLevel })
        .eq('id', eventId);

      if (updateError) throw updateError;

      // Notify team at new escalation level
      await this.notifyTeamAtLevel(event, nextLevel);
    } catch (error) {
      console.error('Error escalating event:', error);
      throw error;
    }
  }

  private static async startEscalation(event: CriticalEvent): Promise<void> {
    const path = this.ESCALATION_PATHS[event.escalation_level];
    
    // Notify initial team
    await this.notifyTeamAtLevel(event, event.escalation_level);

    // Schedule next escalation
    if (path.delay_minutes > 0) {
      setTimeout(() => {
        this.escalateEvent(event.id);
      }, path.delay_minutes * 60 * 1000);
    }
  }

  private static async notifyTeamAtLevel(
    event: CriticalEvent,
    level: EscalationLevel
  ): Promise<void> {
    const path = this.ESCALATION_PATHS[level];

    // Get team members for the specified roles
    const { data: teamMembers, error: teamError } = await supabase
      .from('users')
      .select('id, notification_preferences')
      .in('role', path.team_roles);

    if (teamError) throw teamError;

    // Send notifications to team members
    for (const member of teamMembers || []) {
      await NotificationService.createNotification(
        member.id,
        NotificationType.SECURITY,
        event.severity,
        `Critical Event: ${event.title}`,
        path.message_template.replace('{title}', event.title),
        {
          eventId: event.id,
          type: event.type,
          escalationLevel: level
        }
      );
    }
  }

  private static async notifyTeam(
    eventId: string,
    status: 'acknowledged' | 'resolved',
    userId: string
  ): Promise<void> {
    const { data: event, error: eventError } = await supabase
      .from('critical_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError) throw eventError;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('name')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    const message = status === 'acknowledged'
      ? `Critical event "${event.title}" has been acknowledged by ${user.name}`
      : `Critical event "${event.title}" has been resolved by ${user.name}`;

    // Notify all team members involved in the escalation
    const path = this.ESCALATION_PATHS[event.escalation_level];
    const { data: teamMembers, error: teamError } = await supabase
      .from('users')
      .select('id')
      .in('role', path.team_roles);

    if (teamError) throw teamError;

    for (const member of teamMembers || []) {
      if (member.id !== userId) {
        await NotificationService.createNotification(
          member.id,
          NotificationType.SECURITY,
          NotificationPriority.MEDIUM,
          `Critical Event Update: ${event.title}`,
          message,
          { eventId: event.id }
        );
      }
    }
  }

  private static async findSimilarEvents(event: CriticalEvent): Promise<CriticalEvent[]> {
    const { data, error } = await supabase
      .from('critical_events')
      .select('*')
      .eq('type', event.type)
      .eq('status', 'active')
      .lt('created_at', new Date(Date.now() + 5 * 60 * 1000).toISOString()) // Within last 5 minutes
      .neq('id', event.id);

    if (error) throw error;
    return data || [];
  }

  private static async updateRelatedEvents(
    eventId: string,
    relatedEventIds: string[]
  ): Promise<void> {
    const { error } = await supabase
      .from('critical_events')
      .update({ related_events: relatedEventIds })
      .eq('id', eventId);

    if (error) throw error;
  }

  private static getNextEscalationLevel(currentLevel: EscalationLevel): EscalationLevel | null {
    switch (currentLevel) {
      case EscalationLevel.LEVEL_1:
        return EscalationLevel.LEVEL_2;
      case EscalationLevel.LEVEL_2:
        return EscalationLevel.LEVEL_3;
      case EscalationLevel.LEVEL_3:
        return EscalationLevel.LEVEL_4;
      case EscalationLevel.LEVEL_4:
        return null;
      default:
        return null;
    }
  }
} 