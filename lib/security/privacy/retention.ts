import { supabase } from '../../supabase';
import { securityLogger } from '../logger';
import { hipaaAuditLogger } from '../hipaa/audit';

// Define data categories and their retention periods (in milliseconds)
export enum DataCategory {
  MEDICAL_RECORDS = 'medical_records',
  BILLING_RECORDS = 'billing_records',
  APPOINTMENT_RECORDS = 'appointment_records',
  COMMUNICATION_LOGS = 'communication_logs',
  AUDIT_LOGS = 'audit_logs',
  CONSENT_RECORDS = 'consent_records'
}

const RETENTION_PERIODS: Record<DataCategory, number> = {
  [DataCategory.MEDICAL_RECORDS]: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
  [DataCategory.BILLING_RECORDS]: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
  [DataCategory.APPOINTMENT_RECORDS]: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years
  [DataCategory.COMMUNICATION_LOGS]: 365 * 24 * 60 * 60 * 1000, // 1 year
  [DataCategory.AUDIT_LOGS]: 6 * 365 * 24 * 60 * 60 * 1000, // 6 years
  [DataCategory.CONSENT_RECORDS]: 7 * 365 * 24 * 60 * 60 * 1000 // 7 years
};

interface RetentionPolicy {
  category: DataCategory;
  retentionPeriod: number;
  purgeStrategy: 'soft' | 'hard';
  archiveBeforePurge: boolean;
}

class DataRetentionManager {
  private static instance: DataRetentionManager;
  private readonly CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly policies: Map<DataCategory, RetentionPolicy>;

  private constructor() {
    this.policies = new Map();
    this.initializePolicies();
    this.startRetentionChecks();
  }

  public static getInstance(): DataRetentionManager {
    if (!DataRetentionManager.instance) {
      DataRetentionManager.instance = new DataRetentionManager();
    }
    return DataRetentionManager.instance;
  }

  private initializePolicies(): void {
    Object.values(DataCategory).forEach(category => {
      this.policies.set(category, {
        category,
        retentionPeriod: RETENTION_PERIODS[category],
        purgeStrategy: 'soft',
        archiveBeforePurge: true
      });
    });
  }

  private startRetentionChecks(): void {
    setInterval(() => {
      this.checkAndPurgeData().catch(error => {
        securityLogger.log({
          type: 'privacy',
          severity: 'high',
          message: 'Failed to perform retention check',
          metadata: { error: error.message }
        });
      });
    }, this.CHECK_INTERVAL);
  }

  public async checkAndPurgeData(): Promise<void> {
    try {
      for (const [category, policy] of this.policies) {
        const cutoffDate = new Date(Date.now() - policy.retentionPeriod);
        
        // Get records eligible for purging
        const { data: records, error } = await supabase
          .from(this.getTableName(category))
          .select('*')
          .lt('createdAt', cutoffDate.toISOString());

        if (error) throw error;

        if (records && records.length > 0) {
          await this.purgeRecords(category, records, policy);
        }
      }
    } catch (error) {
      securityLogger.log({
        type: 'privacy',
        severity: 'high',
        message: 'Failed to check and purge data',
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  private async purgeRecords(
    category: DataCategory,
    records: any[],
    policy: RetentionPolicy
  ): Promise<void> {
    try {
      if (policy.archiveBeforePurge) {
        await this.archiveRecords(category, records);
      }

      if (policy.purgeStrategy === 'soft') {
        await this.softDeleteRecords(category, records);
      } else {
        await this.hardDeleteRecords(category, records);
      }

      // Log the purge operation
      securityLogger.log({
        type: 'privacy',
        severity: 'low',
        message: 'Data purged according to retention policy',
        metadata: {
          category,
          recordCount: records.length,
          purgeStrategy: policy.purgeStrategy
        }
      });
    } catch (error) {
      securityLogger.log({
        type: 'privacy',
        severity: 'high',
        message: 'Failed to purge records',
        metadata: {
          category,
          error: error.message
        }
      });
      throw error;
    }
  }

  private async archiveRecords(category: DataCategory, records: any[]): Promise<void> {
    try {
      const archiveTable = `${this.getTableName(category)}_archive`;
      
      // Create archive table if it doesn't exist
      await supabase.rpc('create_archive_table', {
        table_name: archiveTable,
        source_table: this.getTableName(category)
      });

      // Insert records into archive table
      const { error } = await supabase
        .from(archiveTable)
        .insert(records.map(record => ({
          ...record,
          archivedAt: new Date().toISOString()
        })));

      if (error) throw error;

      securityLogger.log({
        type: 'privacy',
        severity: 'low',
        message: 'Records archived',
        metadata: {
          category,
          recordCount: records.length
        }
      });
    } catch (error) {
      securityLogger.log({
        type: 'privacy',
        severity: 'high',
        message: 'Failed to archive records',
        metadata: {
          category,
          error: error.message
        }
      });
      throw error;
    }
  }

  private async softDeleteRecords(category: DataCategory, records: any[]): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.getTableName(category))
        .update({ deletedAt: new Date().toISOString() })
        .in('id', records.map(r => r.id));

      if (error) throw error;
    } catch (error) {
      securityLogger.log({
        type: 'privacy',
        severity: 'high',
        message: 'Failed to soft delete records',
        metadata: {
          category,
          error: error.message
        }
      });
      throw error;
    }
  }

  private async hardDeleteRecords(category: DataCategory, records: any[]): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.getTableName(category))
        .delete()
        .in('id', records.map(r => r.id));

