import React, { useEffect, useState } from 'react';
import { CriticalEvent, CriticalEventService, CriticalEventType, EscalationLevel } from '@/lib/services/CriticalEventService';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from './LoadingSpinner';
import CriticalEventDetailsModal from './CriticalEventDetailsModal';

interface CriticalEventHubProps {
  userId: string;
  userRole: string;
  onEventClick?: (event: CriticalEvent) => void;
}

const CriticalEventHub: React.FC<CriticalEventHubProps> = ({
  userId,
  userRole,
  onEventClick
}) => {
  const [events, setEvents] = useState<CriticalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CriticalEvent | null>(null);

  useEffect(() => {
    loadEvents();
    const subscription = supabase
      .channel('critical_events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'critical_events' }, () => {
        loadEvents();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [showResolved]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('critical_events')
        .select('*')
        .eq('status', showResolved ? 'resolved' : 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (eventId: string) => {
    try {
      await CriticalEventService.acknowledgeEvent(eventId);
      loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to acknowledge event');
    }
  };

  const handleResolve = async (eventId: string) => {
    try {
      await CriticalEventService.resolveEvent(eventId);
      loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve event');
    }
  };

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

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading events</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Critical Events
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            {showResolved ? 'Resolved Events' : 'Active Events'}
          </p>
        </div>
        <button
          onClick={() => setShowResolved(!showResolved)}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {showResolved ? 'Show Active' : 'Show Resolved'}
        </button>
      </div>

      <div className="border-t border-gray-200">
        <ul className="divide-y divide-gray-200">
          {events.map((event) => (
            <li
              key={event.id}
              className="px-4 py-4 sm:px-6 hover:bg-gray-50 cursor-pointer"
              onClick={() => setSelectedEvent(event)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEventTypeColor(
                        event.type
                      )}`}
                    >
                      {event.type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-sm font-medium text-gray-900">
                      {event.title}
                    </h4>
                    <p className="text-sm text-gray-500">{event.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEscalationLevelColor(
                      event.escalation_level
                    )}`}
                  >
                    {event.escalation_level.replace('_', ' ')}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(event.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </li>
          ))}
          {events.length === 0 && (
            <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
              No {showResolved ? 'resolved' : 'active'} events found
            </li>
          )}
        </ul>
      </div>

      {selectedEvent && (
        <CriticalEventDetailsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onAcknowledge={
            selectedEvent.status === 'active'
              ? () => handleAcknowledge(selectedEvent.id)
              : undefined
          }
          onResolve={
            selectedEvent.status === 'acknowledged'
              ? () => handleResolve(selectedEvent.id)
              : undefined
          }
        />
      )}
    </div>
  );
};

export default CriticalEventHub; 