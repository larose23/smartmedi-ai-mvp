import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    console.log('[Patients Archive Fix] Starting fix process');

    // Step 1: Check if there are any patients in the check_ins table that are marked as archived
    const { data: archivedCheckIns, error: archivedCheckInsError } = await supabase
      .from('check_ins')
      .select('*')
      .eq('status', 'archived');

    if (archivedCheckInsError) {
      console.error('[Patients Archive Fix] Error fetching archived check-ins:', archivedCheckInsError);
      return NextResponse.json({ success: false, error: archivedCheckInsError.message });
    }

    console.log(`[Patients Archive Fix] Found ${archivedCheckIns?.length || 0} archived check-ins`);

    // Step 2: For each archived check-in, ensure it exists in the patients table
    let transferCount = 0;
    
    if (archivedCheckIns && archivedCheckIns.length > 0) {
      for (const checkIn of archivedCheckIns) {
        // Check if this patient already exists in the patients table
        const { data: existingPatient, error: existingPatientError } = await supabase
          .from('patients')
          .select('id')
          .eq('id', checkIn.id)
          .maybeSingle();

        if (existingPatientError && existingPatientError.code !== 'PGRST116') {
          console.error(`[Patients Archive Fix] Error checking patient ${checkIn.id}:`, existingPatientError);
          continue;
        }

        // If patient doesn't exist in patients table, create it
        if (!existingPatient) {
          console.log(`[Patients Archive Fix] Transferring patient ${checkIn.id} to archive`);
          
          // Get the latest appointment for this patient
          const { data: appointmentData, error: appointmentError } = await supabase
            .from('appointments')
            .select('id')
            .eq('patient_id', checkIn.id)
            .order('appointment_date', { ascending: false })
            .limit(1)
            .maybeSingle();
            
          const appointmentId = appointmentData?.id || null;
          
          // Insert the patient into the patients table
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
              appointment_id: appointmentId,
              // Additional medical info
              primary_symptom: checkIn.primary_symptom || '',
              additional_symptoms: checkIn.additional_symptoms || [],
              triage_score: checkIn.triage_score || 'Not Available'
            }]);

          if (insertError) {
            console.error(`[Patients Archive Fix] Error inserting patient ${checkIn.id}:`, insertError);
          } else {
            transferCount++;
            console.log(`[Patients Archive Fix] Successfully transferred patient ${checkIn.id} to archive`);
          }
        } else {
          console.log(`[Patients Archive Fix] Patient ${checkIn.id} already exists in archive`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fix applied. Transferred ${transferCount} patients to archive.`,
      checkedCount: archivedCheckIns?.length || 0,
      transferredCount: transferCount
    });
  } catch (error) {
    console.error('[Patients Archive Fix] Unexpected error:', error);
    return NextResponse.json({ success: false, error: String(error) });
  }
} 