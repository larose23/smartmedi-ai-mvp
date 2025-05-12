import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    console.log('[DB Diagnostics] Starting database diagnostic check');
    
    const diagnosticResults = {
      tables: {},
      counts: {},
      issues: [],
      sample_records: {}
    };
    
    // Check key tables
    const tables = ['check_ins', 'patients', 'appointments'];
    
    for (const table of tables) {
      try {
        console.log(`[DB Diagnostics] Checking table: ${table}`);
        
        // Check if table exists
        const { count, error: countError } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
          
        if (countError) {
          console.error(`[DB Diagnostics] Error checking table ${table}:`, countError);
          diagnosticResults.tables[table] = { exists: false, error: countError.message };
          diagnosticResults.issues.push(`Table ${table} error: ${countError.message}`);
          continue;
        }
        
        diagnosticResults.tables[table] = { exists: true };
        diagnosticResults.counts[table] = count;
        
        // Get a sample record
        const { data: sample, error: sampleError } = await supabase
          .from(table)
          .select('*')
          .limit(1);
          
        if (sampleError) {
          console.error(`[DB Diagnostics] Error getting sample from ${table}:`, sampleError);
          diagnosticResults.issues.push(`Cannot get sample from ${table}: ${sampleError.message}`);
        } else if (sample && sample.length > 0) {
          diagnosticResults.sample_records[table] = sample[0];
        }
      } catch (e) {
        console.error(`[DB Diagnostics] Error processing table ${table}:`, e);
        diagnosticResults.tables[table] = { exists: false, error: String(e) };
        diagnosticResults.issues.push(`Exception checking table ${table}: ${String(e)}`);
      }
    }
    
    // Check specific important relations
    // 1. Check if any patients in check_ins are marked as archived
    try {
      const { data: archivedCheckIns, error: archivedError } = await supabase
        .from('check_ins')
        .select('id, full_name, status')
        .eq('status', 'archived')
        .limit(5);
        
      if (archivedError) {
        console.error('[DB Diagnostics] Error checking archived patients:', archivedError);
        diagnosticResults.issues.push(`Error checking archived patients: ${archivedError.message}`);
      } else {
        diagnosticResults.archived_check_ins_count = archivedCheckIns?.length || 0;
        diagnosticResults.archived_check_ins_sample = archivedCheckIns;
      }
    } catch (e) {
      console.error('[DB Diagnostics] Exception checking archived patients:', e);
      diagnosticResults.issues.push(`Exception checking archived patients: ${String(e)}`);
    }
    
    // 2. Check if appointments table has patient_id references
    try {
      const { data: appointmentsWithPatients, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id, patient_id')
        .not('patient_id', 'is', null)
        .limit(5);
        
      if (appointmentsError) {
        console.error('[DB Diagnostics] Error checking appointments with patients:', appointmentsError);
        diagnosticResults.issues.push(`Error checking appointments: ${appointmentsError.message}`);
      } else {
        diagnosticResults.appointments_with_patients_count = appointmentsWithPatients?.length || 0;
        diagnosticResults.appointments_with_patients_sample = appointmentsWithPatients;
      }
    } catch (e) {
      console.error('[DB Diagnostics] Exception checking appointments:', e);
      diagnosticResults.issues.push(`Exception checking appointments: ${String(e)}`);
    }
    
    // 3. Check schema of patients table to ensure it has archived_at and appointment_id
    try {
      const { data: patientWithAppointment, error: patientError } = await supabase
        .from('patients')
        .select('archived_at, appointment_id')
        .limit(1);
        
      if (patientError) {
        console.error('[DB Diagnostics] Error checking patients schema:', patientError);
        diagnosticResults.issues.push(`Error checking patients schema: ${patientError.message}`);
        
        // This might indicate schema issues - try to add the columns
        try {
          console.log('[DB Diagnostics] Attempting to fix patients table schema');
          
          // Try to create a schema fix using RPC if available
          const { error: rpcError } = await supabase.rpc('fix_patients_schema', {});
          
          if (rpcError) {
            console.error('[DB Diagnostics] RPC fix failed:', rpcError);
            diagnosticResults.issues.push(`Schema fix failed: ${rpcError.message}`);
          } else {
            console.log('[DB Diagnostics] Schema fix applied successfully');
            diagnosticResults.schema_fix_applied = true;
          }
        } catch (fixError) {
          console.error('[DB Diagnostics] Schema fix exception:', fixError);
          diagnosticResults.issues.push(`Schema fix exception: ${String(fixError)}`);
        }
      } else {
        diagnosticResults.patients_has_required_fields = true;
      }
    } catch (e) {
      console.error('[DB Diagnostics] Exception checking patients schema:', e);
      diagnosticResults.issues.push(`Exception checking patients schema: ${String(e)}`);
    }
    
    // Final report
    console.log('[DB Diagnostics] Completed database diagnosis');
    console.log('[DB Diagnostics] Issues found:', diagnosticResults.issues.length);
    
    return NextResponse.json({
      success: true,
      diagnostic_results: diagnosticResults,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[DB Diagnostics] Critical error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error),
      timestamp: new Date().toISOString()
    });
  }
} 