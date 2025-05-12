import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface TimelineEvent {
  id: string;
  type: 'check_in' | 'appointment' | 'triage' | 'note';
  timestamp: string;
  title: string;
  description: string;
  metadata?: Record<string, any>;
}

const eventIcons = {
  check_in: '🏥',
  appointment: '📅',
  triage: '⚕️',
  note: '📝',
};

const eventColors = {
  check_in: 'bg-blue-100 text-blue-800',
  appointment: 'bg-purple-100 text-purple-800',
  triage: 'bg-red-100 text-red-800',
  note: 'bg-gray-100 text-gray-800',
};

export const PatientTimeline = ({ patientId }: { patientId: string }) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Fetch check-ins
        const { data: checkIns, error: checkInError } = await supabase
          .from('check_ins')
          .select('*')
          .eq('patient_id', patientId);

        if (checkInError) throw checkInError;

        // Fetch appointments
        const { data: appointments, error: appointmentError } = await supabase
          .from('appointments')
          .select('*')
          .eq('patient_id', patientId);

        if (appointmentError) throw appointmentError;

        // Fetch triage events
        const { data: triageEvents, error: triageError } = await supabase
          .from('triage_events')
          .select('*')
          .eq('patient_id', patientId);

        if (triageError) throw triageError;

        // Combine and sort all events
        const allEvents: TimelineEvent[] = [
          ...(checkIns?.map((checkIn) => ({
            id: checkIn.id,
            type: 'check_in',
            timestamp: checkIn.created_at,
            title: 'Patient Check-in',
            description: `Checked in at ${format(new Date(checkIn.created_at), 'PPp')}`,
            metadata: checkIn,
          })) || []),
          ...(appointments?.map((appointment) => ({
            id: appointment.id,
            type: 'appointment',
            timestamp: appointment.scheduled_at,
            title: 'Appointment Scheduled',
            description: `Scheduled for ${format(new Date(appointment.scheduled_at), 'PPp')}`,
            metadata: appointment,
          })) || []),
          ...(triageEvents?.map((triage) => ({
            id: triage.id,
            type: 'triage',
            timestamp: triage.created_at,
            title: 'Triage Assessment',
            description: `Triage score: ${triage.score}`,
            metadata: triage,
          })) || []),
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        setEvents(allEvents);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch timeline events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [patientId]);

  if (loading) return <div className="p-4">Loading timeline...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Patient Timeline</h2>
      <div className="space-y-4">
        {events.map((event) => (
          <div
            key={event.id}
            className={`p-4 rounded-lg border ${eventColors[event.type]} transition-colors`}
          >
            <div className="flex items-start space-x-3">
              <span className="text-2xl" role="img" aria-label={event.type}>
                {eventIcons[event.type]}
              </span>
              <div className="flex-1">
                <h3 className="font-medium">{event.title}</h3>
                <p className="text-sm opacity-75">{event.description}</p>
                <time className="text-xs opacity-50">
                  {format(new Date(event.timestamp), 'PPp')}
                </time>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 