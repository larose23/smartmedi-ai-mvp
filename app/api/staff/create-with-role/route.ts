import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    console.log('Creating complete staff record with role...');
    
    // First, determine which columns are required by querying an existing record
    let requiredColumns = [];
    try {
      const { data: sampleStaff, error: queryError } = await supabase
        .from('staff')
        .select('*')
        .limit(1);
        
      if (queryError) {
        console.error('Error querying staff structure:', queryError);
      } else if (sampleStaff && sampleStaff.length > 0) {
        console.log('Detected staff table structure:', Object.keys(sampleStaff[0]));
        requiredColumns = Object.keys(sampleStaff[0]);
      }
    } catch (e) {
      console.error('Exception querying staff:', e);
    }
    
    // Default staff data with all possible fields
    const staffData = {
      id: '11111111-1111-1111-1111-111111111111',
      first_name: 'Auto',
      last_name: 'Assign',
      name: 'Auto Assign',
      role: 'System',
      department: 'General',
      job_title: 'Auto Assignment System',
      email: 'system@example.com',
      phone_number: '000-000-0000'
    };
    
    // Create staff record with all fields to satisfy constraints
    const { error: insertError } = await supabase
      .from('staff')
      .insert([staffData])
      .select();
      
    if (insertError) {
      if (insertError.message.includes('duplicate key')) {
        console.log('Staff record already exists, updating it');
        
        // Try to update the existing record instead
        const { error: updateError } = await supabase
          .from('staff')
          .update({
            role: 'System',
            department: 'General',
            name: 'Auto Assign'
          })
          .eq('id', '11111111-1111-1111-1111-111111111111');
          
        if (updateError) {
          console.error('Error updating staff record:', updateError);
          return NextResponse.json({ 
            success: false, 
            message: 'Failed to update staff record: ' + updateError.message 
          });
        } else {
          console.log('Successfully updated staff record');
          return NextResponse.json({ 
            success: true, 
            message: 'Staff record updated with required fields' 
          });
        }
      } else {
        console.error('Error creating staff record:', insertError);
        return NextResponse.json({ 
          success: false, 
          message: 'Failed to create staff record: ' + insertError.message 
        });
      }
    } else {
      console.log('Successfully created staff record with all fields');
      return NextResponse.json({ 
        success: true, 
        message: 'Staff record created successfully' 
      });
    }
  } catch (error) {
    console.error('Exception in create-with-role endpoint:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
} 