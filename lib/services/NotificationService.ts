import { supabase } from '@/lib/supabase';
import { User } from '@/types/user';
import { NotificationTemplateService, NotificationTemplate } from './NotificationTemplateService';

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push'
}

export enum NotificationType {
  APPOINTMENT = 'appointment',
  REMINDER = 'reminder',
  WAITLIST = 'waitlist',
  SYSTEM = 'system',
  SECURITY = 'security'
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  channels: NotificationChannel[];
  data?: Record<string, any>;
  acknowledged: boolean;
  created_at: string;
  expires_at?: string;
}

export class NotificationService {
  private static readonly CHANNEL_PRIORITY_MAP = {
    [NotificationPriority.URGENT]: [
      NotificationChannel.SMS,
      NotificationChannel.PUSH,
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL
    ],
    [NotificationPriority.HIGH]: [
      NotificationChannel.PUSH,
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL
    ],
    [NotificationPriority.MEDIUM]: [
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL
    ],
    [NotificationPriority.LOW]: [
      NotificationChannel.IN_APP
    ]
  };

  static async createNotification(
    userId: string,
    type: NotificationType,
    priority: NotificationPriority,
    title: string,
    message: string,
    data?: Record<string, any>,
    expiresAt?: Date
  ): Promise<Notification> {
    try {
      // Get user preferences
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('notification_preferences')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Determine channels based on priority and user preferences
      const channels = this.determineChannels(priority, user.notification_preferences);

      // Create notification record
      const { data: notification, error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          priority,
          title,
          message,
          channels,
          data,
          acknowledged: false,
          expires_at: expiresAt?.toISOString()
        })
        .select()
        .single();

      if (notificationError) throw notificationError;

      // Send notifications through each channel
      await this.sendNotifications(notification);

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  static async getNotifications(
    userId: string,
    options: {
      unacknowledgedOnly?: boolean;
      type?: NotificationType;
      priority?: NotificationPriority;
      limit?: number;
    } = {}
  ): Promise<Notification[]> {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options.unacknowledgedOnly) {
        query = query.eq('acknowledged', false);
      }

      if (options.type) {
        query = query.eq('type', options.type);
      }

      if (options.priority) {
        query = query.eq('priority', options.priority);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw error;
    }
  }

  static async acknowledgeNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ acknowledged: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error acknowledging notification:', error);
      throw error;
    }
  }

  static async acknowledgeAllNotifications(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ acknowledged: true })
        .eq('user_id', userId)
        .eq('acknowledged', false);

      if (error) throw error;
    } catch (error) {
      console.error('Error acknowledging all notifications:', error);
      throw error;
    }
  }

  private static determineChannels(
    priority: NotificationPriority,
    userPreferences: Record<NotificationChannel, boolean>
  ): NotificationChannel[] {
    const priorityChannels = this.CHANNEL_PRIORITY_MAP[priority];
    return priorityChannels.filter(channel => userPreferences[channel]);
  }

  private static async sendNotifications(notification: Notification): Promise<void> {
    const sendPromises = notification.channels.map(channel =>
      this.sendNotification(notification, channel)
    );

    await Promise.all(sendPromises);
  }

  private static async sendNotification(
    notification: Notification,
    channel: NotificationChannel
  ): Promise<void> {
    try {
      switch (channel) {
        case NotificationChannel.IN_APP:
          // In-app notifications are already stored in the database
          break;

        case NotificationChannel.EMAIL:
          await this.sendEmailNotification(notification);
          break;

        case NotificationChannel.SMS:
          await this.sendSMSNotification(notification);
          break;

        case NotificationChannel.PUSH:
          await this.sendPushNotification(notification);
          break;
      }
    } catch (error) {
      console.error(`Error sending ${channel} notification:`, error);
      // Don't throw the error to prevent blocking other channels
    }
  }

  private static async sendEmailNotification(notification: Notification): Promise<void> {
    // Implementation would use email service
    console.log(`Sending email notification to user ${notification.user_id}`);
  }

  private static async sendSMSNotification(notification: Notification): Promise<void> {
    // Implementation would use SMS service
    console.log(`Sending SMS notification to user ${notification.user_id}`);
  }

  private static async sendPushNotification(notification: Notification): Promise<void> {
    // Implementation would use push notification service
    console.log(`Sending push notification to user ${notification.user_id}`);
  }

  static subscribeToNotifications(
    userId: string,
    callback: (notification: Notification) => void
  ): () => void {
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new as Notification);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  static async updateUserPreferences(
    userId: string,
    preferences: Record<NotificationChannel, boolean>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ notification_preferences: preferences })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  static async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  static async deleteExpiredNotifications(): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting expired notifications:', error);
      throw error;
    }
  }

  static async createNotificationFromTemplate(
    userId: string,
    templateId: string,
    variables: Record<string, string>,
    data?: Record<string, any>,
    expiresAt?: Date
  ): Promise<Notification> {
    try {
      // Get user and their role
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*, role_id')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Get role notification settings
      const roleSettings = await NotificationTemplateService.getRoleNotificationSettings(user.role_id);
      const template = await NotificationTemplateService.getTemplate(templateId);

      // Check if notifications of this type are enabled for the role
      const roleSetting = roleSettings.find(s => s.notification_type === template.type);
      if (!roleSetting?.enabled) {
        throw new Error(`Notifications of type ${template.type} are disabled for this role`);
      }

      // Get time-sensitive rules
      const timeRules = await NotificationTemplateService.getTimeSensitiveRules(user.role_id);
      const activeRule = NotificationTemplateService.getActiveTimeSensitiveRule(timeRules);

      // Render template with variables
      const { title, message } = await NotificationTemplateService.renderTemplate(templateId, variables);

      // Determine channels based on role settings and time-sensitive rules
      let channels = roleSetting.allowed_channels;
      let priority = template.priority;

      if (activeRule) {
        channels = activeRule.channels;
        if (activeRule.priority_override) {
          priority = activeRule.priority_override;
        }
      }

      // Create and send notification
      return await this.createNotification(
        userId,
        template.type,
        priority,
        title,
        message,
        data,
        expiresAt
      );
    } catch (error) {
      console.error('Error creating notification from template:', error);
      throw error;
    }
  }
} 