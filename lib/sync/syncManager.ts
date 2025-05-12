import { supabase } from '../supabase/client';
import { localStorageManager } from '../storage/localStorage';
import { securityLogger } from '../security/logger';
import { hipaaAuditLogger, HIPAAEventType, PHICategory } from '../security/hipaa/audit';

interface SyncItem {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  version: number;
  syncStatus: 'pending' | 'synced' | 'failed';
}

interface ConflictResolution {
  strategy: 'server-wins' | 'client-wins' | 'manual' | 'merge';
  mergeStrategy?: (server: any, client: any) => any;
}

class SyncManager {
  private static instance: SyncManager;
  private readonly SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second
  private syncInProgress: boolean = false;
  private lastSyncTime: number = 0;

  private constructor() {
    this.initializeSync();
  }

  public static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  private initializeSync(): void {
    // Start periodic sync
    setInterval(() => {
      this.sync();
    }, this.SYNC_INTERVAL);

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.sync();
    });

    // Register service worker for background sync
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.sync.register('sync-queue');
      });
    }
  }

  public async sync(): Promise<void> {
    if (this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;
    const startTime = Date.now();

    try {
      // Get pending sync items
      const pendingItems = await localStorageManager.getPendingSync();
      
      for (const item of pendingItems) {
        await this.syncItem(item);
      }

      // Get server changes since last sync
      const serverChanges = await this.getServerChanges();
      
      // Resolve conflicts and update local data
      for (const change of serverChanges) {
        await this.handleServerChange(change);
      }

      this.lastSyncTime = Date.now();

      securityLogger.log({
        type: 'sync',
        severity: 'low',
        message: 'Sync completed successfully',
        metadata: {
          duration: Date.now() - startTime,
          itemsProcessed: pendingItems.length,
          serverChanges: serverChanges.length
        }
      });
    } catch (error) {
      securityLogger.log({
        type: 'sync',
        severity: 'high',
        message: 'Sync failed',
        metadata: {
          error: error.message,
          duration: Date.now() - startTime
        }
      });
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncItem(item: SyncItem): Promise<void> {
    try {
      // Get current server version
      const { data: serverData, error: fetchError } = await supabase
        .from(item.type)
        .select('*')
        .eq('id', item.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
        throw fetchError;
      }

      // Handle conflict resolution
      if (serverData) {
        const resolution = await this.resolveConflict(item, serverData);
        if (resolution.strategy === 'server-wins') {
          await localStorageManager.saveData(item.type, serverData);
        } else if (resolution.strategy === 'client-wins') {
          await this.updateServerData(item);
        } else if (resolution.strategy === 'merge' && resolution.mergeStrategy) {
          const mergedData = resolution.mergeStrategy(serverData, item.data);
          await this.updateServerData({ ...item, data: mergedData });
          await localStorageManager.saveData(item.type, mergedData);
        } else {
          // Manual resolution required
          await this.queueForManualResolution(item, serverData);
        }
      } else {
        // New item, create on server
        await this.updateServerData(item);
      }

      // Update sync status
      await this.updateSyncStatus(item.id, 'synced');

    } catch (error) {
      await this.handleSyncError(item, error);
    }
  }

  private async resolveConflict(
    localItem: SyncItem,
    serverData: any
  ): Promise<ConflictResolution> {
    // Default to server-wins for critical data
    if (this.isCriticalData(localItem.type)) {
      return { strategy: 'server-wins' };
    }

    // Use timestamp-based resolution for non-critical data
    const localTimestamp = localItem.timestamp;
    const serverTimestamp = serverData.updated_at || serverData.created_at;

    if (localTimestamp > serverTimestamp) {
      return { strategy: 'client-wins' };
    } else if (localTimestamp < serverTimestamp) {
      return { strategy: 'server-wins' };
    }

    // If timestamps match, use merge strategy
    return {
      strategy: 'merge',
      mergeStrategy: (server, client) => ({
        ...server,
        ...client,
        updated_at: new Date().toISOString()
      })
    };
  }

  private isCriticalData(type: string): boolean {
    // Define critical data types that should always use server-wins
    const criticalTypes = [
      'medical_records',
      'prescriptions',
      'lab_results'
    ];
    return criticalTypes.includes(type);
  }

  private async updateServerData(item: SyncItem): Promise<void> {
    const { error } = await supabase
      .from(item.type)
      .upsert(item.data);

    if (error) {
      throw error;
    }

    // Log HIPAA audit event
    await hipaaAuditLogger.logModification(
      'system',
      'system',
      PHICategory.MEDICAL_RECORDS,
      item.id,
      'data_sync',
      {
        type: item.type,
        action: 'update'
      },
      '127.0.0.1',
      'system',
      true
    );
  }

  private async updateSyncStatus(id: string, status: 'synced' | 'failed'): Promise<void> {
    const tx = await localStorageManager.getTransaction('localData', 'readwrite');
    const store = tx.objectStore('localData');
    const data = await store.get(id);
    
    if (data) {
      data.syncStatus = status;
      await store.put(data);
    }
  }

  private async handleSyncError(item: SyncItem, error: any): Promise<void> {
    // Increment retry count
    const retryCount = (item.retryCount || 0) + 1;

    if (retryCount >= this.MAX_RETRIES) {
      // Move to failed queue
      await this.moveToFailedQueue(item);
      await this.updateSyncStatus(item.id, 'failed');
    } else {
      // Update retry count and requeue
      await this.requeueItem(item, retryCount);
    }

    securityLogger.log({
      type: 'sync',
      severity: 'high',
      message: 'Sync error occurred',
      metadata: {
        itemId: item.id,
        type: item.type,
        error: error.message,
        retryCount
      }
    });
  }

  private async moveToFailedQueue(item: SyncItem): Promise<void> {
    const tx = await localStorageManager.getTransaction('failedQueue', 'readwrite');
    const store = tx.objectStore('failedQueue');
    await store.add({
      ...item,
      failedAt: Date.now(),
      error: 'Max retries exceeded'
    });
  }

  private async requeueItem(item: SyncItem, retryCount: number): Promise<void> {
    const tx = await localStorageManager.getTransaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    await store.add({
      ...item,
      retryCount,
      timestamp: Date.now()
    });
  }

  private async getServerChanges(): Promise<any[]> {
    const { data, error } = await supabase
      .from('changes')
      .select('*')
      .gt('timestamp', new Date(this.lastSyncTime).toISOString());

    if (error) {
      throw error;
    }

    return data || [];
  }

  private async handleServerChange(change: any): Promise<void> {
    try {
      const localData = await localStorageManager.getData(change.type, change.id);

      if (!localData) {
        // New data from server
        await localStorageManager.saveData(change.type, change.data);
      } else if (localData.syncStatus === 'synced') {
        // Update local data if it's already synced
        await localStorageManager.saveData(change.type, change.data);
      } else {
        // Handle conflict
        const resolution = await this.resolveConflict(localData, change.data);
        if (resolution.strategy === 'server-wins') {
          await localStorageManager.saveData(change.type, change.data);
        } else if (resolution.strategy === 'merge' && resolution.mergeStrategy) {
          const mergedData = resolution.mergeStrategy(change.data, localData.data);
          await localStorageManager.saveData(change.type, mergedData);
        } else {
          await this.queueForManualResolution(localData, change.data);
        }
      }
    } catch (error) {
      securityLogger.log({
        type: 'sync',
        severity: 'high',
        message: 'Failed to handle server change',
        metadata: {
          changeId: change.id,
          type: change.type,
          error: error.message
        }
      });
    }
  }

  private async queueForManualResolution(local: SyncItem, server: any): Promise<void> {
    const tx = await localStorageManager.getTransaction('conflicts', 'readwrite');
    const store = tx.objectStore('conflicts');
    await store.add({
      id: crypto.randomUUID(),
      type: local.type,
      localData: local.data,
      serverData: server,
      timestamp: Date.now(),
      status: 'pending'
    });

    securityLogger.log({
      type: 'sync',
      severity: 'high',
      message: 'Conflict queued for manual resolution',
      metadata: {
        type: local.type,
        id: local.id
      }
    });
  }

  public async getSyncStatus(): Promise<{
    lastSyncTime: number;
    pendingItems: number;
    failedItems: number;
    conflicts: number;
  }> {
    const pendingItems = await localStorageManager.getPendingSync();
    const failedItems = await localStorageManager.getFailedSync();
    const conflicts = await this.getPendingConflicts();

    return {
      lastSyncTime: this.lastSyncTime,
      pendingItems: pendingItems.length,
      failedItems: failedItems.length,
      conflicts: conflicts.length
    };
  }

  private async getPendingConflicts(): Promise<any[]> {
    const tx = await localStorageManager.getTransaction('conflicts', 'readonly');
    const store = tx.objectStore('conflicts');
    const index = store.index('status');
    return await index.getAll('pending');
  }
}

// Export singleton instance
export const syncManager = SyncManager.getInstance(); 