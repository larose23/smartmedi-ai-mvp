import { supabase } from '../supabase/client';
import { securityLogger } from '../security/logger';
import { hipaaAuditLogger, PHICategory } from '../security/hipaa/audit';

interface Lock {
  id: string;
  resourceId: string;
  resourceType: string;
  userId: string;
  userName: string;
  userRole: string;
  acquiredAt: string;
  expiresAt: string;
  metadata?: any;
}

class LockManager {
  private static instance: LockManager;
  private readonly LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  private readonly LOCK_CHECK_INTERVAL = 30 * 1000; // 30 seconds
  private activeLocks: Map<string, Lock> = new Map();
  private lockCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeLockChecks();
  }

  public static getInstance(): LockManager {
    if (!LockManager.instance) {
      LockManager.instance = new LockManager();
    }
    return LockManager.instance;
  }

  private initializeLockChecks(): void {
    this.lockCheckInterval = setInterval(() => {
      this.checkLocks();
    }, this.LOCK_CHECK_INTERVAL);
  }

  private async checkLocks(): Promise<void> {
    try {
      const { data: locks, error } = await supabase
        .from('resource_locks')
        .select('*')
        .lt('expires_at', new Date().toISOString());

      if (error) throw error;

      // Release expired locks
      for (const lock of locks || []) {
        await this.releaseLock(lock.resource_id, lock.resource_type);
      }
    } catch (error) {
      securityLogger.log({
        type: 'lock',
        severity: 'high',
        message: 'Failed to check locks',
        metadata: { error: error.message }
      });
    }
  }

  public async acquireLock(
    resourceId: string,
    resourceType: string,
    userId: string,
    userName: string,
    userRole: string,
    metadata?: any
  ): Promise<boolean> {
    try {
      // Check if resource is already locked
      const { data: existingLock, error: checkError } = await supabase
        .from('resource_locks')
        .select('*')
        .eq('resource_id', resourceId)
        .eq('resource_type', resourceType)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
        throw checkError;
      }

      if (existingLock) {
        return false;
      }

      // Create new lock
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.LOCK_TIMEOUT);

      const { data: lock, error: createError } = await supabase
        .from('resource_locks')
        .insert({
          resource_id: resourceId,
          resource_type: resourceType,
          user_id: userId,
          user_name: userName,
          user_role: userRole,
          acquired_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          metadata
        })
        .single();

      if (createError) throw createError;

      // Add to active locks
      this.activeLocks.set(`${resourceType}:${resourceId}`, lock);

      // Log HIPAA audit event
      await hipaaAuditLogger.logAccess(
        userId,
        userRole,
        PHICategory.SYSTEM,
        'resource_lock_acquired',
        {
          resourceId,
          resourceType,
          expiresAt: expiresAt.toISOString()
        },
        '127.0.0.1',
        userName,
        true
      );

      return true;
    } catch (error) {
      securityLogger.log({
        type: 'lock',
        severity: 'high',
        message: 'Failed to acquire lock',
        metadata: {
          resourceId,
          resourceType,
          userId,
          error: error.message
        }
      });
      return false;
    }
  }

  public async releaseLock(resourceId: string, resourceType: string): Promise<boolean> {
    try {
      const lockKey = `${resourceType}:${resourceId}`;
      const lock = this.activeLocks.get(lockKey);

      if (!lock) return false;

      const { error } = await supabase
        .from('resource_locks')
        .delete()
        .eq('resource_id', resourceId)
        .eq('resource_type', resourceType);

      if (error) throw error;

      // Remove from active locks
      this.activeLocks.delete(lockKey);

      // Log HIPAA audit event
      await hipaaAuditLogger.logAccess(
        lock.userId,
        lock.userRole,
        PHICategory.SYSTEM,
        'resource_lock_released',
        {
          resourceId,
          resourceType
        },
        '127.0.0.1',
        lock.userName,
        true
      );

      return true;
    } catch (error) {
      securityLogger.log({
        type: 'lock',
        severity: 'high',
        message: 'Failed to release lock',
        metadata: {
          resourceId,
          resourceType,
          error: error.message
        }
      });
      return false;
    }
  }

  public async extendLock(resourceId: string, resourceType: string): Promise<boolean> {
    try {
      const lockKey = `${resourceType}:${resourceId}`;
      const lock = this.activeLocks.get(lockKey);

      if (!lock) return false;

      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.LOCK_TIMEOUT);

      const { error } = await supabase
        .from('resource_locks')
        .update({
          expires_at: expiresAt.toISOString()
        })
        .eq('resource_id', resourceId)
        .eq('resource_type', resourceType);

      if (error) throw error;

      // Update active lock
      this.activeLocks.set(lockKey, {
        ...lock,
        expiresAt: expiresAt.toISOString()
      });

      return true;
    } catch (error) {
      securityLogger.log({
        type: 'lock',
        severity: 'high',
        message: 'Failed to extend lock',
        metadata: {
          resourceId,
          resourceType,
          error: error.message
        }
      });
      return false;
    }
  }

  public isLocked(resourceId: string, resourceType: string): boolean {
    const lockKey = `${resourceType}:${resourceId}`;
    const lock = this.activeLocks.get(lockKey);
    return !!lock && new Date(lock.expiresAt) > new Date();
  }

  public getLockInfo(resourceId: string, resourceType: string): Lock | undefined {
    const lockKey = `${resourceType}:${resourceId}`;
    return this.activeLocks.get(lockKey);
  }

  public cleanup(): void {
    if (this.lockCheckInterval) {
      clearInterval(this.lockCheckInterval);
    }
  }

  public async forceReleaseLock(
    resourceId: string,
    resourceType: string,
    userId: string,
    userRole: string
  ): Promise<boolean> {
    try {
      const lockKey = `${resourceType}:${resourceId}`;
      const lock = this.activeLocks.get(lockKey);

      if (!lock) return false;

      // Check if user has permission to force release
      if (!this.canForceReleaseLock(lock, userId, userRole)) {
        throw new Error('Insufficient permissions to force release lock');
      }

      const { error } = await supabase
        .from('resource_locks')
        .delete()
        .eq('resource_id', resourceId)
        .eq('resource_type', resourceType);

      if (error) throw error;

      // Remove from active locks
      this.activeLocks.delete(lockKey);

      // Log HIPAA audit event
      await hipaaAuditLogger.logAccess(
        userId,
        userRole,
        PHICategory.SYSTEM,
        'resource_lock_force_released',
        {
          resourceId,
          resourceType,
          previousLockHolder: lock.userId
        },
        '127.0.0.1',
        lock.userName,
        true
      );

      return true;
    } catch (error) {
      securityLogger.log({
        type: 'lock',
        severity: 'high',
        message: 'Failed to force release lock',
        metadata: {
          resourceId,
          resourceType,
          userId,
          error: error.message
        }
      });
      return false;
    }
  }

  private canForceReleaseLock(lock: Lock, userId: string, userRole: string): boolean {
    // Admin can force release any lock
    if (userRole === 'admin') return true;

    // Same user can force release their own lock
    if (lock.userId === userId) return true;

    // Supervisors can force release locks from users they supervise
    if (userRole === 'supervisor') {
      // TODO: Implement supervisor hierarchy check
      return false;
    }

    return false;
  }

  public async resolveLockConflict(
    resourceId: string,
    resourceType: string,
    userId: string,
    userRole: string,
    action: 'wait' | 'force' | 'cancel'
  ): Promise<boolean> {
    try {
      const lockKey = `${resourceType}:${resourceId}`;
      const lock = this.activeLocks.get(lockKey);

      if (!lock) return true; // No conflict if no lock exists

      switch (action) {
        case 'wait':
          // Wait for lock to expire
          const expiresAt = new Date(lock.expiresAt);
          const now = new Date();
          if (expiresAt > now) {
            await new Promise(resolve => setTimeout(resolve, expiresAt.getTime() - now.getTime()));
          }
          return true;

        case 'force':
          return await this.forceReleaseLock(resourceId, resourceType, userId, userRole);

        case 'cancel':
          return false;

        default:
          throw new Error('Invalid conflict resolution action');
      }
    } catch (error) {
      securityLogger.log({
        type: 'lock',
        severity: 'high',
        message: 'Failed to resolve lock conflict',
        metadata: {
          resourceId,
          resourceType,
          userId,
          action,
          error: error.message
        }
      });
      return false;
    }
  }
}

// Export singleton instance
export const lockManager = LockManager.getInstance(); 