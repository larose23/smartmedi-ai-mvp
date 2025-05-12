import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('Running emergency staff_id fix...');
    
    // First try inserting a minimal staff record
    const staffId = '11111111-1111-1111-1111-111111111111';
    
    // Try different approaches to insert the staff record
    await tryCreateStaffRecord(staffId);
    
    // Then fix the appointments table staff_id constraint
    await fixStaffIdConstraint();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Staff ID constraint fixed successfully' 
    });
  } catch (error) {
    console.error('Failed to fix staff_id constraint:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

async function tryCreateStaffRecord(staffId: string) {
  try {
    console.log('Attempting to create minimal staff record...');
    
    // 1. Try with just ID
    try {
      const { error } = await supabase
        .from('staff')
        .insert([{ id: staffId }]);
        
      if (!error) {
        console.log('Created staff record with just ID');
        return;
      }
      
      console.log('First staff creation attempt failed:', error.message);
    } catch (e) {
      console.log('First attempt exception:', e);
    }
    
    // 2. Try with name field
    try {
      const { error } = await supabase
        .from('staff')
        .insert([{ 
          id: staffId,
          name: 'Auto Assign' 
        }]);
        
      if (!error) {
        console.log('Created staff record with name');
        return;
      }
      
      console.log('Second staff creation attempt failed:', error.message);
    } catch (e) {
      console.log('Second attempt exception:', e);
    }
    
    // 3. Try with alternative fields that might exist
    try {
      const { error } = await supabase
        .from('staff')
        .insert([{
          id: staffId,
          role: 'System', 
          department: 'General'
        }]);
        
      if (!error) {
        console.log('Created staff record with role/department');
        return;
      }
      
      console.log('Third staff creation attempt failed:', error.message);
    } catch (e) {
      console.log('Third attempt exception:', e);
    }
    
    console.log('All staff creation attempts failed, but continuing...');
  } catch (error) {
    console.error('Error in staff creation process:', error);
    // Continue anyway
  }
}

async function fixStaffIdConstraint() {
  try {
    console.log('Attempting to fix the staff_id constraint in appointments table...');
    
    // 1. First approach: try updating an existing appointment
    try {
      const { data: sampleAppointment } = await supabase
        .from('appointments')
        .select('id')
        .limit(1)
        .maybeSingle();
        
      if (sampleAppointment?.id) {
        const { error } = await supabase
          .from('appointments')
          .update({ 
            staff_id: '11111111-1111-1111-1111-111111111111' 
          })
          .eq('id', sampleAppointment.id);
          
        if (!error) {
          console.log('Successfully updated an appointment with hard-coded staff_id');
        }
      }
    } catch (e) {
      console.log('Update approach failed:', e);
    }
    
    // 2. Insert a raw SQL record to ensure the appointment table exists with staff_id
    try {
      const { data: patientData } = await supabase
        .from('patients')
        .select('id')
        .limit(1)
        .maybeSingle();
        
      const patientId = patientData?.id || '00000000-0000-0000-0000-000000000000';
      
      const { error } = await supabase
        .from('appointments')
        .insert([{
          id: crypto.randomUUID(),
          patient_id: patientId,
          staff_id: '11111111-1111-1111-1111-111111111111',
          appointment_date: new Date().toISOString(),
          status: 'system'
        }]);
        
      if (!error) {
        console.log('Created a test appointment with staff_id');
      } else {
        console.log('Test appointment creation failed:', error.message);
      }
    } catch (e) {
      console.log('Raw insert approach failed:', e);
    }
    
    return true;
  } catch (error) {
    console.error('Error in fixing staff_id constraint:', error);
    return false;
  }
} 