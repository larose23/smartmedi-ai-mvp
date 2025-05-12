import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid case ID' });
  }

  switch (req.method) {
    case 'GET':
      return getTriageCase(id, res);
    case 'PUT':
      return updateTriageCase(id, req.body, res);
    case 'DELETE':
      return deleteTriageCase(id, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getTriageCase(id: string, res: NextApiResponse) {
  try {
    const { data: triageCase, error } = await supabase
      .from('triage_cases')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching triage case:', error);
      return res.status(500).json({ error: 'Failed to fetch triage case' });
    }

    if (!triageCase) {
      return res.status(404).json({ error: 'Triage case not found' });
    }

    return res.status(200).json(triageCase);
  } catch (error) {
    console.error('Error in getTriageCase:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateTriageCase(id: string, updates: any, res: NextApiResponse) {
  try {
    // Get the current case data
    const { data: currentCase, error: fetchError } = await supabase
      .from('triage_cases')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching current case:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch current case' });
    }

    if (!currentCase) {
      return res.status(404).json({ error: 'Triage case not found' });
    }

    // Update the case
    const { data: updatedCase, error: updateError } = await supabase
      .from('triage_cases')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating triage case:', updateError);
      return res.status(500).json({ error: 'Failed to update triage case' });
    }

    // Log the update
    await supabase.from('triage_audit_logs').insert({
      action: 'Triage Case Updated',
      details: `Case ${id} updated with new data`,
      status: 'success',
      case_id: id,
      previous_status: currentCase.severity,
      new_status: updates.severity,
    });

    // Update analytics if needed
    if (updates.severity || updates.is_escalated) {
      await updateTriageAnalytics();
    }

    return res.status(200).json(updatedCase);
  } catch (error) {
    console.error('Error in updateTriageCase:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteTriageCase(id: string, res: NextApiResponse) {
  try {
    // Check if case exists
    const { data: existingCase, error: fetchError } = await supabase
      .from('triage_cases')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching case:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch case' });
    }

    if (!existingCase) {
      return res.status(404).json({ error: 'Triage case not found' });
    }

    // Delete the case
    const { error: deleteError } = await supabase
      .from('triage_cases')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting triage case:', deleteError);
      return res.status(500).json({ error: 'Failed to delete triage case' });
    }

    // Log the deletion
    await supabase.from('triage_audit_logs').insert({
      action: 'Triage Case Deleted',
      details: `Case ${id} deleted`,
      status: 'success',
      case_id: id,
      previous_status: existingCase.severity,
    });

    // Update analytics
    await updateTriageAnalytics();

    return res.status(200).json({ message: 'Triage case deleted successfully' });
  } catch (error) {
    console.error('Error in deleteTriageCase:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateTriageAnalytics() {
  try {
    // Get case counts
    const { data: cases } = await supabase
      .from('triage_cases')
      .select('severity');

    if (!cases) return;

    // Calculate new metrics
    const totalCases = cases.length;
    const criticalCases = cases.filter(c => c.severity === 'critical').length;
    const urgentCases = cases.filter(c => c.severity === 'urgent').length;
    const moderateCases = cases.filter(c => c.severity === 'moderate').length;
    const stableCases = cases.filter(c => c.severity === 'stable').length;

    // Calculate metrics (mock data for now)
    const avgTriageTime = 15;
    const accuracyRate = 85;
    const throughput = totalCases / 24; // Cases per hour

    // Insert new analytics record
    await supabase.from('triage_analytics').insert({
      avg_triage_time: avgTriageTime,
      accuracy_rate: accuracyRate,
      throughput: throughput,
      total_cases: totalCases,
      critical_cases: criticalCases,
      urgent_cases: urgentCases,
      moderate_cases: moderateCases,
      stable_cases: stableCases,
    });
  } catch (error) {
    console.error('Error updating triage analytics:', error);
  }
} 