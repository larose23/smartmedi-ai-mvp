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
    const { data: transitions, error } = await supabase
      .from('status_transitions')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    // Group transitions by fromStatus and toStatus
    const groupedTransitions = transitions.reduce((acc: any, transition) => {
      const key = `${transition.fromStatus}-${transition.toStatus}`;
      if (!acc[key]) {
        acc[key] = {
          fromStatus: transition.fromStatus,
          toStatus: transition.toStatus,
          count: 0,
          success: transition.success,
        };
      }
      acc[key].count++;
      return acc;
    }, {});

    const result = Object.values(groupedTransitions);

    // Track the API call
    monitoring.trackPerformance('status_transitions_api', Date.now() - req.headers['x-request-start'] as number);

    res.status(200).json(result);
  } catch (error) {
    monitoring.trackError(error instanceof Error ? error : new Error('Failed to fetch status transitions'));
    res.status(500).json({ error: 'Failed to fetch status transitions' });
  }
} 