      if (error) throw error;
    } catch (error) {
      securityLogger.log({
        type: 'privacy',
        severity: 'high',
        message: 'Failed to hard delete records',
        metadata: {
          category,
          error: error.message
        }
      });
      throw error;
    }
  }

  private getTableName(category: DataCategory): string {
    switch (category) {
      case DataCategory.MEDICAL_RECORDS:
        return 'medical_records';
      case DataCategory.BILLING_RECORDS:
        return 'billing_records';
      case DataCategory.APPOINTMENT_RECORDS:
        return 'appointments';
      case DataCategory.COMMUNICATION_LOGS:
        return 'communication_logs';
      case DataCategory.AUDIT_LOGS:
        return 'hipaa_audit_logs';
      case DataCategory.CONSENT_RECORDS:
        return 'patient_consents';
      default:
        throw new Error(`Unknown data category: ${category}`);
    }
  }

  public async updateRetentionPolicy(
    category: DataCategory,
    policy: Partial<RetentionPolicy>
  ): Promise<void> {
    try {
      const currentPolicy = this.policies.get(category);
      if (!currentPolicy) {
        throw new Error(`No policy found for category: ${category}`);
      }

      this.policies.set(category, {
        ...currentPolicy,
        ...policy
      });

      securityLogger.log({
        type: 'privacy',
        severity: 'low',
        message: 'Retention policy updated',
        metadata: {
          category,
          policy: this.policies.get(category)
        }
      });
    } catch (error) {
      securityLogger.log({
        type: 'privacy',
        severity: 'high',
        message: 'Failed to update retention policy',
        metadata: {
          category,
          error: error.message
        }
      });
      throw error;
    }
  }

  public getRetentionPolicy(category: DataCategory): RetentionPolicy | undefined {
    return this.policies.get(category);
  }

  public async getRetentionStats(): Promise<Record<DataCategory, {
    totalRecords: number;
    expiredRecords: number;
    archivedRecords: number;
  }>> {
    const stats: Record<DataCategory, any> = {};

    for (const category of Object.values(DataCategory)) {
      const policy = this.policies.get(category);
      if (!policy) continue;

      const cutoffDate = new Date(Date.now() - policy.retentionPeriod);

      const { data: totalCount } = await supabase
        .from(this.getTableName(category))
        .select('id', { count: 'exact' });

      const { data: expiredCount } = await supabase
        .from(this.getTableName(category))
        .select('id', { count: 'exact' })
        .lt('createdAt', cutoffDate.toISOString());

      const { data: archivedCount } = await supabase
        .from(`${this.getTableName(category)}_archive`)
        .select('id', { count: 'exact' });

      stats[category] = {
        totalRecords: totalCount || 0,
        expiredRecords: expiredCount || 0,
        archivedRecords: archivedCount || 0
      };
    }

    return stats;
  }
}

// Export singleton instance
export const dataRetentionManager = DataRetentionManager.getInstance(); 