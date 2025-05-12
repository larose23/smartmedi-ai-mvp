import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

// Types
interface PatientData {
  id: string;
  full_name: string;
  date_of_birth: string;
  gender: string;
  contact_info: string;
  triage_data: any;
  symptoms: any;
}

/**
 * Moves a patient from the dashboard (check_ins table) to the archive (patients table)
 * This ensures only unseen patients appear in the dashboard
 */
export async function archivePatient(patientId: string, appointmentData?: any) {
  try {
    // 1. Get patient data from check_ins
    const { data: patientData, error: fetchError } = await supabase
      .from('check_ins')
      .select('*')
      .eq('id', patientId)
      .single();

    if (fetchError) {
      console.error('Error fetching patient data:', fetchError);
      throw new Error(`Failed to fetch patient data: ${fetchError.message}`);
    }

    if (!patientData) {
      throw new Error('Patient not found');
    }

    // 2. Create record in patients table
    const { error: insertError } = await supabase
      .from('patients')
      .insert({
        id: patientData.id,
        first_name: patientData.full_name.split(' ')[0],
        last_name: patientData.full_name.split(' ').slice(1).join(' '),
        date_of_birth: patientData.date_of_birth,
        gender: patientData.gender,
        contact_info: patientData.contact_info || patientData.contact_information,
        medical_history: patientData.symptoms?.medical_history || [],
        triage_score: patientData.triage_score,
        potential_diagnoses: patientData.potential_diagnoses || [],
        symptoms: patientData.symptoms || {},
        appointment_id: appointmentData?.id || null,
        appointment_date: appointmentData?.appointment_date || null,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Error inserting patient to archive:', insertError);
      throw new Error(`Failed to archive patient: ${insertError.message}`);
    }

    // 3. Update check_ins record status to 'archived'
    const { error: updateError } = await supabase
      .from('check_ins')
      .update({ status: 'archived' })
      .eq('id', patientId);

    if (updateError) {
      console.error('Error updating check_in status:', updateError);
      throw new Error(`Failed to update patient status: ${updateError.message}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Archive patient error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Books an appointment for a patient and archives them from the dashboard
 */
export async function bookAppointmentAndArchive(patientId: string, appointmentDetails: any) {
  try {
    // 1. Create the appointment
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        patient_id: patientId,
        staff_id: appointmentDetails.staff_id,
        appointment_date: appointmentDetails.appointment_date,
        status: 'scheduled',
        notes: appointmentDetails.notes || '',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (appointmentError) {
      console.error('Error creating appointment:', appointmentError);
      throw new Error(`Failed to create appointment: ${appointmentError.message}`);
    }

    // 2. Archive the patient with appointment details
    const archiveResult = await archivePatient(patientId, appointment);
    
    if (!archiveResult.success) {
      throw new Error(archiveResult.error || 'Failed to archive patient');
    }

    return { success: true, appointment };
  } catch (error: any) {
    console.error('Book appointment and archive error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Checks if a patient exists in the archive (patients table)
 */
export async function isPatientArchived(patientId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('id')
      .eq('id', patientId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking if patient is archived:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking patient archive status:', error);
    return false;
  }
} 