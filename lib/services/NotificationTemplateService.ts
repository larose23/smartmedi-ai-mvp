import { supabase } from '@/lib/supabase';
import { NotificationType, NotificationPriority, NotificationChannel } from './NotificationService';

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  title_template: string;
  message_template: string;
  priority: NotificationPriority;
  default_channels: NotificationChannel[];
  variables: string[];
  created_at: string;
  updated_at: string;
}

export interface RoleNotificationSettings {
  role_id: string;
  notification_type: NotificationType;
  enabled: boolean;
  allowed_channels: NotificationChannel[];
  time_sensitive_rules: TimeSensitiveRule[];
}

export interface TimeSensitiveRule {
  id: string;
  start_time: string; // HH:mm format
  end_time: string; // HH:mm format
  days_of_week: number[]; // 0-6 for Sunday-Saturday
  channels: NotificationChannel[];
  priority_override?: NotificationPriority;
}

export class NotificationTemplateService {
  static async createTemplate(template: Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<NotificationTemplate> {
    try {
      // Validate template variables
      this.validateTemplateVariables(template.title_template, template.message_template, template.variables);

      const { data, error } = await supabase
        .from('notification_templates')
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating notification template:', error);
      throw error;
    }
  }

  private static validateTemplateVariables(
    titleTemplate: string,
    messageTemplate: string,
    variables: string[]
  ): void {
    // Check for duplicate variables
    const uniqueVariables = new Set(variables);
    if (uniqueVariables.size !== variables.length) {
      throw new Error('Template contains duplicate variables');
    }

    // Extract variables from templates
    const titleVars = this.extractTemplateVariables(titleTemplate);
    const messageVars = this.extractTemplateVariables(messageTemplate);

    // Check for undefined variables in templates
    const undefinedVars = [...titleVars, ...messageVars].filter(
      v => !variables.includes(v)
    );
    if (undefinedVars.length > 0) {
      throw new Error(`Template contains undefined variables: ${undefinedVars.join(', ')}`);
    }

    // Check for unused variables
    const usedVars = new Set([...titleVars, ...messageVars]);
    const unusedVars = variables.filter(v => !usedVars.has(v));
    if (unusedVars.length > 0) {
      throw new Error(`Template contains unused variables: ${unusedVars.join(', ')}`);
    }
  }

  private static extractTemplateVariables(template: string): string[] {
    const regex = /{{([^}]+)}}/g;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(template)) !== null) {
      variables.push(match[1].trim());
    }

    return variables;
  }

  static async getTemplate(templateId: string): Promise<NotificationTemplate> {
    try {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting notification template:', error);
      throw error;
    }
  }

  static async updateTemplate(
    templateId: string,
    updates: Partial<Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<NotificationTemplate> {
    try {
      const { data, error } = await supabase
        .from('notification_templates')
        .update(updates)
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating notification template:', error);
      throw error;
    }
  }

  static async deleteTemplate(templateId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notification_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting notification template:', error);
      throw error;
    }
  }

  static async getRoleNotificationSettings(roleId: string): Promise<RoleNotificationSettings[]> {
    try {
      const { data, error } = await supabase
        .from('role_notification_settings')
        .select('*')
        .eq('role_id', roleId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting role notification settings:', error);
      throw error;
    }
  }

  static async updateRoleNotificationSettings(
    roleId: string,
    settings: Omit<RoleNotificationSettings, 'role_id'>[]
  ): Promise<void> {
    try {
      // Delete existing settings
      await supabase
        .from('role_notification_settings')
        .delete()
        .eq('role_id', roleId);

      // Insert new settings
      const settingsWithRoleId = settings.map(setting => ({
        ...setting,
        role_id: roleId
      }));

      const { error } = await supabase
        .from('role_notification_settings')
        .insert(settingsWithRoleId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating role notification settings:', error);
      throw error;
    }
  }

  static async getTimeSensitiveRules(roleId: string): Promise<TimeSensitiveRule[]> {
    try {
      const { data, error } = await supabase
        .from('time_sensitive_rules')
        .select('*')
        .eq('role_id', roleId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting time sensitive rules:', error);
      throw error;
    }
  }

  static async updateTimeSensitiveRules(
    roleId: string,
    rules: Omit<TimeSensitiveRule, 'id'>[]
  ): Promise<void> {
    try {
      // Validate time rules
      this.validateTimeRules(rules);

      // Delete existing rules
      await supabase
        .from('time_sensitive_rules')
        .delete()
        .eq('role_id', roleId);

      // Insert new rules
      const rulesWithRoleId = rules.map(rule => ({
        ...rule,
        role_id: roleId
      }));

      const { error } = await supabase
        .from('time_sensitive_rules')
        .insert(rulesWithRoleId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating time sensitive rules:', error);
      throw error;
    }
  }

  private static validateTimeRules(rules: Omit<TimeSensitiveRule, 'id'>[]): void {
    // Check for overlapping time rules
    for (let i = 0; i < rules.length; i++) {
      const rule1 = rules[i];
      
      // Validate time format
      if (!this.isValidTimeFormat(rule1.start_time) || !this.isValidTimeFormat(rule1.end_time)) {
        throw new Error(`Invalid time format in rule ${i + 1}. Use HH:mm format.`);
      }

      // Validate time range
      if (rule1.start_time >= rule1.end_time) {
        throw new Error(`Invalid time range in rule ${i + 1}. End time must be after start time.`);
      }

      // Validate days of week
      if (!rule1.days_of_week.length) {
        throw new Error(`Rule ${i + 1} must specify at least one day of the week.`);
      }

      if (rule1.days_of_week.some(day => day < 0 || day > 6)) {
        throw new Error(`Invalid day of week in rule ${i + 1}. Days must be 0-6.`);
      }

      // Check for overlapping rules
      for (let j = i + 1; j < rules.length; j++) {
        const rule2 = rules[j];
        
        // Check if rules overlap in time
        if (rule1.start_time < rule2.end_time && rule2.start_time < rule1.end_time) {
          // Check if rules overlap in days
          const overlappingDays = rule1.days_of_week.filter(day => 
            rule2.days_of_week.includes(day)
          );
          
          if (overlappingDays.length > 0) {
            throw new Error(
              `Rules ${i + 1} and ${j + 1} overlap on ${overlappingDays.map(d => 
                ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d]
              ).join(', ')}`
            );
          }
        }
      }
    }
  }

  private static isValidTimeFormat(time: string): boolean {
    const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(time);
  }

  static async renderTemplate(
    templateId: string,
    variables: Record<string, string>
  ): Promise<{ title: string; message: string }> {
    try {
      const template = await this.getTemplate(templateId);
      
      // Validate that all required variables are provided
      const missingVariables = template.variables.filter(
        variable => !(variable in variables)
      );
      
      if (missingVariables.length > 0) {
        throw new Error(`Missing required variables: ${missingVariables.join(', ')}`);
      }

      // Replace variables in templates
      let title = template.title_template;
      let message = template.message_template;

      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        title = title.replace(regex, value);
        message = message.replace(regex, value);
      }

      return { title, message };
    } catch (error) {
      console.error('Error rendering notification template:', error);
      throw error;
    }
  }

  static getActiveTimeSensitiveRule(
    rules: TimeSensitiveRule[],
    currentTime: Date = new Date()
  ): TimeSensitiveRule | null {
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentDay = currentTime.getDay();
    const currentTimeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

    return rules.find(rule => {
      const isWithinTimeRange = currentTimeString >= rule.start_time && currentTimeString <= rule.end_time;
      const isCorrectDay = rule.days_of_week.includes(currentDay);
      return isWithinTimeRange && isCorrectDay;
    }) || null;
  }
} 