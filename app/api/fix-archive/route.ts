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
    
    console.log('[Fix Archive] Starting fix process');
    
    // First, check if the archived_at column exists
    try {
      const { data: test, error: testError } = await supabase
        .from('patients')
        .select('archived_at')
        .limit(1);
        
      if (testError) {
        console.log('[Fix Archive] archived_at column does not exist, adding it');
        
        // Try to add the column with a direct query using the Supabase client
        const { error: alterError } = await supabase.rpc('query', { 
          query: 'ALTER TABLE patients ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NOW()' 
        });
        
        if (alterError) {
          console.error('[Fix Archive] Error adding archived_at column:', alterError);
          results.errors.push(`Error adding archived_at column: ${alterError.message}`);
        } else {
          console.log('[Fix Archive] Added archived_at column');
          results.operations.push('Added archived_at column');
        }
      } else {
        console.log('[Fix Archive] archived_at column already exists');
        results.operations.push('archived_at column already exists');
      }
    } catch (e) {
      console.error('[Fix Archive] Error checking archived_at column:', e);
      results.errors.push(`Error checking archived_at column: ${String(e)}`);
    }
    
    // Check if the appointment_id column exists
    try {
      const { data: test, error: testError } = await supabase
        .from('patients')
        .select('appointment_id')
        .limit(1);
        
      if (testError) {
        console.log('[Fix Archive] appointment_id column does not exist, adding it');
        
        // Try to add the column with a direct query
        const { error: alterError } = await supabase.rpc('query', { 
          query: 'ALTER TABLE patients ADD COLUMN IF NOT EXISTS appointment_id UUID' 
        });
        
        if (alterError) {
          console.error('[Fix Archive] Error adding appointment_id column:', alterError);
          results.errors.push(`Error adding appointment_id column: ${alterError.message}`);
        } else {
          console.log('[Fix Archive] Added appointment_id column');
          results.operations.push('Added appointment_id column');
        }
      } else {
        console.log('[Fix Archive] appointment_id column already exists');
        results.operations.push('appointment_id column already exists');
      }
    } catch (e) {
      console.error('[Fix Archive] Error checking appointment_id column:', e);
      results.errors.push(`Error checking appointment_id column: ${String(e)}`);
    }
    
    // Add status column to check_ins if it doesn't exist
    try {
      const { data: test, error: testError } = await supabase
        .from('check_ins')
        .select('status')
        .limit(1);
        
      if (testError) {
        console.log('[Fix Archive] status column does not exist in check_ins, adding it');
        
        // Try to add the column
        const { error: alterError } = await supabase.rpc('query', { 
          query: 'ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS status TEXT DEFAULT \'active\'' 
        });
        
        if (alterError) {
          console.error('[Fix Archive] Error adding status column to check_ins:', alterError);
          results.errors.push(`Error adding status column to check_ins: ${alterError.message}`);
        } else {
          console.log('[Fix Archive] Added status column to check_ins');
          results.operations.push('Added status column to check_ins');
        }
      } else {
        console.log('[Fix Archive] status column already exists in check_ins');
        results.operations.push('status column already exists in check_ins');
      }
    } catch (e) {
      console.error('[Fix Archive] Error checking status column in check_ins:', e);
      results.errors.push(`Error checking status column in check_ins: ${String(e)}`);
    }
    
    // Mark completed check-ins as archived
    try {
      const { error: updateError } = await supabase
        .from('check_ins')
        .update({ status: 'archived' })
        .is('status', null)
        .or('status.eq.completed');
        
      if (updateError) {
        console.error('[Fix Archive] Error marking check-ins as archived:', updateError);
        results.errors.push(`Error marking check-ins as archived: ${updateError.message}`);
      } else {
        console.log('[Fix Archive] Marked completed check-ins as archived');
        results.operations.push('Marked completed check-ins as archived');
      }
    } catch (e) {
      console.error('[Fix Archive] Error marking check-ins as archived:', e);
      results.errors.push(`Error marking check-ins as archived: ${String(e)}`);
    }
    
    // Transfer patients from check_ins to patients table
    try {
      // Find all check-ins that are archived but not in patients table
      const { data: checkIns, error: checkInsError } = await supabase
        .from('check_ins')
        .select('id, full_name, date_of_birth, gender, contact_info, created_at')
        .eq('status', 'archived');
        
      if (checkInsError) {
        console.error('[Fix Archive] Error fetching archived check-ins:', checkInsError);
        results.errors.push(`Error fetching archived check-ins: ${checkInsError.message}`);
      } else if (checkIns && checkIns.length > 0) {
        console.log(`[Fix Archive] Found ${checkIns.length} archived check-ins`);
        
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
            console.error(`[Fix Archive] Error checking patient ${checkIn.id}:`, patientError);
            continue;
          }
          
          if (!patient) {
            console.log(`[Fix Archive] Transferring patient ${checkIn.id} to archive`);
            
            // Find if this patient has any appointments
            const { data: appointments, error: appointmentsError } = await supabase
              .from('appointments')
              .select('id')
              .eq('patient_id', checkIn.id)
              .order('created_at', { ascending: false })
              .limit(1);
              
            const appointmentId = appointments && appointments.length > 0 ? appointments[0].id : null;
            
            // Insert into patients table
            const { error: insertError } = await supabase
              .from('patients')
              .insert([{
                id: checkIn.id,
                first_name: checkIn.full_name?.split(' ')[0] || 'Unknown',
                last_name: checkIn.full_name?.split(' ').length > 1 
                  ? checkIn.full_name.split(' ').slice(1).join(' ') 
                  : 'Patient',
                name: checkIn.full_name || 'Unknown Patient',
                date_of_birth: checkIn.date_of_birth || 'Not Available',
                gender: checkIn.gender || 'Not Specified',
                contact: checkIn.contact_info || 'Not Available',
                phone_number: checkIn.contact_info || 'Not Available',
                created_at: checkIn.created_at || new Date().toISOString(),
                archived_at: new Date().toISOString(),
                appointment_id: appointmentId
              }]);
              
            if (insertError) {
              console.error(`[Fix Archive] Error inserting patient ${checkIn.id}:`, insertError);
              results.errors.push(`Error inserting patient ${checkIn.id}: ${insertError.message}`);
            } else {
              transferCount++;
              console.log(`[Fix Archive] Successfully transferred patient ${checkIn.id} to archive`);
            }
          } else {
            console.log(`[Fix Archive] Patient ${checkIn.id} already exists in archive`);
          }
        }
        
        console.log(`[Fix Archive] Transferred ${transferCount} patients to archive`);
        results.operations.push(`Transferred ${transferCount} patients to archive`);
      } else {
        console.log('[Fix Archive] No archived check-ins found that need transferring');
        results.operations.push('No archived check-ins found that need transferring');
      }
    } catch (e) {
      console.error('[Fix Archive] Error transferring patients:', e);
      results.errors.push(`Error transferring patients: ${String(e)}`);
    }
    
    // Return the results
    results.success = results.errors.length === 0;
    return NextResponse.json({
      ...results,
      operations_count: results.operations.length,
      errors_count: results.errors.length
    });
  } catch (error) {
    console.error('[Fix Archive] Unhandled error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error)
    }, { status: 500 });
  }
} 