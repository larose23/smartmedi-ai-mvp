import { supabase } from '../supabase';
import { securityLogger } from '../security/logger';
import { hipaaAuditLogger, HIPAAEventType, PHICategory } from '../security/hipaa/audit';
import * as crypto from 'crypto';

interface VerificationResult {
  tableName: string;
  totalRecords: number;
  verifiedRecords: number;
  corruptedRecords: number;
  checksumMismatches: number;
  missingRecords: number;
  details: {
    recordId: string;
    issue: 'checksum_mismatch' | 'missing' | 'corrupted';
    expectedChecksum?: string;
    actualChecksum?: string;
  }[];
}

interface RecoveryResult {
  recordId: string;
  status: 'recovered' | 'failed';
  error?: string;
  backupUsed?: string;
}

class DataVerificationManager {
  private static instance: DataVerificationManager;
  private readonly BATCH_SIZE = 1000;
  private readonly VERIFICATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly BACKUP_RETENTION_DAYS = 30; // Keep backups for 30 days
  private lastVerification: Map<string, Date> = new Map();

  private constructor() {
    this.initializeVerificationSchedule();
  }

  public static getInstance(): DataVerificationManager {
    if (!DataVerificationManager.instance) {
      DataVerificationManager.instance = new DataVerificationManager();
    }
    return DataVerificationManager.instance;
  }

  private initializeVerificationSchedule(): void {
    setInterval(() => {
      this.runPeriodicVerification().catch(error => {
        securityLogger.log({
          type: 'verification',
          severity: 'high',
          message: 'Periodic verification failed',
          metadata: { error: error.message }
        });
      });
    }, this.VERIFICATION_INTERVAL);
  }

  public async calculateChecksum(data: any): Promise<string> {
    const stringified = JSON.stringify(data, Object.keys(data).sort());
    return crypto
      .createHash('sha256')
      .update(stringified)
      .digest('hex');
  }

