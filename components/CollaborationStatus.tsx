import React, { useEffect, useState } from 'react';
import { presenceManager } from '../lib/collaboration/presence';
import { lockManager } from '../lib/collaboration/locks';

interface UserPresence {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  lastSeen: number;
  currentPage: string;
  currentAction?: string;
  status: 'online' | 'away' | 'offline';
}

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

export const CollaborationStatus: React.FC<{
  resourceId?: string;
  resourceType?: string;
}> = ({ resourceId, resourceType }) => {
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [lockInfo, setLockInfo] = useState<Lock | undefined>();
  const [showDetails, setShowDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const updateStatus = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Optimistically update UI
        const currentUsers = presenceManager.getOnlineUsers();
        setOnlineUsers(currentUsers);

        if (resourceId && resourceType) {
          const currentLock = lockManager.getLockInfo(resourceId, resourceType);
          setLockInfo(currentLock);
        }
      } catch (err) {
        setError('Failed to update collaboration status');
        console.error('Collaboration status update error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    // Update status every 30 seconds
    const interval = setInterval(updateStatus, 30000);
    updateStatus();

    // Listen for presence changes
    const handlePresenceChange = (event: CustomEvent) => {
      const { type, user } = event.detail;
      
      // Optimistically update UI
      setOnlineUsers(prevUsers => {
        if (type === 'join') {
          return [...prevUsers, user];
        } else {
          return prevUsers.filter(u => u.userId !== user.userId);
        }
      });
    };

    window.addEventListener('userPresenceChange', handlePresenceChange as EventListener);

    return () => {
      clearInterval(interval);
      window.removeEventListener('userPresenceChange', handlePresenceChange as EventListener);
    };
  }, [resourceId, resourceType]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return '#4CAF50';
      case 'away':
        return '#FFC107';
      default:
        return '#9E9E9E';
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  if (error) {
    return (
      <div className="collaboration-status error">
        <div className="error-message">
          {error}
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="collaboration-status">
      <div className="status-header" onClick={() => setShowDetails(!showDetails)}>
        <div className="online-count">
          {isLoading ? (
            <span className="loading">Loading...</span>
          ) : (
            `${onlineUsers.length} ${onlineUsers.length === 1 ? 'user' : 'users'} online`
          )}
        </div>
        {resourceId && resourceType && lockInfo && (
          <div className="lock-status">
            🔒 Locked by {lockInfo.userName}
          </div>
        )}
        <div className="toggle-icon">
          {showDetails ? '▼' : '▲'}
        </div>
      </div>

      {showDetails && (
        <div className="status-details">
          {isLoading ? (
            <div className="loading-state">Loading collaboration details...</div>
          ) : (
            <>
              <div className="online-users">
                <h3>Online Users</h3>
                {onlineUsers.length === 0 ? (
                  <div className="no-users">No users currently online</div>
                ) : (
                  onlineUsers.map(user => (
                    <div key={user.userId} className="user-item">
                      <div className="user-info">
                        <span className="status-dot" style={{ backgroundColor: getStatusColor(user.status) }} />
                        <span className="user-name">{user.userName}</span>
                        <span className="user-role">({user.userRole})</span>
                      </div>
                      <div className="user-activity">
                        {user.currentAction ? (
                          <span className="action">{user.currentAction}</span>
                        ) : (
                          <span className="page">{user.currentPage}</span>
                        )}
                        <span className="time">{formatTimeAgo(user.lastSeen)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {resourceId && resourceType && lockInfo && (
                <div className="lock-details">
                  <h3>Resource Lock</h3>
                  <div className="lock-info">
                    <div>Locked by: {lockInfo.userName}</div>
                    <div>Role: {lockInfo.userRole}</div>
                    <div>Acquired: {new Date(lockInfo.acquiredAt).toLocaleString()}</div>
                    <div>Expires: {new Date(lockInfo.expiresAt).toLocaleString()}</div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <style jsx>{`
        .collaboration-status {
          position: fixed;
          bottom: 20px;
          left: 20px;
          background: white;
          border-radius: 5px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          z-index: 1000;
          min-width: 300px;
        }
        .status-header {
          padding: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          border-bottom: 1px solid #eee;
        }
        .online-count {
          font-weight: 500;
        }
        .lock-status {
          color: #f44336;
          font-size: 0.9em;
        }
        .toggle-icon {
          font-size: 0.8em;
          color: #666;
        }
        .status-details {
          padding: 15px;
          max-height: 400px;
          overflow-y: auto;
        }
        .online-users {
          margin-bottom: 20px;
        }
        h3 {
          margin: 0 0 10px 0;
          font-size: 1em;
          color: #666;
        }
        .user-item {
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .user-name {
          font-weight: 500;
        }
        .user-role {
          color: #666;
          font-size: 0.9em;
        }
        .user-activity {
          display: flex;
          justify-content: space-between;
          font-size: 0.9em;
          color: #666;
        }
        .action {
          color: #2196F3;
        }
        .time {
          font-size: 0.8em;
        }
        .lock-details {
          background: #f5f5f5;
          padding: 10px;
          border-radius: 3px;
        }
        .lock-info {
          font-size: 0.9em;
          line-height: 1.6;
        }
        .loading {
          color: #666;
          font-style: italic;
        }
        .loading-state {
          padding: 20px;
          text-align: center;
          color: #666;
        }
        .error-message {
          padding: 10px;
          color: #f44336;
          text-align: center;
        }
        .error-message button {
          margin-left: 10px;
          padding: 4px 8px;
          background: #f44336;
          color: white;
          border: none;
          border-radius: 3px;
          cursor: pointer;
        }
        .error-message button:hover {
          background: #d32f2f;
        }
        .no-users {
          padding: 10px;
          color: #666;
          text-align: center;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}; 