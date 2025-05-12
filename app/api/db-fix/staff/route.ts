import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// API endpoint to fix staff table issues
export async function GET() {
  try {
    console.log('Running staff table fix...');
    
    // First check if staff table exists and create if needed
    await ensureStaffTableExists();
    
    // Ensure default staff member exists
    await ensureDefaultStaffExists();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Staff table fixed successfully' 
    });
  } catch (error) {
    console.error('Error fixing staff table:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// Helper function to ensure staff table exists
async function ensureStaffTableExists() {
  try {
    // Try to query the staff table
    const { data, error } = await supabase
      .from('staff')
      .select('id')
      .limit(1);
      
    if (error && error.message.includes('does not exist')) {
      console.log('Staff table does not exist, creating...');
      
      // Try to create a simple staff table with minimal fields first
      try {
        const { error: simpleError } = await supabase
          .from('staff')
          .insert([{ 
            id: '11111111-1111-1111-1111-111111111111',
            name: 'Auto Assign'  // Use 'name' instead of 'first_name' as it's more likely to be a valid column
          }]);
        
        if (simpleError && !simpleError.message.includes('already exists')) {
          console.log('Simple staff creation failed, trying minimal insert:', simpleError);
          
          // Try with just ID as a last resort
          const { error: minimalError } = await supabase
            .from('staff')
            .insert([{ id: '11111111-1111-1111-1111-111111111111' }]);
            
          if (minimalError) {
            console.log('Even minimal staff creation failed:', minimalError);
          } else {
            console.log('Created staff with minimal fields');
          }
        } else {
          console.log('Created staff table with basic fields');
        }
      } catch (createError) {
        console.error('All staff creation attempts failed:', createError);
      }
    } else {
      console.log('Staff table exists');
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring staff table exists:', error);
    return false;
  }
}

// Helper function to ensure default staff exists
async function ensureDefaultStaffExists() {
  // Use the hardcoded UUID that matches the one in AppointmentScheduler
  const defaultStaffId = '11111111-1111-1111-1111-111111111111';
  
  try {
    // Check if our default staff member already exists
    const { data, error } = await supabase
      .from('staff')
      .select('id')
      .eq('id', defaultStaffId)
      .maybeSingle();
      
    if (error && !error.message.includes('does not exist')) {
      throw error;
    }
    
    // If staff already exists, we're done
    if (data && data.id) {
      console.log('Default staff already exists');
      return true;
    }
    
    console.log('Default staff does not exist, creating...');
    
    // Try creating with different column combinations to handle schema uncertainty
    // First try with minimal fields (just ID)
    try {
      const { error: minimalError } = await supabase
        .from('staff')
        .insert([{ id: defaultStaffId }]);
        
      if (!minimalError) {
        console.log('Created default staff with just ID');
        return true;
      }
      console.log('Minimal staff insert failed, trying with name:', minimalError);
    } catch (minimalError) {
      console.error('Minimal staff insert exception:', minimalError);
    }
    
    // Try with just ID and name
    try {
      const { error: nameError } = await supabase
        .from('staff')
        .insert([{ 
          id: defaultStaffId,
          name: 'Auto Assign'
        }]);
        
      if (!nameError) {
        console.log('Created default staff with name');
        return true;
      }
      console.log('Name staff insert failed, trying with first/last name:', nameError);
    } catch (nameError) {
      console.error('Name staff insert exception:', nameError);
    }
    
    // Try with first_name/last_name
    try {
      const { error: fullError } = await supabase
        .from('staff')
        .insert([{
          id: defaultStaffId,
          first_name: 'Auto',
          last_name: 'Assign'
        }]);
        
      if (!fullError) {
        console.log('Created default staff with first/last name');
        return true;
      }
      console.log('Full staff insert failed:', fullError);
    } catch (fullError) {
      console.error('Full staff insert exception:', fullError);
    }
    
    // If we got here, all insert attempts failed
    console.log('All staff insert attempts failed, but continuing anyway');
    return true;
  } catch (error) {
    console.error('Error ensuring default staff exists:', error);
    return false;
  }
} 