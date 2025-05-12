import { supabase } from '../supabase';
import { securityLogger } from '../security/logger';
import { hipaaAuditLogger, HIPAAEventType, PHICategory } from '../security/hipaa/audit';

// Define archive status types
export enum ArchiveStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back'
}

// Define archive operation types
export enum ArchiveOperation {
  ARCHIVE = 'archive',
  RESTORE = 'restore',
  PURGE = 'purge',
  RECONCILE = 'reconcile'
}

interface ArchiveTransaction {
  id: string;
  operation: ArchiveOperation;
  sourceTable: string;
  targetTable: string;
  status: ArchiveStatus;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  metadata: Record<string, any>;
  recordCount: number;
  checksum: string;
}

interface ArchiveRecord {
  id: string;
  originalId: string;
  tableName: string;
  data: Record<string, any>;
  archivedAt: Date;
  archivedBy: string;
  transactionId: string;
  checksum: string;
  metadata: Record<string, any>;
}

interface ArchiveProgress {
  totalRecords: number;
  processedRecords: number;
  currentBatch: number;
  totalBatches: number;
  status: ArchiveStatus;
  startTime: Date;
  estimatedTimeRemaining?: number;
}

class ArchiveManager {
  private static instance: ArchiveManager;
  private readonly BATCH_SIZE = 1000;
  private readonly MAX_RETRIES = 3;
  private progressMap: Map<string, ArchiveProgress> = new Map();

  private constructor() {}

  public static getInstance(): ArchiveManager {
    if (!ArchiveManager.instance) {
      ArchiveManager.instance = new ArchiveManager();
    }
    return ArchiveManager.instance;
  }

