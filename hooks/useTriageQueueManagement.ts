import { useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useUser } from '@supabase/auth-helpers-react';

export type TriageStatus = 'pending' | 'in_progress' | 'seen' | 'transferred' | 'completed';

interface QueueManagementOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function useTriageQueueManagement() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = useSupabaseClient();
  const user = useUser();

  const updateCaseStatus = async (
    caseId: string,
    status: TriageStatus,
    options?: QueueManagementOptions
  ) => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('triage_logs')
        .update({
          status,
          last_updated_by: user?.id,
          last_updated_at: new Date().toISOString()
        })
        .eq('id', caseId);

      if (updateError) throw updateError;

      options?.onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update case status';
      setError(errorMessage);
      options?.onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const assignCase = async (
    caseId: string,
    assignedTo: string,
    options?: QueueManagementOptions
  ) => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('triage_logs')
        .update({
          assigned_to: assignedTo,
          status: 'in_progress',
          last_updated_by: user?.id,
          last_updated_at: new Date().toISOString()
        })
        .eq('id', caseId);

      if (updateError) throw updateError;

      options?.onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign case';
      setError(errorMessage);
      options?.onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const overridePriority = async (
    caseId: string,
    reason: string,
    options?: QueueManagementOptions
  ) => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('triage_logs')
        .update({
          priority_override: true,
          override_reason: reason,
          override_by: user?.id,
          override_timestamp: new Date().toISOString(),
          last_updated_by: user?.id,
          last_updated_at: new Date().toISOString()
        })
        .eq('id', caseId);

      if (updateError) throw updateError;

      options?.onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to override priority';
      setError(errorMessage);
      options?.onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const assignBed = async (
    caseId: string,
    bedNumber: string,
    department: string,
    options?: QueueManagementOptions
  ) => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('triage_logs')
        .update({
          bed_assignment: bedNumber,
          department_assignment: department,
          last_updated_by: user?.id,
          last_updated_at: new Date().toISOString()
        })
        .eq('id', caseId);

      if (updateError) throw updateError;

      options?.onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign bed';
      setError(errorMessage);
      options?.onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const escalateCase = async (
    caseId: string,
    escalationLevel: number,
    options?: QueueManagementOptions
  ) => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('triage_logs')
        .update({
          escalation_level: escalationLevel,
          notification_sent: true,
          last_updated_by: user?.id,
          last_updated_at: new Date().toISOString()
        })
        .eq('id', caseId);

      if (updateError) throw updateError;

      options?.onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to escalate case';
      setError(errorMessage);
      options?.onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    updateCaseStatus,
    assignCase,
    overridePriority,
    assignBed,
    escalateCase
  };
} 