import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    console.log('Attempting to insert an appointment with the default staff ID...');
    
    // 1. First create a test appointment to see what columns are required
    try {
      // Find an existing patient ID to use
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('id')
        .limit(1);
        
      if (patientError || !patientData || patientData.length === 0) {
        console.error('Error getting a patient record:', patientError);
        return NextResponse.json({
          success: false,
          message: 'Could not find a patient record to use'
        });
      }
      
      // Create a basic appointment with the minimum required fields
      const appointmentData = {
        patient_id: patientData[0].id,
        staff_id: '11111111-1111-1111-1111-111111111111',
        appointment_date: new Date().toISOString(),
        status: 'test'
      };
      
      const { error: insertError } = await supabase
        .from('appointments')
        .insert([appointmentData]);
        
      if (insertError) {
        console.error('Error creating test appointment:', insertError);
        
        // Try additional properties if required
        if (insertError.message.includes('violates not-null constraint')) {
          // Try with more fields
          const enhancedData = {
            ...appointmentData,
            notes: 'Test appointment',
            department: 'General'
          };
          
          const { error: retryError } = await supabase
            .from('appointments')
            .insert([enhancedData]);
            
          if (retryError) {
            console.error('Error with enhanced appointment data:', retryError);
          } else {
            console.log('Successfully created appointment with enhanced data');
          }
        }
      } else {
        console.log('Successfully created test appointment');
      }
    } catch (e) {
      console.error('Exception creating test appointment:', e);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Attempted to fix foreign key constraint'
    });
  } catch (error) {
    console.error('Exception in fix-fk endpoint:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 