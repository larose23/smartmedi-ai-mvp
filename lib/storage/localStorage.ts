import { securityLogger } from '../security/logger';

interface LocalData {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  syncStatus: 'pending' | 'synced' | 'failed';
  version: number;
}

class LocalStorageManager {
  private static instance: LocalStorageManager;
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'smartmedi-ai-mvp-db';
  private readonly DB_VERSION = 1;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  private constructor() {
    this.initializeDatabase();
  }

  public static getInstance(): LocalStorageManager {
    if (!LocalStorageManager.instance) {
      LocalStorageManager.instance = new LocalStorageManager();
    }
    return LocalStorageManager.instance;
  }

  private async initializeDatabase(): Promise<void> {
    try {
      this.db = await this.openDatabase();
      securityLogger.log({
        type: 'storage',
        severity: 'low',
        message: 'Local storage initialized successfully'
      });
    } catch (error) {
      securityLogger.log({
        type: 'storage',
        severity: 'high',
        message: 'Failed to initialize local storage',
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create stores if they don't exist
        if (!db.objectStoreNames.contains('localData')) {
          const store = db.createObjectStore('localData', { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        if (!db.objectStoreNames.contains('syncQueue')) {
          const store = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('retryCount', 'retryCount', { unique: false });
        }

        if (!db.objectStoreNames.contains('failedQueue')) {
          const store = db.createObjectStore('failedQueue', { keyPath: 'id', autoIncrement: true });
          store.createIndex('failedAt', 'failedAt', { unique: false });
        }
      };
    });
  }

  public async saveData(type: string, data: any): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const localData: LocalData = {
      id: data.id || crypto.randomUUID(),
      type,
      data,
      timestamp: Date.now(),
      syncStatus: 'pending',
      version: 1
    };

    try {
      const tx = this.db.transaction('localData', 'readwrite');
      const store = tx.objectStore('localData');
      await store.put(localData);

      // Queue for sync
      await this.queueForSync(type, data);

      securityLogger.log({
        type: 'storage',
        severity: 'low',
        message: 'Data saved locally',
        metadata: { type, id: localData.id }
      });
    } catch (error) {
      securityLogger.log({
        type: 'storage',
        severity: 'high',
        message: 'Failed to save data locally',
        metadata: { type, error: error.message }
      });
      throw error;
    }
  }

  public async getData(type: string, id: string): Promise<any> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const tx = this.db.transaction('localData', 'readonly');
      const store = tx.objectStore('localData');
      const data = await store.get(id);

      if (!data) {
        return null;
      }

      return data.data;
    } catch (error) {
      securityLogger.log({
        type: 'storage',
        severity: 'high',
        message: 'Failed to retrieve data from local storage',
        metadata: { type, id, error: error.message }
      });
      throw error;
    }
  }

  public async getAllData(type: string): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const tx = this.db.transaction('localData', 'readonly');
      const store = tx.objectStore('localData');
      const index = store.index('type');
      const data = await index.getAll(type);

      return data.map(item => item.data);
    } catch (error) {
      securityLogger.log({
        type: 'storage',
        severity: 'high',
        message: 'Failed to retrieve all data from local storage',
        metadata: { type, error: error.message }
      });
      throw error;
    }
  }

  public async deleteData(type: string, id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const tx = this.db.transaction('localData', 'readwrite');
      const store = tx.objectStore('localData');
      await store.delete(id);

      securityLogger.log({
        type: 'storage',
        severity: 'low',
        message: 'Data deleted from local storage',
        metadata: { type, id }
      });
    } catch (error) {
      securityLogger.log({
        type: 'storage',
        severity: 'high',
        message: 'Failed to delete data from local storage',
        metadata: { type, id, error: error.message }
      });
      throw error;
    }
  }

  private async queueForSync(type: string, data: any): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const tx = this.db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      await store.add({
        type,
        data,
        timestamp: Date.now(),
        retryCount: 0
      });

      // Register background sync
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-queue');
      }
    } catch (error) {
      securityLogger.log({
        type: 'storage',
        severity: 'high',
        message: 'Failed to queue data for sync',
        metadata: { type, error: error.message }
      });
      throw error;
    }
  }

  public async getPendingSync(): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const tx = this.db.transaction('syncQueue', 'readonly');
      const store = tx.objectStore('syncQueue');
      const index = store.index('timestamp');
      return await index.getAll();
    } catch (error) {
      securityLogger.log({
        type: 'storage',
        severity: 'high',
        message: 'Failed to get pending sync items',
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  public async getFailedSync(): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const tx = this.db.transaction('failedQueue', 'readonly');
      const store = tx.objectStore('failedQueue');
      const index = store.index('failedAt');
      return await index.getAll();
    } catch (error) {
      securityLogger.log({
        type: 'storage',
        severity: 'high',
        message: 'Failed to get failed sync items',
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  public async clearFailedSync(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const tx = this.db.transaction('failedQueue', 'readwrite');
      const store = tx.objectStore('failedQueue');
      await store.clear();

      securityLogger.log({
        type: 'storage',
        severity: 'low',
        message: 'Failed sync queue cleared'
      });
    } catch (error) {
      securityLogger.log({
        type: 'storage',
        severity: 'high',
        message: 'Failed to clear failed sync queue',
        metadata: { error: error.message }
      });
      throw error;
    }
  }
}

// Export singleton instance
export const localStorageManager = LocalStorageManager.getInstance(); 