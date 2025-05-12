import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    console.log('Creating default staff record for appointment booking...');
    
    // This is the ID we'll use for all auto-assigned appointments
    const defaultStaffId = '11111111-1111-1111-1111-111111111111';
    
    // First check if this record already exists
    const { data: existingStaff, error: checkError } = await supabase
      .from('staff')
      .select('id')
      .eq('id', defaultStaffId)
      .maybeSingle();
      
    if (existingStaff?.id) {
      console.log('Default staff record already exists');
      return NextResponse.json({ success: true, message: 'Staff record already exists' });
    }
    
    // Now we need to try different approaches based on the schema
    let created = false;
    
    // Attempt 1: Try with name field
    try {
      const { error: nameError } = await supabase
        .from('staff')
        .insert([{ id: defaultStaffId, name: 'Auto Assign' }]);
        
      if (!nameError) {
        console.log('Created staff with name field');
        created = true;
      }
    } catch (nameErr) {
      console.log('Error creating with name field:', nameErr);
    }
    
    // Attempt 2: Try with first_name/last_name fields
    if (!created) {
      try {
        const { error: nameError } = await supabase
          .from('staff')
          .insert([{ 
            id: defaultStaffId, 
            first_name: 'Auto', 
            last_name: 'Assign',
            department: 'General'
          }]);
          
        if (!nameError) {
          console.log('Created staff with first_name/last_name fields');
          created = true;
        }
      } catch (nameErr) {
        console.log('Error creating with first_name/last_name fields:', nameErr);
      }
    }
    
    // Attempt 3: Try with minimal fields
    if (!created) {
      try {
        const { error: minimalError } = await supabase
          .from('staff')
          .insert([{ id: defaultStaffId }]);
          
        if (!minimalError) {
          console.log('Created staff with just ID field');
          created = true;
        }
      } catch (minErr) {
        console.log('Error creating with minimal fields:', minErr);
      }
    }
    
    if (created) {
      return NextResponse.json({ success: true, message: 'Staff record created' });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Could not create staff record, but continuing' 
      });
    }
  } catch (error) {
    console.error('Error in create-default staff endpoint:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
} 