  public async startArchiveTransaction(
    operation: ArchiveOperation,
    sourceTable: string,
    targetTable: string,
    metadata: Record<string, any> = {}
  ): Promise<ArchiveTransaction> {
    try {
      const transaction: ArchiveTransaction = {
        id: crypto.randomUUID(),
        operation,
        sourceTable,
        targetTable,
        status: ArchiveStatus.PENDING,
        startedAt: new Date(),
        metadata,
        recordCount: 0,
        checksum: ''
      };

      const { error } = await supabase
        .from('archive_transactions')
        .insert(transaction);

      if (error) throw error;

      securityLogger.log({
        type: 'archive',
        severity: 'low',
        message: 'Archive transaction started',
        metadata: { transaction }
      });

      return transaction;
    } catch (error) {
      securityLogger.log({
        type: 'archive',
        severity: 'high',
        message: 'Failed to start archive transaction',
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.MAX_RETRIES
  ): Promise<T> {
    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        securityLogger.log({
          type: 'archive',
          severity: 'medium',
          message: `Operation failed, attempt ${attempt} of ${maxRetries}`,
          metadata: { error: error.message }
        });
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    throw lastError;
  }

  private updateProgress(
    transactionId: string,
    processedRecords: number,
    totalRecords: number
  ): void {
    const progress = this.progressMap.get(transactionId);
    if (progress) {
      const currentTime = new Date();
      const elapsedTime = currentTime.getTime() - progress.startTime.getTime();
      const recordsPerMs = processedRecords / elapsedTime;
      const remainingRecords = totalRecords - processedRecords;
      const estimatedTimeRemaining = recordsPerMs > 0 ? remainingRecords / recordsPerMs : undefined;

      progress.processedRecords = processedRecords;
      progress.currentBatch = Math.ceil(processedRecords / this.BATCH_SIZE);
      progress.totalBatches = Math.ceil(totalRecords / this.BATCH_SIZE);
      progress.estimatedTimeRemaining = estimatedTimeRemaining;

      this.progressMap.set(transactionId, progress);
    }
  }

  public getProgress(transactionId: string): ArchiveProgress | undefined {
    return this.progressMap.get(transactionId);
  }

  private cleanupProgress(transactionId: string): void {
    this.progressMap.delete(transactionId);
  }

  public async archiveRecords(
    transactionId: string,
    records: any[],
    userId: string
  ): Promise<void> {
    const transaction = await this.getTransaction(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    try {
      // Initialize progress tracking
      this.progressMap.set(transactionId, {
        totalRecords: records.length,
        processedRecords: 0,
        currentBatch: 0,
        totalBatches: Math.ceil(records.length / this.BATCH_SIZE),
        status: ArchiveStatus.IN_PROGRESS,
        startTime: new Date()
      });

      // Update transaction status
      await this.updateTransactionStatus(transactionId, ArchiveStatus.IN_PROGRESS);

      // Process records in batches with retry
      for (let i = 0; i < records.length; i += this.BATCH_SIZE) {
        const batch = records.slice(i, i + this.BATCH_SIZE);
        const archiveRecords = batch.map(record => ({
          id: crypto.randomUUID(),
          originalId: record.id,
          tableName: transaction.sourceTable,
          data: record,
          archivedAt: new Date(),
          archivedBy: userId,
          transactionId,
          checksum: this.calculateChecksum(record),
          metadata: {
            archivedFrom: transaction.sourceTable,
            archivedTo: transaction.targetTable
          }
        }));

        // Insert archive records with retry
        await this.retryOperation(async () => {
          const { error } = await supabase
            .from(transaction.targetTable)
            .insert(archiveRecords);

          if (error) throw error;

          // Update progress
          this.updateProgress(transactionId, i + batch.length, records.length);

          // Log HIPAA audit event
          await hipaaAuditLogger.logModification(
            userId,
            'system',
            PHICategory.MEDICAL_RECORDS,
            transactionId,
            'archive',
            { recordCount: batch.length },
            '127.0.0.1',
            'system',
            true
          );
        });
      }

      // Update transaction status and metadata
      await this.updateTransactionStatus(transactionId, ArchiveStatus.COMPLETED, {
        recordCount: records.length,
        checksum: this.calculateChecksum(records)
      });

      // Update final progress
      const progress = this.progressMap.get(transactionId);
      if (progress) {
        progress.status = ArchiveStatus.COMPLETED;
        this.progressMap.set(transactionId, progress);
      }

      // Cleanup progress data
      this.cleanupProgress(transactionId);

      securityLogger.log({
        type: 'archive',
        severity: 'low',
        message: 'Records archived successfully',
        metadata: {
          transactionId,
          recordCount: records.length
        }
      });
    } catch (error) {
      // Cleanup progress data on error
      this.cleanupProgress(transactionId);

      await this.handleArchiveError(transactionId, error);
      throw error;
    }
  }

  public async restoreRecords(
    transactionId: string,
    userId: string
  ): Promise<void> {
    const transaction = await this.getTransaction(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    try {
      // Update transaction status
      await this.updateTransactionStatus(transactionId, ArchiveStatus.IN_PROGRESS);

      // Get archived records
      const { data: archivedRecords, error: fetchError } = await supabase
        .from(transaction.targetTable)
        .select('*')
        .eq('transactionId', transactionId);

      if (fetchError) throw fetchError;

      // Process records in batches
      for (let i = 0; i < archivedRecords.length; i += this.BATCH_SIZE) {
        const batch = archivedRecords.slice(i, i + this.BATCH_SIZE);
        const restoreRecords = batch.map(record => ({
          ...record.data,
          id: record.originalId
        }));

        // Insert restored records
        const { error } = await supabase
          .from(transaction.sourceTable)
          .insert(restoreRecords);

        if (error) throw error;

        // Log HIPAA audit event
        await hipaaAuditLogger.logModification(
          userId,
          'system',
          PHICategory.MEDICAL_RECORDS,
          transactionId,
          'restore',
          { recordCount: batch.length },
          '127.0.0.1',
          'system',
          true
        );
      }

      // Update transaction status
      await this.updateTransactionStatus(transactionId, ArchiveStatus.COMPLETED);

      // Cleanup progress data
      this.cleanupProgress(transactionId);

      securityLogger.log({
        type: 'archive',
        severity: 'low',
        message: 'Records restored successfully',
        metadata: {
          transactionId,
          recordCount: archivedRecords.length
        }
      });
    } catch (error) {
      // Cleanup progress data on error
      this.cleanupProgress(transactionId);

      await this.handleArchiveError(transactionId, error);
      throw error;
    }
  }

  public async rollbackTransaction(
    transactionId: string,
    userId: string
  ): Promise<void> {
    const transaction = await this.getTransaction(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    try {
      // Update transaction status
      await this.updateTransactionStatus(transactionId, ArchiveStatus.IN_PROGRESS);

      if (transaction.operation === ArchiveOperation.ARCHIVE) {
        // Delete archived records
        const { error } = await supabase
          .from(transaction.targetTable)
          .delete()
          .eq('transactionId', transactionId);

        if (error) throw error;
      } else if (transaction.operation === ArchiveOperation.RESTORE) {
        // Delete restored records
        const { data: archivedRecords } = await supabase
          .from(transaction.targetTable)
          .select('originalId')
          .eq('transactionId', transactionId);

        if (archivedRecords) {
          const { error } = await supabase
            .from(transaction.sourceTable)
            .delete()
            .in('id', archivedRecords.map(r => r.originalId));

          if (error) throw error;
        }
      }

      // Update transaction status
      await this.updateTransactionStatus(transactionId, ArchiveStatus.ROLLED_BACK);

      // Cleanup progress data
      this.cleanupProgress(transactionId);

      securityLogger.log({
        type: 'archive',
        severity: 'low',
        message: 'Transaction rolled back successfully',
        metadata: { transactionId }
      });
    } catch (error) {
      // Cleanup progress data on error
      this.cleanupProgress(transactionId);

      await this.handleArchiveError(transactionId, error);
      throw error;
    }
  }

  public async reconcileArchives(
    sourceTable: string,
    targetTable: string,
    userId: string
  ): Promise<{
    inconsistencies: Array<{
      recordId: string;
      type: 'missing' | 'mismatch' | 'duplicate';
      details: string;
    }>;
  }> {
    try {
      const inconsistencies: Array<{
        recordId: string;
        type: 'missing' | 'mismatch' | 'duplicate';
        details: string;
      }> = [];

      // Get all records from source table
      const { data: sourceRecords, error: sourceError } = await supabase
        .from(sourceTable)
        .select('*');

      if (sourceError) throw sourceError;

      // Get all records from target table
      const { data: targetRecords, error: targetError } = await supabase
        .from(targetTable)
        .select('*');

      if (targetError) throw targetError;

      // Check for missing records
      const sourceIds = new Set(sourceRecords.map(r => r.id));
      const targetIds = new Set(targetRecords.map(r => r.originalId));

      for (const id of sourceIds) {
        if (!targetIds.has(id)) {
          inconsistencies.push({
            recordId: id,
            type: 'missing',
            details: 'Record exists in source but not in archive'
          });
        }
      }

      // Check for mismatches
      for (const sourceRecord of sourceRecords) {
        const archivedRecord = targetRecords.find(r => r.originalId === sourceRecord.id);
        if (archivedRecord) {
          const sourceChecksum = this.calculateChecksum(sourceRecord);
          if (sourceChecksum !== archivedRecord.checksum) {
            inconsistencies.push({
              recordId: sourceRecord.id,
              type: 'mismatch',
              details: 'Record checksum mismatch between source and archive'
            });
          }
        }
      }

      // Check for duplicates
      const duplicateIds = new Set<string>();
      const seenIds = new Set<string>();
      for (const record of targetRecords) {
        if (seenIds.has(record.originalId)) {
          duplicateIds.add(record.originalId);
        }
        seenIds.add(record.originalId);
      }

      for (const id of duplicateIds) {
        inconsistencies.push({
          recordId: id,
          type: 'duplicate',
          details: 'Multiple archive records found for the same original record'
        });
      }

      // Log reconciliation results
      securityLogger.log({
        type: 'archive',
        severity: inconsistencies.length > 0 ? 'medium' : 'low',
        message: 'Archive reconciliation completed',
        metadata: {
          sourceTable,
          targetTable,
          inconsistencyCount: inconsistencies.length
        }
      });

      return { inconsistencies };
    } catch (error) {
      securityLogger.log({
        type: 'archive',
        severity: 'high',
        message: 'Archive reconciliation failed',
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  private async getTransaction(transactionId: string): Promise<ArchiveTransaction | null> {
    const { data, error } = await supabase
      .from('archive_transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (error) throw error;
    return data;
  }

  private async updateTransactionStatus(
    transactionId: string,
    status: ArchiveStatus,
    metadata: Partial<ArchiveTransaction> = {}
  ): Promise<void> {
    const update: Partial<ArchiveTransaction> = {
      status,
      ...metadata
    };

    if (status === ArchiveStatus.COMPLETED || status === ArchiveStatus.FAILED) {
      update.completedAt = new Date();
    }

    const { error } = await supabase
      .from('archive_transactions')
      .update(update)
      .eq('id', transactionId);

    if (error) throw error;
  }

  private async handleArchiveError(
    transactionId: string,
    error: any
  ): Promise<void> {
    await this.updateTransactionStatus(transactionId, ArchiveStatus.FAILED, {
      error: error.message
    });

    securityLogger.log({
      type: 'archive',
      severity: 'high',
      message: 'Archive operation failed',
      metadata: {
        transactionId,
        error: error.message
      }
    });
  }

  private calculateChecksum(data: any): string {
    const stringified = JSON.stringify(data);
    return crypto
      .createHash('sha256')
      .update(stringified)
      .digest('hex');
  }
}

// Export singleton instance
export const archiveManager = ArchiveManager.getInstance(); 