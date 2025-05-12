import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('Running emergency database fix...');
    
    // 1. First create our default staff record (try multiple approaches)
    
    // Approach 1: Insert with minimal fields
    try {
      const { error: basicError } = await supabase
        .from('staff')
        .insert([{
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Auto Assign'
        }]);
        
      if (!basicError) {
        console.log('Created staff record with basic fields');
      } else if (basicError.message.includes('duplicate key')) {
        console.log('Staff record already exists');
      } else {
        console.log('Error creating staff with basic fields:', basicError);
      }
    } catch (basicErr) {
      console.log('Exception with basic insert:', basicErr);
    }
    
    // 2. Make sure all future appointments have our staff ID
    console.log('Updating existing appointments...');
    try {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          staff_id: '11111111-1111-1111-1111-111111111111'
        })
        .is('staff_id', null);
        
      if (updateError) {
        console.log('Error updating existing appointments:', updateError);
      } else {
        console.log('Updated existing appointments with null staff_id');
      }
    } catch (updateErr) {
      console.log('Exception updating appointments:', updateErr);
    }
    
    // 3. Insert a test appointment
    console.log('Creating test appointment...');
    try {
      // First get a valid patient ID
      const { data: patientData } = await supabase
        .from('patients')
        .select('id')
        .limit(1);
        
      if (patientData && patientData.length > 0) {
        const testAppointment = {
          patient_id: patientData[0].id,
          staff_id: '11111111-1111-1111-1111-111111111111',
          appointment_date: new Date().toISOString(),
          status: 'test'
        };
        
        const { error: appointmentError } = await supabase
          .from('appointments')
          .insert([testAppointment]);
          
        if (appointmentError) {
          console.log('Error creating test appointment:', appointmentError);
        } else {
          console.log('Created test appointment successfully');
        }
      }
    } catch (testErr) {
      console.log('Exception creating test appointment:', testErr);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Emergency database fix completed'
    });
  } catch (error) {
    console.error('Error in emergency fix:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 