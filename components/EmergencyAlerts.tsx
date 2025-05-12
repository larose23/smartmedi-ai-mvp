'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckIn } from '@/types/triage';
import { toast } from 'react-hot-toast';

// Add this interface for dashboard-style check-ins
interface DashboardCheckIn {
  id: string;
  full_name: string;
  primary_symptom: string;
  [key: string]: any;
}

interface EmergencyAlert {
  id: string;
  patient_id: string;
  patient_name: string;
  department: string;
  priority_level: 'high';
  symptoms: string;
  created_at: string;
  acknowledged_by: string | null;
  status: 'active' | 'acknowledged';
}

interface EmergencyAlertsProps {
  checkIns?: (CheckIn | DashboardCheckIn)[] | null;
}

interface Payload {
  new?: {
    status: 'active' | 'acknowledged';
    [key: string]: any;
  };
  old?: {
    [key: string]: any;
  };
}

export default function EmergencyAlerts({ checkIns = null }: EmergencyAlertsProps) {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastAlertedIds, setLastAlertedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchAlerts = async () => {
      const { data, error } = await supabase
        .from('emergency_alerts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching alerts:', error);
        return;
      }

      setAlerts(data || []);
      setUnreadCount(data?.length || 0);
    };

    fetchAlerts();

    // Set up real-time subscription
    const subscription = supabase
      .channel('emergency-alerts')
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'emergency_alerts',
        },
        (payload: Payload) => {
          fetchAlerts();
          if (payload.new?.status === 'active') {
            playAlertSound();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Skip if checkIns is null or undefined
    if (!checkIns) return;

    // Check for new high-priority patients
    const highPriorityPatients = checkIns.filter(
      checkIn => 
        // Check if the primary symptom indicates high priority
        (checkIn.primary_symptom.toLowerCase().includes('emergency') ||
        checkIn.primary_symptom.toLowerCase().includes('severe') ||
        checkIn.primary_symptom.toLowerCase().includes('urgent')) && 
        !lastAlertedIds.has(checkIn.id)
    );

    if (highPriorityPatients.length > 0) {
      highPriorityPatients.forEach(patient => {
        toast.error(
          `High Priority Alert: ${patient.full_name} - ${patient.primary_symptom}`,
          {
            duration: 10000,
            position: 'top-right',
          }
        );
      });

      // Update last alerted IDs
      setLastAlertedIds(new Set([...lastAlertedIds, ...highPriorityPatients.map(p => p.id)]));
    }
  }, [checkIns, lastAlertedIds]);

  const playAlertSound = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      const audio = new Audio('/alert.mp3');
      audio.play().catch(console.error);
      audio.onended = () => setIsPlaying(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    const { error } = await supabase
      .from('emergency_alerts')
      .update({ status: 'acknowledged', acknowledged_by: (await supabase.auth.getUser()).data.user?.id })
      .eq('id', alertId);

    if (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="bg-red-500 text-white p-4 rounded-lg shadow-lg mb-2 max-w-md"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold">{alert.patient_name}</h3>
              <p className="text-sm">Department: {alert.department}</p>
              <p className="text-sm">Symptoms: {alert.symptoms}</p>
              <p className="text-xs opacity-75">
                {new Date(alert.created_at).toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => handleAcknowledge(alert.id)}
              className="bg-white text-red-500 px-3 py-1 rounded text-sm font-semibold hover:bg-red-100"
            >
              Acknowledge
            </button>
          </div>
        </div>
      ))}
      {unreadCount > 0 && (
        <div className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
          {unreadCount}
        </div>
      )}
    </div>
  );
} 