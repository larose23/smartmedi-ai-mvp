/**
 * Test Suite for Fixed Appointment–Archive Linkage
 * 
 * This test verifies that:
 * 1. Patients are properly archived using the delete-and-return pattern
 * 2. All patient fields are correctly preserved when archived
 * 3. The appointment_id and archived_at fields are properly set
 */

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase client for tests
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

describe('Fixed Appointment–Archive Linkage', () => {
  let testPatientId;
  let testAppointmentId;
  
  // Setup: Create a test patient in the check_ins table
  beforeAll(async () => {
    testPatientId = uuidv4();
    
    // Create a test patient in check_ins
    const { error: createError } = await supabase
      .from('check_ins')
      .insert([{
        id: testPatientId,
        full_name: 'Test Archive Patient',
        date_of_birth: '1990-01-01',
        gender: 'Not Specified',
        contact_info: '555-1234',
        primary_symptom: 'Headache',
        additional_symptoms: ['Fatigue', 'Fever'],
        triage_score: 'Medium',
        department: 'General',
        estimated_wait_minutes: 30,
        created_at: new Date().toISOString()
      }]);
      
    expect(createError).toBeNull();
    
    // Create a test appointment
    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 1); // Tomorrow
    
    const { data: appointmentData, error: appointmentError } = await supabase
      .from('appointments')
      .insert([{
        patient_id: testPatientId,
        staff_id: '11111111-1111-1111-1111-111111111111', // Default staff ID
        appointment_date: appointmentDate.toISOString(),
        status: 'scheduled',
        notes: 'Test appointment for archive linkage',
        department: 'General'
      }])
      .select();
      
    expect(appointmentError).toBeNull();
    expect(appointmentData).not.toBeNull();
    expect(appointmentData.length).toBe(1);
    
    testAppointmentId = appointmentData[0].id;
  });
  
  // Clean up: Remove test data after tests
  afterAll(async () => {
    // Remove test patient from patients table
    await supabase.from('patients').delete().eq('id', testPatientId);
    
    // Also clean up any remaining check_ins data if the test failed
    await supabase.from('check_ins').delete().eq('id', testPatientId);
    
    // Remove test appointment
    if (testAppointmentId) {
      await supabase.from('appointments').delete().eq('id', testAppointmentId);
    }
  });
  
  test('Should correctly archive patient using delete-and-return pattern', async () => {
    // Call the archive API
    const response = await fetch('/api/archive-patient', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patientId: testPatientId,
        appointmentId: testAppointmentId
      }),
    });
    
    const archiveResult = await response.json();
    expect(archiveResult.success).toBe(true);
    
    // Verify patient is now in the archive
    const { data: archivedPatient, error: archiveQueryError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', testPatientId)
      .single();
      
    expect(archiveQueryError).toBeNull();
    expect(archivedPatient).not.toBeNull();
    
    // Verify all fields are preserved
    expect(archivedPatient.first_name).toBe('Test');
    expect(archivedPatient.last_name).toBe('Archive Patient');
    expect(archivedPatient.date_of_birth).toBe('1990-01-01');
    expect(archivedPatient.gender).toBe('Not Specified');
    expect(archivedPatient.contact).toBe('555-1234');
    expect(archivedPatient.primary_symptom).toBe('Headache');
    expect(archivedPatient.triage_score).toBe('Medium');
    
    // Verify appointment_id and archived_at are set
    expect(archivedPatient.appointment_id).toBe(testAppointmentId);
    expect(archivedPatient.archived_at).not.toBeNull();
    
    // Verify patient is no longer in check_ins (using the delete-and-return pattern)
    const { data: checkInData, error: checkInError } = await supabase
      .from('check_ins')
      .select('*')
      .eq('id', testPatientId);
      
    expect(checkInError).toBeNull();
    expect(checkInData.length).toBe(0);
  });
  
  test('Should handle already archived patients gracefully', async () => {
    // Try to archive the same patient again (should return success but indicate already archived)
    const response = await fetch('/api/archive-patient', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patientId: testPatientId,
        appointmentId: testAppointmentId
      }),
    });
    
    const archiveResult = await response.json();
    
    // Should still be successful, but might indicate already archived
    expect(archiveResult.success).toBe(true);
    
    // Verify the patient is still in the archive (not duplicated or lost)
    const { data: archivedPatient, error: archiveQueryError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', testPatientId)
      .single();
      
    expect(archiveQueryError).toBeNull();
    expect(archivedPatient).not.toBeNull();
    expect(archivedPatient.appointment_id).toBe(testAppointmentId);
  });
}); 