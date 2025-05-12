import React from 'react';
import { CriticalEvent, CriticalEventType, EscalationLevel } from '@/lib/services/CriticalEventService';
import { NotificationPriority } from '@/lib/services/NotificationService';

interface CriticalEventDetailsModalProps {
  event: CriticalEvent;
  onClose: () => void;
  onAcknowledge?: () => void;
  onResolve?: () => void;
}

const CriticalEventDetailsModal: React.FC<CriticalEventDetailsModalProps> = ({
  event,
  onClose,
  onAcknowledge,
  onResolve
}) => {
  const getEventTypeColor = (type: CriticalEventType) => {
    switch (type) {
      case CriticalEventType.SECURITY_BREACH:
        return 'bg-red-100 text-red-800 border-red-200';
      case CriticalEventType.SYSTEM_FAILURE:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case CriticalEventType.DATA_LOSS:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case CriticalEventType.COMPLIANCE_VIOLATION:
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case CriticalEventType.PATIENT_SAFETY:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEscalationLevelColor = (level: EscalationLevel) => {
    switch (level) {
      case EscalationLevel.LEVEL_1:
        return 'bg-green-100 text-green-800 border-green-200';
      case EscalationLevel.LEVEL_2:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case EscalationLevel.LEVEL_3:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case EscalationLevel.LEVEL_4:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityColor = (severity: NotificationPriority) => {
    switch (severity) {
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="p-6">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-medium text-gray-900">
              Critical Event Details
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500">Title</h4>
              <p className="mt-1 text-sm text-gray-900">{event.title}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500">Description</h4>
              <p className="mt-1 text-sm text-gray-900">{event.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Type</h4>
                <span
                  className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEventTypeColor(
                    event.type
                  )}`}
                >
                  {event.type.replace('_', ' ')}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500">Severity</h4>
                <span
                  className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(
                    event.severity
                  )}`}
                >
                  {event.severity}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500">Status</h4>
                <span
                  className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    event.status === 'active'
                      ? 'bg-red-100 text-red-800 border-red-200'
                      : event.status === 'acknowledged'
                      ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                      : 'bg-green-100 text-green-800 border-green-200'
                  }`}
                >
                  {event.status}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500">Escalation Level</h4>
                <span
                  className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEscalationLevelColor(
                    event.escalation_level
                  )}`}
                >
                  {event.escalation_level.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Created</h4>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(event.created_at).toLocaleString()}
                </p>
              </div>

              {event.acknowledged_at && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Acknowledged</h4>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(event.acknowledged_at).toLocaleString()}
                  </p>
                </div>
              )}

              {event.resolved_at && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Resolved</h4>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(event.resolved_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {event.metadata && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Additional Information</h4>
                <pre className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              </div>
            )}

            {event.related_events && event.related_events.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Related Events</h4>
                <p className="mt-1 text-sm text-gray-900">
                  {event.related_events.length} related event(s)
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
            {event.status === 'active' && onAcknowledge && (
              <button
                onClick={onAcknowledge}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Acknowledge
              </button>
            )}
            {event.status === 'acknowledged' && onResolve && (
              <button
                onClick={onResolve}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Resolve
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CriticalEventDetailsModal; 