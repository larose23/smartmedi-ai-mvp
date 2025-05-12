import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    let results = {
      success: true,
      operations: [] as string[],
      errors: [] as string[]
    };
    
    console.log('[Direct Fix] Starting fix process');
    
    // 1. First, let's make sure the archived_at column exists in the patients table
    try {
      // Try to select from patients to see if it works
      const { error: selectError } = await supabase
        .from('patients')
        .select('id')
        .limit(1);
        
      if (selectError) {
        console.error('[Direct Fix] Error accessing patients table:', selectError);
        results.errors.push(`Error accessing patients table: ${selectError.message}`);
      } else {
        results.operations.push('Verified patients table exists');
        
        // Now try to directly add the columns using the HTTP API
        // We'll use multiple approaches for redundancy
        await addColumn('patients', 'archived_at', 'timestamptz', results);
        await addColumn('patients', 'appointment_id', 'uuid', results);
        await addColumn('check_ins', 'status', 'text', results);
        
        // Update the check_ins status
        const { error: updateError } = await supabase
          .from('check_ins')
          .update({ status: 'archived' })
          .is('status', null);
          
        if (updateError) {
          console.error('[Direct Fix] Error updating check_ins status:', updateError);
          results.errors.push(`Error updating check_ins status: ${updateError.message}`);
        } else {
          console.log('[Direct Fix] Updated check_ins status');
          results.operations.push('Updated check_ins status');
        }
        
        // Now try to move patients from check_ins to patients
        await transferPatients(supabase, results);
      }
    } catch (e) {
      console.error('[Direct Fix] Unhandled error:', e);
      results.errors.push(`Unhandled error: ${String(e)}`);
    }
    
    // Return results
    results.success = results.errors.length === 0;
    
    return NextResponse.json({
      ...results,
      operations_count: results.operations.length,
      errors_count: results.errors.length
    });
  } catch (error) {
    console.error('[Direct Fix] Unhandled error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error)
    }, { status: 500 });
  }
}

// Helper function to add a column
async function addColumn(table: string, column: string, type: string, results: { operations: string[], errors: string[] }) {
  try {
    console.log(`[Direct Fix] Adding ${column} to ${table}`);
    
    // Check if the column already exists by trying to select it
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?select=${column}&limit=0`, {
      method: 'GET',
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`
      }
    });
    
    if (response.ok) {
      console.log(`[Direct Fix] ${column} already exists in ${table}`);
      results.operations.push(`${column} already exists in ${table}`);
      return;
    }
    
    // Column doesn't exist, try to add it using direct SQL on the table
    // We'll do this using the REST API with a PATCH request
    const alterResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
        'Prefer': 'return=minimal',
        'X-Alter-Table': 'true',
        'X-Add-Column': column,
        'X-Column-Type': type
      }
    });
    
    if (!alterResponse.ok) {
      console.error(`[Direct Fix] Error adding ${column} to ${table}:`, await alterResponse.text());
      results.errors.push(`Error adding ${column} to ${table}`);
    } else {
      console.log(`[Direct Fix] Added ${column} to ${table}`);
      results.operations.push(`Added ${column} to ${table}`);
    }
  } catch (error) {
    console.error(`[Direct Fix] Error adding column ${column}:`, error);
    results.errors.push(`Error adding column ${column}: ${String(error)}`);
  }
}

// Helper function to transfer patients
async function transferPatients(supabase: any, results: { operations: string[], errors: string[] }) {
  try {
    // Find all check-ins that are archived
    const { data: checkIns, error: checkInsError } = await supabase
      .from('check_ins')
      .select('id, full_name, date_of_birth, gender, contact_info, created_at')
      .eq('status', 'archived');
      
    if (checkInsError) {
      console.error('[Direct Fix] Error fetching archived check-ins:', checkInsError);
      results.errors.push(`Error fetching archived check-ins: ${checkInsError.message}`);
      return;
    }
    
    if (!checkIns || checkIns.length === 0) {
      console.log('[Direct Fix] No archived check-ins found');
      results.operations.push('No archived check-ins found');
      return;
    }
    
    console.log(`[Direct Fix] Found ${checkIns.length} archived check-ins`);
    
    // For each check-in, check if it exists in patients table
    let transferCount = 0;
    for (const checkIn of checkIns) {
      // Check if patient exists in patients table
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id')
        .eq('id', checkIn.id)
        .maybeSingle();
        
      if (patientError && patientError.code !== 'PGRST116') {
        console.error(`[Direct Fix] Error checking patient ${checkIn.id}:`, patientError);
        continue;
      }
      
      if (!patient) {
        console.log(`[Direct Fix] Transferring patient ${checkIn.id} to archive`);
        
        // Find if this patient has any appointments
        const { data: appointments } = await supabase
          .from('appointments')
          .select('id')
          .eq('patient_id', checkIn.id)
          .order('created_at', { ascending: false })
          .limit(1);
          
        const appointmentId = appointments && appointments.length > 0 ? appointments[0].id : null;
        
        // Insert into patients table - with minimal fields to avoid schema issues
        const { error: insertError } = await supabase
          .from('patients')
          .insert([{
            id: checkIn.id,
            name: checkIn.full_name || 'Unknown Patient',
            first_name: checkIn.full_name?.split(' ')[0] || 'Unknown',
            last_name: checkIn.full_name?.split(' ').length > 1 
              ? checkIn.full_name.split(' ').slice(1).join(' ') 
              : 'Patient',
            date_of_birth: checkIn.date_of_birth || 'Not Available',
            gender: checkIn.gender || 'Not Specified',
            created_at: checkIn.created_at || new Date().toISOString(),
            archived_at: new Date().toISOString(),
            appointment_id: appointmentId
          }]);
          
        if (insertError) {
          console.error(`[Direct Fix] Error inserting patient ${checkIn.id}:`, insertError);
          results.errors.push(`Error inserting patient ${checkIn.id}: ${insertError.message}`);
          
          // Try an even more minimal insert
          const { error: minimalInsertError } = await supabase
            .from('patients')
            .insert([{
              id: checkIn.id,
              name: checkIn.full_name || 'Unknown Patient',
              created_at: new Date().toISOString()
            }]);
            
          if (minimalInsertError) {
            console.error(`[Direct Fix] Minimal insert also failed for ${checkIn.id}:`, minimalInsertError);
          } else {
            transferCount++;
            console.log(`[Direct Fix] Minimal patient transfer succeeded for ${checkIn.id}`);
            
            // Try to update with the additional fields
            const { error: updateError } = await supabase
              .from('patients')
              .update({
                archived_at: new Date().toISOString(),
                appointment_id: appointmentId
              })
              .eq('id', checkIn.id);
              
            if (updateError) {
              console.error(`[Direct Fix] Error updating patient ${checkIn.id}:`, updateError);
            }
          }
        } else {
          transferCount++;
          console.log(`[Direct Fix] Successfully transferred patient ${checkIn.id} to archive`);
        }
      } else {
        console.log(`[Direct Fix] Patient ${checkIn.id} already exists in archive`);
      }
    }
    
    console.log(`[Direct Fix] Transferred ${transferCount} patients to archive`);
    results.operations.push(`Transferred ${transferCount} patients to archive`);
  } catch (error) {
    console.error('[Direct Fix] Error transferring patients:', error);
    results.errors.push(`Error transferring patients: ${String(error)}`);
  }
} 