  public async verifyTable(
    tableName: string,
    options: {
      verifyChecksums?: boolean;
      checkReferences?: boolean;
      verifyData?: boolean;
    } = {}
  ): Promise<VerificationResult> {
    try {
      const result: VerificationResult = {
        tableName,
        totalRecords: 0,
        verifiedRecords: 0,
        corruptedRecords: 0,
        checksumMismatches: 0,
        missingRecords: 0,
        details: []
      };

      // Get all records
      const { data: records, error } = await supabase
        .from(tableName)
        .select('*');

      if (error) throw error;

      result.totalRecords = records.length;

      // Process records in batches
      for (let i = 0; i < records.length; i += this.BATCH_SIZE) {
        const batch = records.slice(i, i + this.BATCH_SIZE);
        
        for (const record of batch) {
          let isCorrupted = false;
          let issue: VerificationResult['details'][0]['issue'] | undefined;

          // Verify checksums if enabled
          if (options.verifyChecksums && record.checksum) {
            const calculatedChecksum = await this.calculateChecksum(record);
            if (calculatedChecksum !== record.checksum) {
              isCorrupted = true;
              issue = 'checksum_mismatch';
              result.checksumMismatches++;
              result.details.push({
                recordId: record.id,
                issue,
                expectedChecksum: record.checksum,
                actualChecksum: calculatedChecksum
              });
            }
          }

          // Check references if enabled
          if (options.checkReferences) {
            const referenceChecks = await this.verifyReferences(tableName, record);
            if (!referenceChecks.valid) {
              isCorrupted = true;
              issue = 'missing';
              result.missingRecords++;
              result.details.push({
                recordId: record.id,
                issue,
                expectedChecksum: referenceChecks.expectedChecksum,
                actualChecksum: referenceChecks.actualChecksum
              });
            }
          }

          // Verify data integrity if enabled
          if (options.verifyData) {
            const dataChecks = await this.verifyDataIntegrity(tableName, record);
            if (!dataChecks.valid) {
              isCorrupted = true;
              issue = 'corrupted';
              result.corruptedRecords++;
              result.details.push({
                recordId: record.id,
                issue,
                expectedChecksum: dataChecks.expectedChecksum,
                actualChecksum: dataChecks.actualChecksum
              });
            }
          }

          if (!isCorrupted) {
            result.verifiedRecords++;
          }
        }
      }

      // Log verification results
      securityLogger.log({
        type: 'verification',
        severity: result.corruptedRecords > 0 ? 'high' : 'low',
        message: `Table verification completed for ${tableName}`,
        metadata: {
          tableName,
          totalRecords: result.totalRecords,
          verifiedRecords: result.verifiedRecords,
          corruptedRecords: result.corruptedRecords,
          checksumMismatches: result.checksumMismatches,
          missingRecords: result.missingRecords
        }
      });

      return result;
    } catch (error) {
      securityLogger.log({
        type: 'verification',
        severity: 'high',
        message: `Failed to verify table ${tableName}`,
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  private async verifyReferences(
    tableName: string,
    record: any
  ): Promise<{ valid: boolean; expectedChecksum?: string; actualChecksum?: string }> {
    try {
      // Define reference checks based on table
      const referenceChecks: Record<string, { table: string; field: string }[]> = {
        patients: [
          { table: 'medical_records', field: 'patientId' },
          { table: 'appointments', field: 'patientId' }
        ],
        medical_records: [
          { table: 'patients', field: 'id' }
        ],
        appointments: [
          { table: 'patients', field: 'id' },
          { table: 'staff', field: 'id' }
        ]
      };

      const checks = referenceChecks[tableName] || [];
      for (const check of checks) {
        const { data, error } = await supabase
          .from(check.table)
          .select('id')
          .eq(check.field, record.id)
          .limit(1);

        if (error) throw error;
        if (!data || data.length === 0) {
          return {
            valid: false,
            expectedChecksum: await this.calculateChecksum(record),
            actualChecksum: undefined
          };
        }
      }

      return { valid: true };
    } catch (error) {
      securityLogger.log({
        type: 'verification',
        severity: 'high',
        message: 'Reference verification failed',
        metadata: {
          tableName,
          recordId: record.id,
          error: error.message
        }
      });
      throw error;
    }
  }

  private async verifyDataIntegrity(
    tableName: string,
    record: any
  ): Promise<{ valid: boolean; expectedChecksum?: string; actualChecksum?: string }> {
    try {
      // Define data integrity rules based on table
      const integrityRules: Record<string, (record: any) => boolean> = {
        patients: (r) => {
          return (
            r.email?.includes('@') &&
            r.firstName?.length > 0 &&
            r.lastName?.length > 0 &&
            r.dateOfBirth instanceof Date
          );
        },
        medical_records: (r) => {
          return (
            r.patientId?.length > 0 &&
            r.recordType?.length > 0 &&
            typeof r.content === 'object'
          );
        },
        appointments: (r) => {
          return (
            r.patientId?.length > 0 &&
            r.doctorId?.length > 0 &&
            r.date instanceof Date &&
            ['scheduled', 'completed', 'cancelled'].includes(r.status)
          );
        }
      };

      const rule = integrityRules[tableName];
      if (!rule) return { valid: true };

      const isValid = rule(record);
      if (!isValid) {
        return {
          valid: false,
          expectedChecksum: await this.calculateChecksum(record),
          actualChecksum: undefined
        };
      }

      return { valid: true };
    } catch (error) {
      securityLogger.log({
        type: 'verification',
        severity: 'high',
        message: 'Data integrity verification failed',
        metadata: {
          tableName,
          recordId: record.id,
          error: error.message
        }
      });
      throw error;
    }
  }

  public async recoverRecord(
    tableName: string,
    recordId: string
  ): Promise<RecoveryResult> {
    try {
      // Get backup record
      const { data: backup, error: backupError } = await supabase
        .from(`${tableName}_backup`)
        .select('*')
        .eq('id', recordId)
        .order('backup_date', { ascending: false })
        .limit(1);

      if (backupError) throw backupError;

      if (!backup || backup.length === 0) {
        return {
          recordId,
          status: 'failed',
          error: 'No backup found'
        };
      }

      // Restore record
      const { error: restoreError } = await supabase
        .from(tableName)
        .upsert(backup[0].data);

      if (restoreError) throw restoreError;

      // Log recovery
      securityLogger.log({
        type: 'recovery',
        severity: 'low',
        message: 'Record recovered successfully',
        metadata: {
          tableName,
          recordId,
          backupDate: backup[0].backup_date
        }
      });

      // Log HIPAA audit event
      await hipaaAuditLogger.logModification(
        'system',
        'system',
        PHICategory.MEDICAL_RECORDS,
        recordId,
        'record_recovery',
        {
          tableName,
          backupDate: backup[0].backup_date
        },
        '127.0.0.1',
        'system',
        true
      );

      return {
        recordId,
        status: 'recovered',
        backupUsed: backup[0].backup_date
      };
    } catch (error) {
      securityLogger.log({
        type: 'recovery',
        severity: 'high',
        message: 'Record recovery failed',
        metadata: {
          tableName,
          recordId,
          error: error.message
        }
      });

      return {
        recordId,
        status: 'failed',
        error: error.message
      };
    }
  }

  public async createBackup(
    tableName: string,
    record: any
  ): Promise<void> {
    try {
      const checksum = await this.calculateChecksum(record);
      const backupData = {
        id: record.id,
        backup_date: new Date(),
        data: record,
        checksum
      };

      const { error } = await supabase
        .from(`${tableName}_backup`)
        .insert(backupData);

      if (error) throw error;

      // Log backup creation
      securityLogger.log({
        type: 'backup',
        severity: 'low',
        message: 'Record backup created',
        metadata: {
          tableName,
          recordId: record.id,
          backupDate: backupData.backup_date
        }
      });
    } catch (error) {
      securityLogger.log({
        type: 'backup',
        severity: 'high',
        message: 'Failed to create record backup',
        metadata: {
          tableName,
          recordId: record.id,
          error: error.message
        }
      });
      throw error;
    }
  }

  public async verifyBackup(
    tableName: string,
    recordId: string
  ): Promise<{
    valid: boolean;
    backupDate: Date;
    checksumMatch: boolean;
    dataIntegrity: boolean;
  }> {
    try {
      // Get backup record
      const { data: backup, error } = await supabase
        .from(`${tableName}_backup`)
        .select('*')
        .eq('id', recordId)
        .order('backup_date', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (!backup || backup.length === 0) {
        return {
          valid: false,
          backupDate: null,
          checksumMatch: false,
          dataIntegrity: false
        };
      }

      const backupRecord = backup[0];
      const calculatedChecksum = await this.calculateChecksum(backupRecord.data);
      const checksumMatch = calculatedChecksum === backupRecord.checksum;

      // Verify data integrity
      const dataIntegrity = await this.verifyDataIntegrity(tableName, backupRecord.data)
        .then(result => result.valid);

      return {
        valid: checksumMatch && dataIntegrity,
        backupDate: backupRecord.backup_date,
        checksumMatch,
        dataIntegrity
      };
    } catch (error) {
      securityLogger.log({
        type: 'backup',
        severity: 'high',
        message: 'Failed to verify backup',
        metadata: {
          tableName,
          recordId,
          error: error.message
        }
      });
      throw error;
    }
  }

  public async cleanupOldBackups(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.BACKUP_RETENTION_DAYS);

      const tables = ['patients', 'medical_records', 'appointments'];
      for (const table of tables) {
        const { error } = await supabase
          .from(`${table}_backup`)
          .delete()
          .lt('backup_date', cutoffDate.toISOString());

        if (error) throw error;

        securityLogger.log({
          type: 'backup',
          severity: 'low',
          message: 'Old backups cleaned up',
          metadata: {
            tableName: table,
            cutoffDate: cutoffDate.toISOString()
          }
        });
      }
    } catch (error) {
      securityLogger.log({
        type: 'backup',
        severity: 'high',
        message: 'Failed to cleanup old backups',
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  private async runPeriodicVerification(): Promise<void> {
    const tables = ['patients', 'medical_records', 'appointments'];
    const now = new Date();

    // Clean up old backups first
    await this.cleanupOldBackups();

    for (const table of tables) {
      const lastCheck = this.lastVerification.get(table);
      if (lastCheck && now.getTime() - lastCheck.getTime() < this.VERIFICATION_INTERVAL) {
        continue;
      }

      try {
        const result = await this.verifyTable(table, {
          verifyChecksums: true,
          checkReferences: true,
          verifyData: true
        });

        if (result.corruptedRecords > 0) {
          // Attempt recovery for corrupted records
          for (const detail of result.details) {
            // Verify backup before recovery
            const backupVerification = await this.verifyBackup(table, detail.recordId);
            if (backupVerification.valid) {
              await this.recoverRecord(table, detail.recordId);
            } else {
              securityLogger.log({
                type: 'recovery',
                severity: 'high',
                message: 'Cannot recover record - invalid backup',
                metadata: {
                  tableName: table,
                  recordId: detail.recordId,
                  backupVerification
                }
              });
            }
          }
        }

        this.lastVerification.set(table, now);
      } catch (error) {
        securityLogger.log({
          type: 'verification',
          severity: 'high',
          message: `Periodic verification failed for table ${table}`,
          metadata: { error: error.message }
        });
      }
    }
  }

  public async getVerificationStatus(): Promise<{
    lastVerification: Record<string, Date>;
    nextVerification: Record<string, Date>;
  }> {
    const now = new Date();
    const status = {
      lastVerification: {} as Record<string, Date>,
      nextVerification: {} as Record<string, Date>
    };

    for (const [table, lastCheck] of this.lastVerification.entries()) {
      status.lastVerification[table] = lastCheck;
      status.nextVerification[table] = new Date(
        lastCheck.getTime() + this.VERIFICATION_INTERVAL
      );
    }

    return status;
  }
}

// Export singleton instance
export const dataVerificationManager = DataVerificationManager.getInstance(); 