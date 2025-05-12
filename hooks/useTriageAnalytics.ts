import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

interface QueueAnalytics {
  totalCases: number;
  avgWaitTime: number;
  avgProcessingTime: number;
  completedCases: number;
  overrideCases: number;
  escalatedCases: number;
  hour: string;
}

interface ClinicianPerformance {
  assignedTo: string;
  totalCases: number;
  avgProcessingTime: number;
  completedCases: number;
  overrideCases: number;
}

export function useTriageAnalytics() {
  const [queueAnalytics, setQueueAnalytics] = useState<QueueAnalytics[]>([]);
  const [clinicianPerformance, setClinicianPerformance] = useState<ClinicianPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useSupabaseClient();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch queue analytics
      const { data: queueData, error: queueError } = await supabase
        .from('triage_queue_analytics')
        .select('*')
        .order('hour', { ascending: false })
        .limit(24); // Last 24 hours

      if (queueError) throw queueError;

      // Fetch clinician performance
      const { data: clinicianData, error: clinicianError } = await supabase
        .from('clinician_performance')
        .select('*');

      if (clinicianError) throw clinicianError;

      setQueueAnalytics(queueData);
      setClinicianPerformance(clinicianData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentMetrics = () => {
    if (queueAnalytics.length === 0) return null;
    return queueAnalytics[0];
  };

  const getTrendMetrics = () => {
    if (queueAnalytics.length < 2) return null;

    const current = queueAnalytics[0];
    const previous = queueAnalytics[1];

    return {
      waitTimeTrend: current.avgWaitTime - previous.avgWaitTime,
      processingTimeTrend: current.avgProcessingTime - previous.avgProcessingTime,
      caseVolumeTrend: current.totalCases - previous.totalCases
    };
  };

  const getClinicianMetrics = (clinicianId: string) => {
    return clinicianPerformance.find(c => c.assignedTo === clinicianId);
  };

  const getTopPerformers = (limit: number = 5) => {
    return [...clinicianPerformance]
      .sort((a, b) => b.completedCases - a.completedCases)
      .slice(0, limit);
  };

  const getBottleneckMetrics = () => {
    const current = getCurrentMetrics();
    if (!current) return null;

    return {
      isHighWaitTime: current.avgWaitTime > 30, // More than 30 minutes
      isHighProcessingTime: current.avgProcessingTime > 45, // More than 45 minutes
      isHighEscalationRate: (current.escalatedCases / current.totalCases) > 0.1, // More than 10%
      isHighOverrideRate: (current.overrideCases / current.totalCases) > 0.2 // More than 20%
    };
  };

  return {
    loading,
    error,
    queueAnalytics,
    clinicianPerformance,
    getCurrentMetrics,
    getTrendMetrics,
    getClinicianMetrics,
    getTopPerformers,
    getBottleneckMetrics,
    refreshAnalytics: fetchAnalytics
  };
} 