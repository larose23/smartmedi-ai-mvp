import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { monitoring } from '../../../lib/monitoring';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get total archives
    const { count: total, error: countError } = await supabase
      .from('archives')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw countError;
    }

    // Get successful archives
    const { count: successful, error: successError } = await supabase
      .from('archives')
      .select('*', { count: 'exact', head: true })
      .eq('success', true);

    if (successError) {
      throw successError;
    }

    // Get recent failures
    const { data: recentFailures, error: failuresError } = await supabase
      .from('archives')
      .select('*')
      .eq('success', false)
      .order('timestamp', { ascending: false })
      .limit(5);

    if (failuresError) {
      throw failuresError;
    }

    const failed = total - successful;
    const successRate = total ? (successful / total) * 100 : 0;

    const stats = {
      total,
      successful,
      failed,
      successRate,
      recentFailures: recentFailures.map(failure => ({
        patientId: failure.patient_id,
        timestamp: failure.timestamp,
        error: failure.error_message || 'Unknown error',
      })),
    };

    // Track the API call
    monitoring.trackPerformance('archive_stats_api', Date.now() - req.headers['x-request-start'] as number);

    res.status(200).json(stats);
  } catch (error) {
    monitoring.trackError(error instanceof Error ? error : new Error('Failed to fetch archive stats'));
    res.status(500).json({ error: 'Failed to fetch archive stats' });
  }
} 