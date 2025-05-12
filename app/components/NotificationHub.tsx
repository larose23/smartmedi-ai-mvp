import React, { useState, useEffect } from 'react';
import { NotificationService, Notification, NotificationPriority, NotificationType, NotificationChannel } from '@/lib/services/NotificationService';
import { LoadingSpinner } from './LoadingSpinner';

interface NotificationHubProps {
  userId: string;
  onNotificationClick?: (notification: Notification) => void;
}

const NotificationHub: React.FC<NotificationHubProps> = ({
  userId,
  onNotificationClick
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<Record<NotificationChannel, boolean>>({
    [NotificationChannel.IN_APP]: true,
    [NotificationChannel.EMAIL]: true,
    [NotificationChannel.SMS]: false,
    [NotificationChannel.PUSH]: false
  });

  useEffect(() => {
    loadNotifications();
    const unsubscribe = NotificationService.subscribeToNotifications(
      userId,
      (notification) => {
        setNotifications(prev => [notification, ...prev]);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [userId]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await NotificationService.getNotifications(userId, {
        unacknowledgedOnly: !showAll,
        limit: showAll ? undefined : 5
      });
      setNotifications(data);
    } catch (err) {
      setError('Failed to load notifications');
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (notificationId: string) => {
    try {
      await NotificationService.acknowledgeNotification(notificationId);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, acknowledged: true } : n
        )
      );
    } catch (err) {
      console.error('Error acknowledging notification:', err);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await NotificationService.deleteNotification(notificationId);
      setNotifications(prev =>
        prev.filter(n => n.id !== notificationId)
      );
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleAcknowledgeAll = async () => {
    try {
      await NotificationService.acknowledgeAllNotifications(userId);
      setNotifications(prev =>
        prev.map(n => ({ ...n, acknowledged: true }))
      );
    } catch (err) {
      console.error('Error acknowledging all notifications:', err);
    }
  };

  const handlePreferencesChange = async (channel: NotificationChannel, enabled: boolean) => {
    try {
      const newPreferences = { ...preferences, [channel]: enabled };
      await NotificationService.updateUserPreferences(userId, newPreferences);
      setPreferences(newPreferences);
    } catch (err) {
      console.error('Error updating preferences:', err);
    }
  };

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 'bg-red-100 text-red-800 border-red-200';
      case NotificationPriority.HIGH:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case NotificationPriority.MEDIUM:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case NotificationPriority.LOW:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.APPOINTMENT:
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case NotificationType.REMINDER:
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case NotificationType.WAITLIST:
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case NotificationType.SECURITY:
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <LoadingSpinner size="small" text="Loading notifications..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        <p>{error}</p>
        <button
          onClick={loadNotifications}
          className="mt-2 text-sm text-red-500 hover:text-red-700"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowPreferences(true)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Preferences
            </button>
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {showAll ? 'Show Unread' : 'Show All'}
            </button>
            {notifications.some(n => !n.acknowledged) && (
              <button
                onClick={handleAcknowledgeAll}
                className="text-sm text-blue-500 hover:text-blue-700"
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No notifications
          </div>
        ) : (
          notifications.map(notification => (
            <div
              key={notification.id}
              className={`p-4 hover:bg-gray-50 ${
                !notification.acknowledged ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {getTypeIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {notification.title}
                    </p>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                          notification.priority
                        )}`}
                      >
                        {notification.priority}
                      </span>
                      <button
                        onClick={() => handleDelete(notification.id)}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <span className="sr-only">Delete</span>
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {notification.message}
                  </p>
                  <div className="mt-2 flex items-center text-xs text-gray-500">
                    <span>
                      {new Date(notification.created_at).toLocaleString()}
                    </span>
                    {notification.expires_at && (
                      <span className="ml-2">
                        Expires: {new Date(notification.expires_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showPreferences && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-medium text-gray-900">
                  Notification Preferences
                </h3>
                <button
                  onClick={() => setShowPreferences(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {Object.values(NotificationChannel).map(channel => (
                  <div key={channel} className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      {channel.charAt(0).toUpperCase() + channel.slice(1)} Notifications
                    </label>
                    <button
                      onClick={() => handlePreferencesChange(channel, !preferences[channel])}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        preferences[channel] ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          preferences[channel] ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowPreferences(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationHub; 