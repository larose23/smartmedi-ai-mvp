import { createClient } from '@supabase/supabase-js';
import { monitoring } from '../monitoring';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function trackStatusTransition(
  fromStatus: string,
  toStatus: string,
  success: boolean,
  metadata?: Record<string, any>
) {
  try {
    const { error } = await supabase.from('status_transitions').insert({
      fromStatus,
      toStatus,
      success,
      timestamp: new Date().toISOString(),
      metadata,
    });

    if (error) {
      throw error;
    }

    // Track the transition in monitoring
    monitoring.trackStatusTransition(fromStatus, toStatus, success, metadata);
  } catch (error) {
    monitoring.trackError(error instanceof Error ? error : new Error('Failed to track status transition'), {
      fromStatus,
      toStatus,
      success,
      metadata,
    });
    throw error;
  }
}

export async function trackArchiveOperation(
  patientId: string,
  success: boolean,
  errorMessage?: string
) {
  try {
    const { error } = await supabase.from('archives').insert({
      patient_id: patientId,
      success,
      timestamp: new Date().toISOString(),
      error_message: errorMessage,
    });

    if (error) {
      throw error;
    }

    // Track the archive operation in monitoring
    monitoring.trackArchiveSuccess(patientId, success, { errorMessage });
  } catch (error) {
    monitoring.trackError(error instanceof Error ? error : new Error('Failed to track archive operation'), {
      patientId,
      success,
      errorMessage,
    });
    throw error;
  }
} 