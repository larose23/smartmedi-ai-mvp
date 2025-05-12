'use client';

import React, { useEffect } from 'react';
import { useAppState } from '../context/StateContext';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';

interface NotificationSystemProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxNotifications?: number;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  position = 'top-right',
  maxNotifications = 5,
}) => {
  const { state, removeNotification } = useAppState();
  const { list: notifications } = state.ui.notifications;

  // Auto-remove notifications after a delay
  useEffect(() => {
    if (notifications.length === 0) return;

    const timeouts: NodeJS.Timeout[] = [];

    notifications.forEach((notification) => {
      // Automatically remove notifications after 5 seconds (can adjust based on type)
      const timeout = setTimeout(() => {
        removeNotification(notification.id);
      }, 5000);

      timeouts.push(timeout);
    });

    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [notifications, removeNotification]);

  // Position class mapping
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  // Icon mapping by notification type
  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  // Background color mapping by notification type
  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  // Get only the most recent notifications up to maxNotifications
  const visibleNotifications = notifications.slice(-maxNotifications);

  return (
    <div className={`fixed z-50 ${positionClasses[position]} space-y-2 w-80`}>
      {visibleNotifications.map((notification) => (
        <div
          key={notification.id}
          className={`${getBackgroundColor(
            notification.type
          )} border rounded-lg shadow-lg overflow-hidden transition-all duration-300 opacity-100`}
        >
          <div className="p-4 flex items-start">
            <div className="flex-shrink-0">{getIcon(notification.type)}</div>
            <div className="ml-3 w-0 flex-1 pt-0.5">
              <p className="text-sm font-medium text-gray-900">{notification.message}</p>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                className="inline-flex text-gray-400 focus:outline-none focus:text-gray-500 transition ease-in-out duration-150"
                onClick={() => removeNotification(notification.id)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem; 