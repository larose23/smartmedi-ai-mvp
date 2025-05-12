import { supabase } from '@/lib/supabase';
import { CriticalEventService, CriticalEvent, CriticalEventType } from './CriticalEventService';
import { NotificationService, NotificationPriority } from './NotificationService';

interface AggregatedAlert {
  id: string;
  type: CriticalEventType;
  count: number;
  first_occurrence: string;
  last_occurrence: string;
  severity: NotificationPriority;
  status: 'active' | 'resolved';
  related_event_ids: string[];
  metadata: Record<string, any>;
}

export class AlertAggregator {
  private static readonly AGGREGATION_WINDOW_MINUTES = 5;
  private static readonly MAX_ALERTS_PER_WINDOW = 3;
  private static readonly SEVERITY_WEIGHTS: Record<NotificationPriority, number> = {
    [NotificationPriority.URGENT]: 4,
    [NotificationPriority.HIGH]: 3,
    [NotificationPriority.MEDIUM]: 2,
    [NotificationPriority.LOW]: 1
  };

  static async aggregateAlerts(
    type: CriticalEventType,
    title: string,
    description: string,
    severity: NotificationPriority,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Check for existing aggregated alert
      const { data: existingAlert, error: fetchError } = await supabase
        .from('aggregated_alerts')
        .select('*')
        .eq('type', type)
        .eq('status', 'active')
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (existingAlert) {
        // Update existing aggregated alert
        await this.updateAggregatedAlert(existingAlert, severity, metadata);
      } else {
        // Check if we should create a new aggregated alert
        const shouldCreate = await this.shouldCreateNewAlert(type);
        if (shouldCreate) {
          await this.createAggregatedAlert(type, title, description, severity, metadata);
        } else {
          // Create individual critical event without aggregation
          await CriticalEventService.createCriticalEvent(
            type,
            title,
            description,
            severity,
            metadata
          );
        }
      }
    } catch (error) {
      console.error('Error aggregating alerts:', error);
      throw error;
    }
  }

  private static async shouldCreateNewAlert(type: CriticalEventType): Promise<boolean> {
    const windowStart = new Date(Date.now() - this.AGGREGATION_WINDOW_MINUTES * 60 * 1000);

    const { data: recentAlerts, error } = await supabase
      .from('aggregated_alerts')
      .select('count')
      .eq('type', type)
      .gte('created_at', windowStart.toISOString())
      .eq('status', 'active');

    if (error) throw error;

    const totalCount = recentAlerts?.reduce((sum, alert) => sum + alert.count, 0) || 0;
    return totalCount < this.MAX_ALERTS_PER_WINDOW;
  }

  private static async createAggregatedAlert(
    type: CriticalEventType,
    title: string,
    description: string,
    severity: NotificationPriority,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Create critical event
      const event = await CriticalEventService.createCriticalEvent(
        type,
        title,
        description,
        severity,
        metadata
      );

      // Create aggregated alert
      const { error } = await supabase
        .from('aggregated_alerts')
        .insert({
          type,
          count: 1,
          first_occurrence: event.created_at,
          last_occurrence: event.created_at,
          severity,
          status: 'active',
          related_event_ids: [event.id],
          metadata
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating aggregated alert:', error);
      throw error;
    }
  }

  private static async updateAggregatedAlert(
    alert: AggregatedAlert,
    severity: NotificationPriority,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Create critical event
      const event = await CriticalEventService.createCriticalEvent(
        alert.type,
        `Aggregated ${alert.type} Alert`,
        `This is part of an aggregated alert with ${alert.count + 1} occurrences`,
        this.calculateAggregatedSeverity(alert.severity, severity),
        metadata
      );

      // Update aggregated alert
      const { error } = await supabase
        .from('aggregated_alerts')
        .update({
          count: alert.count + 1,
          last_occurrence: event.created_at,
          severity: this.calculateAggregatedSeverity(alert.severity, severity),
          related_event_ids: [...alert.related_event_ids, event.id],
          metadata: this.mergeMetadata(alert.metadata, metadata)
        })
        .eq('id', alert.id);

      if (error) throw error;

      // Notify team about aggregation
      await this.notifyTeamAboutAggregation(alert, event);
    } catch (error) {
      console.error('Error updating aggregated alert:', error);
      throw error;
    }
  }

  private static calculateAggregatedSeverity(
    currentSeverity: NotificationPriority,
    newSeverity: NotificationPriority
  ): NotificationPriority {
    const currentWeight = this.SEVERITY_WEIGHTS[currentSeverity];
    const newWeight = this.SEVERITY_WEIGHTS[newSeverity];
    const maxWeight = Math.max(currentWeight, newWeight);

    return Object.entries(this.SEVERITY_WEIGHTS).find(
      ([_, weight]) => weight === maxWeight
    )?.[0] as NotificationPriority;
  }

  private static mergeMetadata(
    currentMetadata: Record<string, any>,
    newMetadata?: Record<string, any>
  ): Record<string, any> {
    if (!newMetadata) return currentMetadata;

    return {
      ...currentMetadata,
      ...newMetadata,
      last_updated: new Date().toISOString()
    };
  }

  private static async notifyTeamAboutAggregation(
    alert: AggregatedAlert,
    newEvent: CriticalEvent
  ): Promise<void> {
    const { data: teamMembers, error } = await supabase
      .from('users')
      .select('id')
      .in('role', ['team_lead', 'on_call']);

    if (error) throw error;

    const message = `Alert aggregation: ${alert.count + 1} occurrences of ${alert.type} in the last ${this.AGGREGATION_WINDOW_MINUTES} minutes`;

    for (const member of teamMembers || []) {
      await NotificationService.createNotification(
        member.id,
        'SECURITY',
        alert.severity,
        'Alert Aggregation',
        message,
        {
          alertId: alert.id,
          eventId: newEvent.id,
          type: alert.type
        }
      );
    }
  }

  static async resolveAggregatedAlert(alertId: string): Promise<void> {
    try {
      const { data: alert, error: fetchError } = await supabase
        .from('aggregated_alerts')
        .select('*')
        .eq('id', alertId)
        .single();

      if (fetchError) throw fetchError;

      // Update aggregated alert status
      const { error: updateError } = await supabase
        .from('aggregated_alerts')
        .update({ status: 'resolved' })
        .eq('id', alertId);

      if (updateError) throw updateError;

      // Resolve all related critical events
      for (const eventId of alert.related_event_ids) {
        await CriticalEventService.resolveEvent(eventId, 'system');
      }

      // Notify team about resolution
      await this.notifyTeamAboutResolution(alert);
    } catch (error) {
      console.error('Error resolving aggregated alert:', error);
      throw error;
    }
  }

  private static async notifyTeamAboutResolution(alert: AggregatedAlert): Promise<void> {
    const { data: teamMembers, error } = await supabase
      .from('users')
      .select('id')
      .in('role', ['team_lead', 'on_call']);

    if (error) throw error;

    const message = `Aggregated alert resolved: ${alert.count} occurrences of ${alert.type} have been addressed`;

    for (const member of teamMembers || []) {
      await NotificationService.createNotification(
        member.id,
        'SECURITY',
        NotificationPriority.MEDIUM,
        'Alert Resolution',
        message,
        {
          alertId: alert.id,
          type: alert.type
        }
      );
    }
  }
} 