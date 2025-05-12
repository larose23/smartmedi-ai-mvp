import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface BulkUpdateRequest {
  caseIds: string[];
  updates: {
    severity?: string;
    department?: string;
    isEscalated?: boolean;
    seenByStaff?: boolean;
    staffNotes?: string;
  };
  reason?: string;
}

interface BulkReassignRequest {
  caseIds: string[];
  newDepartment: string;
  reason: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { operation } = req.query;

    switch (operation) {
      case 'update':
        return handleBulkUpdate(req.body as BulkUpdateRequest, res);
      case 'reassign':
        return handleBulkReassign(req.body as BulkReassignRequest, res);
      case 'delete':
        return handleBulkDelete(req.body as { caseIds: string[] }, res);
      default:
        return res.status(400).json({ error: 'Invalid operation' });
    }
  } catch (error) {
    console.error('Error in bulk operation:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleBulkUpdate(request: BulkUpdateRequest, res: NextApiResponse) {
  const { caseIds, updates, reason } = request;

  if (!caseIds || caseIds.length === 0) {
    return res.status(400).json({ error: 'No case IDs provided' });
  }

  try {
    // Get current cases for audit logging
    const { data: currentCases, error: fetchError } = await supabase
      .from('triage_cases')
      .select('*')
      .in('id', caseIds);

    if (fetchError) {
      console.error('Error fetching cases:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch cases' });
    }

    // Update cases
    const { data: updatedCases, error: updateError } = await supabase
      .from('triage_cases')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .in('id', caseIds)
      .select();

    if (updateError) {
      console.error('Error updating cases:', updateError);
      return res.status(500).json({ error: 'Failed to update cases' });
    }

    // Log the bulk update
    const auditLogs = currentCases.map(case_ => ({
      action: 'Bulk Update',
      details: `Bulk update: ${reason || 'No reason provided'}`,
      status: 'success',
      case_id: case_.id,
      previous_status: case_.severity,
      new_status: updates.severity,
    }));

    await supabase.from('triage_audit_logs').insert(auditLogs);

    // Update analytics
    await updateTriageAnalytics();

    return res.status(200).json({
      message: `Successfully updated ${updatedCases.length} cases`,
      updatedCases,
    });
  } catch (error) {
    console.error('Error in handleBulkUpdate:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleBulkReassign(request: BulkReassignRequest, res: NextApiResponse) {
  const { caseIds, newDepartment, reason } = request;

  if (!caseIds || caseIds.length === 0) {
    return res.status(400).json({ error: 'No case IDs provided' });
  }

  if (!newDepartment) {
    return res.status(400).json({ error: 'New department is required' });
  }

  try {
    // Get current cases for audit logging
    const { data: currentCases, error: fetchError } = await supabase
      .from('triage_cases')
      .select('*')
      .in('id', caseIds);

    if (fetchError) {
      console.error('Error fetching cases:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch cases' });
    }

    // Update department
    const { data: updatedCases, error: updateError } = await supabase
      .from('triage_cases')
      .update({
        department: newDepartment,
        updated_at: new Date().toISOString(),
      })
      .in('id', caseIds)
      .select();

    if (updateError) {
      console.error('Error reassigning cases:', updateError);
      return res.status(500).json({ error: 'Failed to reassign cases' });
    }

    // Log the reassignment
    const auditLogs = currentCases.map(case_ => ({
      action: 'Bulk Reassignment',
      details: `Reassigned to ${newDepartment}: ${reason}`,
      status: 'success',
      case_id: case_.id,
      previous_status: case_.department,
      new_status: newDepartment,
    }));

    await supabase.from('triage_audit_logs').insert(auditLogs);

    // Update analytics
    await updateTriageAnalytics();

    return res.status(200).json({
      message: `Successfully reassigned ${updatedCases.length} cases to ${newDepartment}`,
      updatedCases,
    });
  } catch (error) {
    console.error('Error in handleBulkReassign:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleBulkDelete(request: { caseIds: string[] }, res: NextApiResponse) {
  const { caseIds } = request;

  if (!caseIds || caseIds.length === 0) {
    return res.status(400).json({ error: 'No case IDs provided' });
  }

  try {
    // Get current cases for audit logging
    const { data: currentCases, error: fetchError } = await supabase
      .from('triage_cases')
      .select('*')
      .in('id', caseIds);

    if (fetchError) {
      console.error('Error fetching cases:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch cases' });
    }

    // Delete cases
    const { error: deleteError } = await supabase
      .from('triage_cases')
      .delete()
      .in('id', caseIds);

    if (deleteError) {
      console.error('Error deleting cases:', deleteError);
      return res.status(500).json({ error: 'Failed to delete cases' });
    }

    // Log the deletion
    const auditLogs = currentCases.map(case_ => ({
      action: 'Bulk Delete',
      details: 'Case deleted as part of bulk operation',
      status: 'success',
      case_id: case_.id,
      previous_status: case_.severity,
    }));

    await supabase.from('triage_audit_logs').insert(auditLogs);

    // Update analytics
    await updateTriageAnalytics();

    return res.status(200).json({
      message: `Successfully deleted ${caseIds.length} cases`,
    });
  } catch (error) {
    console.error('Error in handleBulkDelete:', error);
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