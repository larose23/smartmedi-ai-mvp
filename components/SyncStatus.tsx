import React, { useEffect, useState } from 'react';
import { syncManager } from '../lib/sync/syncManager';

interface SyncStatus {
  lastSyncTime: number;
  pendingItems: number;
  failedItems: number;
  conflicts: number;
}

export const SyncStatus: React.FC = () => {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateStatus = async () => {
      const syncStatus = await syncManager.getSyncStatus();
      setStatus(syncStatus);
    };

    // Update status every minute
    const interval = setInterval(updateStatus, 60000);
    updateStatus();

    // Listen for online/offline events
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', () => setIsOnline(true));
      window.removeEventListener('offline', () => setIsOnline(false));
    };
  }, []);

  if (!status) return null;

  return (
    <div className="sync-status">
      <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
        {isOnline ? 'Online' : 'Offline'}
      </div>
      <div className="sync-details">
        <div>Last sync: {new Date(status.lastSyncTime).toLocaleString()}</div>
        {status.pendingItems > 0 && (
          <div className="pending">Pending items: {status.pendingItems}</div>
        )}
        {status.failedItems > 0 && (
          <div className="failed">Failed items: {status.failedItems}</div>
        )}
        {status.conflicts > 0 && (
          <div className="conflicts">Conflicts: {status.conflicts}</div>
        )}
      </div>
      <style jsx>{`
        .sync-status {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: white;
          padding: 10px;
          border-radius: 5px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          z-index: 1000;
        }
        .status-indicator {
          display: inline-block;
          padding: 5px 10px;
          border-radius: 3px;
          margin-bottom: 5px;
        }
        .online {
          background: #4CAF50;
          color: white;
        }
        .offline {
          background: #f44336;
          color: white;
        }
        .sync-details {
          font-size: 0.9em;
        }
        .pending {
          color: #2196F3;
        }
        .failed {
          color: #f44336;
        }
        .conflicts {
          color: #FF9800;
        }
      `}</style>
    </div>
  );
}; 