/**
 * Test Suite for Appointment–Archive Linkage
 * 
 * This test suite verifies that:
 * 1. A patient gets properly archived after booking an appointment
 * 2. All patient fields are correctly preserved in the archive
 * 3. The appointment_id and archived_at fields are properly set
 */

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase client for tests
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

describe('Appointment–Archive Linkage', () => {
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
  });
  
  // Clean up: Remove test data after tests
  afterAll(async () => {
    // Remove test patient from patients table
    await supabase.from('patients').delete().eq('id', testPatientId);
    
    // Remove test appointment if it exists
    if (testAppointmentId) {
      await supabase.from('appointments').delete().eq('id', testAppointmentId);
    }
  });
  
  test('Should correctly archive patient after booking appointment', async () => {
    // 1. Create a test appointment
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
    
    // 2. Call the archive API
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
    
    // 3. Verify patient is archived correctly
    const { data: archivedPatient, error: archiveError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', testPatientId)
      .single();
      
    expect(archiveError).toBeNull();
    expect(archivedPatient).not.toBeNull();
    
    // 4. Verify all fields are preserved
    expect(archivedPatient.first_name).toBe('Test');
    expect(archivedPatient.last_name).toBe('Archive Patient');
    expect(archivedPatient.date_of_birth).toBe('1990-01-01');
    expect(archivedPatient.gender).toBe('Not Specified');
    expect(archivedPatient.contact).toBe('555-1234');
    expect(archivedPatient.primary_symptom).toBe('Headache');
    expect(archivedPatient.triage_score).toBe('Medium');
    
    // 5. Verify appointment_id and archived_at are set
    expect(archivedPatient.appointment_id).toBe(testAppointmentId);
    expect(archivedPatient.archived_at).not.toBeNull();
    
    // 6. Verify patient is removed from check_ins
    const { data: checkInData, error: checkInError } = await supabase
      .from('check_ins')
      .select('*')
      .eq('id', testPatientId);
      
    expect(checkInError).toBeNull();
    expect(checkInData.length).toBe(0);
  });
}); 