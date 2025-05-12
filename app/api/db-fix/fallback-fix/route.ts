import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    console.log('[Fallback Fix] Starting essential database fixes');
    
    const results = {
      success: false,
      operations: [],
      errors: []
    };
    
    // APPROACH: Since we can't modify the schema directly, we'll try to repair the database
    // by creating new tables with the correct schema and copying data over
    
    // 1. First, let's check what tables we have
    try {
      console.log('[Fallback Fix] Checking existing database state');
      
      // Create a "patients_fixed" table with all required columns
      console.log('[Fallback Fix] Creating patients_fixed table with proper schema');
      
      // This is a crude approach but might work - drop and recreate
      const { error: dropError } = await supabase
        .from('patients_fixed')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (dropError && !dropError.message.includes('does not exist')) {
        console.error('[Fallback Fix] Error clearing patients_fixed:', dropError);
        results.errors.push(`Error clearing patients_fixed: ${dropError.message}`);
      } else {
        console.log('[Fallback Fix] Successfully prepared patients_fixed table');
        results.operations.push('Prepared patients_fixed table');
      }
      
      // Get all check-ins (which should have the patient data)
      const { data: checkIns, error: checkInsError } = await supabase
        .from('check_ins')
        .select('*');
        
      if (checkInsError) {
        console.error('[Fallback Fix] Error fetching check-ins:', checkInsError);
        results.errors.push(`Error fetching check-ins: ${checkInsError.message}`);
      } else if (checkIns && checkIns.length > 0) {
        console.log(`[Fallback Fix] Found ${checkIns.length} check-ins to process`);
        
        // Get all appointments (to build relationships)
        const { data: appointments, error: apptError } = await supabase
          .from('appointments')
          .select('id, patient_id, appointment_date, status');
          
        if (apptError) {
          console.error('[Fallback Fix] Error fetching appointments:', apptError);
          results.errors.push(`Error fetching appointments: ${apptError.message}`);
        }
        
        // For each check-in, create a patient record in patients_fixed
        for (const checkIn of checkIns) {
          // Find the latest appointment for this patient
          const patientAppointments = appointments?.filter(a => a.patient_id === checkIn.id) || [];
          const latestAppointment = patientAppointments.length > 0 
            ? patientAppointments.sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())[0]
            : null;
            
          // Create a complete patient record with all fields we need
          const patientRecord = {
            id: checkIn.id,
            first_name: checkIn.full_name?.split(' ')[0] || 'Unknown',
            last_name: checkIn.full_name?.split(' ').slice(1).join(' ') || 'Patient',
            name: checkIn.full_name || 'Unknown Patient',
            date_of_birth: checkIn.date_of_birth || 'Not Available',
            gender: checkIn.gender || 'Not Specified',
            contact: checkIn.contact_info || '',
            phone_number: checkIn.contact_info || '',
            created_at: checkIn.created_at || new Date().toISOString(),
            archived_at: checkIn.status === 'archived' ? new Date().toISOString() : null,
            appointment_id: latestAppointment?.id || null,
            additional_symptoms: checkIn.additional_symptoms || ''
          };
          
          // Insert into patients_fixed
          const { error: insertError } = await supabase
            .from('patients_fixed')
            .upsert([patientRecord]);
            
          if (insertError) {
            console.error(`[Fallback Fix] Error inserting patient ${checkIn.id}:`, insertError);
            results.errors.push(`Error inserting patient ${checkIn.id}: ${insertError.message}`);
          } else {
            console.log(`[Fallback Fix] Successfully created patient record for ${checkIn.id}`);
          }
        }
        
        results.operations.push(`Processed ${checkIns.length} patients from check-ins`);
        console.log('[Fallback Fix] Completed creating patient records');
      } else {
        console.log('[Fallback Fix] No check-ins found, cannot rebuild patient data');
        results.operations.push('No check-ins found');
      }
      
      // Now fix the department field in appointments if needed
      try {
        console.log('[Fallback Fix] Checking appointment fields');
        
        // Try to select department field from appointments
        const { data: deptCheck, error: deptError } = await supabase
          .from('appointments')
          .select('department')
          .limit(1);
          
        if (deptError && deptError.message.includes('does not exist')) {
          console.log('[Fallback Fix] Creating appointments_fixed table with department field');
          
          // Get all appointments
          const { data: allAppointments, error: allApptError } = await supabase
            .from('appointments')
            .select('*');
            
          if (allApptError) {
            console.error('[Fallback Fix] Error fetching appointments for fix:', allApptError);
            results.errors.push(`Error fetching appointments: ${allApptError.message}`);
          } else if (allAppointments && allAppointments.length > 0) {
            console.log(`[Fallback Fix] Processing ${allAppointments.length} appointments`);
            
            // Prepare appointments_fixed table
            const { error: dropApptError } = await supabase
              .from('appointments_fixed')
              .delete()
              .neq('id', '00000000-0000-0000-0000-000000000000');
              
            if (dropApptError && !dropApptError.message.includes('does not exist')) {
              console.error('[Fallback Fix] Error clearing appointments_fixed:', dropApptError);
              results.errors.push(`Error clearing appointments_fixed: ${dropApptError.message}`);
            }
            
            // Add department field to all appointments
            for (const appt of allAppointments) {
              const apptRecord = {
                ...appt,
                department: appt.department || 'General Medicine'
              };
              
              const { error: insertApptError } = await supabase
                .from('appointments_fixed')
                .upsert([apptRecord]);
                
              if (insertApptError) {
                console.error(`[Fallback Fix] Error inserting appointment ${appt.id}:`, insertApptError);
                results.errors.push(`Error inserting appointment ${appt.id}: ${insertApptError.message}`);
              }
            }
            
            results.operations.push(`Processed ${allAppointments.length} appointments`);
            console.log('[Fallback Fix] Completed creating appointment records');
          }
        } else {
          console.log('[Fallback Fix] Appointments table already has department field');
          results.operations.push('Appointments table already has required fields');
        }
      } catch (e) {
        console.error('[Fallback Fix] Error processing appointments:', e);
        results.errors.push(`Error processing appointments: ${e}`);
      }
      
      // Final verification of our fixed tables
      try {
        console.log('[Fallback Fix] Verifying fixed tables');
        
        // Check patients_fixed
        const { data: patientFixedCheck, error: patientFixedError } = await supabase
          .from('patients_fixed')
          .select('id, name, archived_at, appointment_id')
          .limit(1);
          
        if (!patientFixedError) {
          console.log('[Fallback Fix] patients_fixed table is valid');
          results.operations.push('patients_fixed table verified');
        } else {
          console.error('[Fallback Fix] Error verifying patients_fixed:', patientFixedError);
          results.errors.push(`Error verifying patients_fixed: ${patientFixedError.message}`);
        }
        
        // Check appointments_fixed
        const { data: apptFixedCheck, error: apptFixedError } = await supabase
          .from('appointments_fixed')
          .select('id, department')
          .limit(1);
          
        if (!apptFixedError) {
          console.log('[Fallback Fix] appointments_fixed table is valid');
          results.operations.push('appointments_fixed table verified');
        } else {
          console.error('[Fallback Fix] Error verifying appointments_fixed:', apptFixedError);
          results.errors.push(`Error verifying appointments_fixed: ${apptFixedError.message}`);
        }
        
        // Set overall success based on whether we could verify our fixed tables
        results.success = !patientFixedError && (!apptFixedError || !deptError);
        
      } catch (e) {
        console.error('[Fallback Fix] Error in final verification:', e);
        results.errors.push(`Error in final verification: ${e}`);
      }
      
    } catch (e) {
      console.error('[Fallback Fix] Critical error checking database:', e);
      results.errors.push(`Critical error checking database: ${e}`);
    }
    
    // Final response
    return NextResponse.json({
      success: results.success,
      operations_count: results.operations.length,
      operations: results.operations,
      errors_count: results.errors.length,
      errors: results.errors,
      message: results.success 
        ? 'Successfully created fixed tables (patients_fixed and appointments_fixed)' 
        : 'Created fixed tables with some errors'
    });
  } catch (error) {
    console.error('[Fallback Fix] Unhandled error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error),
      message: 'Failed to apply fallback fix'
    });
  }
} 