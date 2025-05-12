import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

export interface TriageQueueItem {
  id: string;
  patientDescription: string;
  triageDecision: {
    acuity: number;
    confidence: number;
    explanation: string;
    recommendedActions: string[];
    timestamp: string;
  };
  riskAssessment: {
    overallRisk: number;
    confidence: number;
    explanation: string;
  };
  clinicalValidation: {
    isValid: boolean;
    warnings: string[];
    recommendations: string[];
  };
  waitEstimate: number;
  createdAt: string;
}

export function useTriageQueue() {
  const [queue, setQueue] = useState<TriageQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useSupabaseClient();

  // Calculate wait time estimate based on queue position and acuity
  const calculateWaitTime = (item: TriageQueueItem): number => {
    const baseWaitTimes = {
      1: 0, // Immediate
      2: 15, // Urgent
      3: 30, // Semi-urgent
      4: 60, // Non-urgent
      5: 120 // Routine
    };

    const queuePosition = queue.findIndex(q => q.id === item.id);
    const higherPriorityCount = queue
      .slice(0, queuePosition)
      .filter(q => q.triageDecision.acuity < item.triageDecision.acuity)
      .length;

    return baseWaitTimes[item.triageDecision.acuity as keyof typeof baseWaitTimes] + 
           (higherPriorityCount * 15); // Add 15 minutes for each higher priority case
  };

  // Fetch initial queue
  useEffect(() => {
    fetchQueue();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const subscription = supabase
      .channel('triage_queue_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'triage_logs'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = transformQueueItem(payload.new);
            setQueue(prev => [...prev, newItem]);
          } else if (payload.eventType === 'DELETE') {
            setQueue(prev => prev.filter(item => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('triage_logs')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const transformedQueue = data.map(transformQueueItem);
      setQueue(transformedQueue);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch queue');
    } finally {
      setLoading(false);
    }
  };

  const transformQueueItem = (item: any): TriageQueueItem => {
    const waitEstimate = calculateWaitTime({
      id: item.id,
      triageDecision: item.triage_decision,
      riskAssessment: item.risk_assessment,
      clinicalValidation: item.clinical_validation,
      patientDescription: item.patient_description,
      createdAt: item.created_at,
      waitEstimate: 0
    });

    return {
      id: item.id,
      patientDescription: item.patient_description,
      triageDecision: item.triage_decision,
      riskAssessment: item.risk_assessment,
      clinicalValidation: item.clinical_validation,
      waitEstimate,
      createdAt: item.created_at
    };
  };

  const getRiskLevelColor = (risk: number): string => {
    if (risk < 0.3) return 'green';
    if (risk < 0.6) return 'yellow';
    return 'red';
  };

  const getAcuityColor = (acuity: number): string => {
    const colors = {
      1: 'red',
      2: 'orange',
      3: 'yellow',
      4: 'blue',
      5: 'green'
    };
    return colors[acuity as keyof typeof colors];
  };

  return {
    queue,
    loading,
    error,
    getRiskLevelColor,
    getAcuityColor,
    refreshQueue: fetchQueue
  };
} 