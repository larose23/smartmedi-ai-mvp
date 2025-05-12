import { securityLogger } from '../logger';
import { supabase } from '../../supabase';

// Define HIPAA audit event types
export enum HIPAAEventType {
  ACCESS = 'access',
  CREATION = 'creation',
  MODIFICATION = 'modification',
  DELETION = 'deletion',
  DISCLOSURE = 'disclosure',
  EXPORT = 'export'
}

// Define PHI (Protected Health Information) categories
export enum PHICategory {
  PATIENT_IDENTIFIERS = 'patient_identifiers',
  MEDICAL_RECORDS = 'medical_records',
  BILLING_INFO = 'billing_info',
  APPOINTMENTS = 'appointments',
  LAB_RESULTS = 'lab_results',
  PRESCRIPTIONS = 'prescriptions'
}

interface HIPAAAuditLog {
  id: string;
  timestamp: number;
  userId: string;
  userRole: string;
  eventType: HIPAAEventType;
  phiCategory: PHICategory;
  resourceId: string;
  action: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
}

class HIPAAAuditLogger {
  private static instance: HIPAAAuditLogger;

  private constructor() {}

  public static getInstance(): HIPAAAuditLogger {
    if (!HIPAAAuditLogger.instance) {
      HIPAAAuditLogger.instance = new HIPAAAuditLogger();
    }
    return HIPAAAuditLogger.instance;
  }

  public async logAccess(
    userId: string,
    userRole: string,
    phiCategory: PHICategory,
    resourceId: string,
    action: string,
    details: Record<string, any>,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    await this.logEvent({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      userId,
      userRole,
      eventType: HIPAAEventType.ACCESS,
      phiCategory,
      resourceId,
      action,
      details,
      ipAddress,
      userAgent,
      success,
      errorMessage
    });
  }

  public async logModification(
    userId: string,
    userRole: string,
    phiCategory: PHICategory,
    resourceId: string,
    action: string,
    details: Record<string, any>,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    await this.logEvent({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      userId,
      userRole,
      eventType: HIPAAEventType.MODIFICATION,
      phiCategory,
      resourceId,
      action,
      details,
      ipAddress,
      userAgent,
      success,
      errorMessage
    });
  }

  public async logDisclosure(
    userId: string,
    userRole: string,
    phiCategory: PHICategory,
    resourceId: string,
    action: string,
    details: Record<string, any>,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    await this.logEvent({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      userId,
      userRole,
      eventType: HIPAAEventType.DISCLOSURE,
      phiCategory,
      resourceId,
      action,
      details,
      ipAddress,
      userAgent,
      success,
      errorMessage
    });
  }

  private async logEvent(log: HIPAAAuditLog): Promise<void> {
    try {
      // Store in Supabase
      const { error } = await supabase
        .from('hipaa_audit_logs')
        .insert({
          ...log,
          timestamp: new Date(log.timestamp).toISOString()
        });

      if (error) throw error;

      // Also log to security logger for immediate monitoring
      securityLogger.log({
        type: 'hipaa',
        severity: log.success ? 'low' : 'high',
        message: `HIPAA ${log.eventType} event: ${log.action}`,
        metadata: {
          userId: log.userId,
          userRole: log.userRole,
          phiCategory: log.phiCategory,
          resourceId: log.resourceId,
          success: log.success,
          errorMessage: log.errorMessage
        }
      });
    } catch (error) {
      console.error('Failed to log HIPAA audit event:', error);
      // Even if logging fails, we should log the failure
      securityLogger.log({
        type: 'hipaa',
        severity: 'critical',
        message: 'Failed to log HIPAA audit event',
        metadata: {
          error: error.message,
          originalEvent: log
        }
      });
    }
  }

  public async getAuditLogs(
    filters: Partial<HIPAAAuditLog>,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100,
    offset: number = 0
  ): Promise<HIPAAAuditLog[]> {
    try {
      let query = supabase
        .from('hipaa_audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit)
        .offset(offset);

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          query = query.eq(key, value);
        }
      });

      // Apply date range if provided
      if (startDate) {
        query = query.gte('timestamp', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('timestamp', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map(log => ({
        ...log,
        timestamp: new Date(log.timestamp).getTime()
      }));
    } catch (error) {
      console.error('Failed to retrieve HIPAA audit logs:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const hipaaAuditLogger = HIPAAAuditLogger.getInstance(); 