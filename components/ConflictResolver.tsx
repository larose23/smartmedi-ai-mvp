import React, { useEffect, useState } from 'react';
import { localStorageManager } from '../lib/storage/localStorage';
import { securityLogger } from '../lib/security/logger';

interface Conflict {
  id: string;
  type: string;
  localData: any;
  serverData: any;
  timestamp: number;
  status: 'pending' | 'resolved';
}

export const ConflictResolver: React.FC = () => {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);

  useEffect(() => {
    loadConflicts();
  }, []);

  const loadConflicts = async () => {
    const tx = await localStorageManager.getTransaction('conflicts', 'readonly');
    const store = tx.objectStore('conflicts');
    const index = store.index('status');
    const pendingConflicts = await index.getAll('pending');
    setConflicts(pendingConflicts);
  };

  const resolveConflict = async (conflictId: string, resolution: 'local' | 'server' | 'merge') => {
    const conflict = conflicts.find(c => c.id === conflictId);
    if (!conflict) return;

    try {
      let resolvedData;
      switch (resolution) {
        case 'local':
          resolvedData = conflict.localData;
          break;
        case 'server':
          resolvedData = conflict.serverData;
          break;
        case 'merge':
          resolvedData = {
            ...conflict.serverData,
            ...conflict.localData,
            updated_at: new Date().toISOString()
          };
          break;
      }

      // Update local data
      await localStorageManager.saveData(conflict.type, resolvedData);

      // Update conflict status
      const tx = await localStorageManager.getTransaction('conflicts', 'readwrite');
      const store = tx.objectStore('conflicts');
      await store.put({
        ...conflict,
        status: 'resolved',
        resolvedData,
        resolvedAt: Date.now()
      });

      // Reload conflicts
      await loadConflicts();

      securityLogger.log({
        type: 'conflict_resolution',
        severity: 'low',
        message: 'Conflict resolved manually',
        metadata: {
          conflictId,
          type: conflict.type,
          resolution
        }
      });
    } catch (error) {
      securityLogger.log({
        type: 'conflict_resolution',
        severity: 'high',
        message: 'Failed to resolve conflict',
        metadata: {
          conflictId,
          error: error.message
        }
      });
    }
  };

  if (conflicts.length === 0) return null;

  return (
    <div className="conflict-resolver">
      <h2>Data Conflicts</h2>
      <div className="conflict-list">
        {conflicts.map(conflict => (
          <div key={conflict.id} className="conflict-item">
            <div className="conflict-header">
              <span>{conflict.type}</span>
              <span>{new Date(conflict.timestamp).toLocaleString()}</span>
            </div>
            <div className="conflict-content">
              <div className="data-comparison">
                <div className="local-data">
                  <h3>Local Changes</h3>
                  <pre>{JSON.stringify(conflict.localData, null, 2)}</pre>
                </div>
                <div className="server-data">
                  <h3>Server Changes</h3>
                  <pre>{JSON.stringify(conflict.serverData, null, 2)}</pre>
                </div>
              </div>
              <div className="resolution-actions">
                <button onClick={() => resolveConflict(conflict.id, 'local')}>
                  Keep Local
                </button>
                <button onClick={() => resolveConflict(conflict.id, 'server')}>
                  Use Server
                </button>
                <button onClick={() => resolveConflict(conflict.id, 'merge')}>
                  Merge Changes
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <style jsx>{`
        .conflict-resolver {
          position: fixed;
          top: 20px;
          right: 20px;
          background: white;
          padding: 20px;
          border-radius: 5px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          max-width: 800px;
          max-height: 80vh;
          overflow-y: auto;
          z-index: 1000;
        }
        .conflict-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .conflict-item {
          border: 1px solid #ddd;
          border-radius: 5px;
          padding: 15px;
        }
        .conflict-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid #eee;
        }
        .data-comparison {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 15px;
        }
        .local-data, .server-data {
          background: #f5f5f5;
          padding: 10px;
          border-radius: 3px;
        }
        pre {
          white-space: pre-wrap;
          word-wrap: break-word;
          font-size: 0.9em;
        }
        .resolution-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        button {
          padding: 8px 16px;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          background: #2196F3;
          color: white;
        }
        button:hover {
          background: #1976D2;
        }
      `}</style>
    </div>
  );
}; 