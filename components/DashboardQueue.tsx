import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Patient {
  id: string;
  name: string;
  triage_score: 'High' | 'Medium' | 'Low';
  check_in_time: string;
  status: 'waiting' | 'in_progress' | 'completed';
}

const triageColors = {
  High: 'bg-red-100 text-red-800 border-red-200',
  Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Low: 'bg-green-100 text-green-800 border-green-200',
};

export const DashboardQueue = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let channel: RealtimeChannel;

    const fetchInitialData = async () => {
      try {
        const { data, error } = await supabase
          .from('triage_queue')
          .select('*')
          .order('check_in_time', { ascending: true });

        if (error) throw error;
        setPatients(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch queue');
      } finally {
        setLoading(false);
      }
    };

    const setupRealtimeSubscription = () => {
      channel = supabase
        .channel('triage_queue_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'triage_queue',
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setPatients((current) => [...current, payload.new as Patient]);
            } else if (payload.eventType === 'UPDATE') {
              setPatients((current) =>
                current.map((patient) =>
                  patient.id === payload.new.id ? (payload.new as Patient) : patient
                )
              );
            } else if (payload.eventType === 'DELETE') {
              setPatients((current) =>
                current.filter((patient) => patient.id !== payload.old.id)
              );
            }
          }
        )
        .subscribe();
    };

    fetchInitialData();
    setupRealtimeSubscription();

    return () => {
      channel?.unsubscribe();
    };
  }, []);

  if (loading) return <div className="p-4">Loading queue...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Patient Queue</h2>
      <div className="space-y-2">
        {patients.map((patient) => (
          <div
            key={patient.id}
            className={`p-4 rounded-lg border ${triageColors[patient.triage_score]} transition-colors`}
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium">{patient.name}</h3>
                <p className="text-sm opacity-75">
                  Check-in: {new Date(patient.check_in_time).toLocaleTimeString()}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 rounded-full text-xs font-medium">
                  {patient.triage_score}
                </span>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100">
                  {patient.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 