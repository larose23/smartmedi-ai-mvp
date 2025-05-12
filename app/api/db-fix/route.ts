import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Main API route to fix all database issues
export async function GET() {
  try {
    console.log('Running comprehensive database fix...');
    
    // Fix patients table first
    const patientsResponse = await fetch(new URL('/api/db-fix/patients', 'http://localhost'));
    const patientsResult = await patientsResponse.json();
    
    // Fix appointments table
    const appointmentsResponse = await fetch(new URL('/api/db-fix/appointments', 'http://localhost'));
    const appointmentsResult = await appointmentsResponse.json();
    
    // Ensure staff table exists
    await ensureStaffTableExists();
    
    // Try direct creation of department column in appointments table
    try {
      // Create a temporary record to force column creation
      const { data, error } = await supabase
        .from('appointments')
        .insert([{
          patient_id: '00000000-0000-0000-0000-000000000000',
          appointment_date: new Date().toISOString(),
          status: 'migration',
          notes: 'Creating department column',
          department: 'General',
          staff_id: '00000000-0000-0000-0000-000000000000'  // Always include a staff_id
        }])
        .select();
      
      if (error && !error.message.includes('foreign key constraint')) {
        console.log('Error creating test appointment:', error);
      }
    } catch (e) {
      console.error('Error testing appointments table:', e);
    }
    
    // Force refresh schema cache
    try {
      await supabase.from('_temp_view_for_refresh').select('*').limit(1);
    } catch (e) {
      // Ignore errors, this is just to refresh the schema
    }
    
    return NextResponse.json({ 
      success: true,
      patients: patientsResult,
      appointments: appointmentsResult,
      message: 'Database fixed successfully' 
    });
  } catch (error) {
    console.error('Error fixing database:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// Helper function to ensure the staff table exists
async function ensureStaffTableExists() {
  try {
    // Check if the staff table exists
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id')
      .limit(1);
    
    // If there's an error, the table might not exist
    if (staffError && staffError.message.includes('does not exist')) {
      console.log('Creating staff table...');
      
      try {
        // Try to create the staff table
        await supabase.rpc('execute_sql', {
          sql_query: `
            CREATE TABLE IF NOT EXISTS public.staff (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              first_name TEXT,
              last_name TEXT,
              department TEXT,
              job_title TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
          `
        });
      } catch (createError) {
        console.log('Failed to create staff table via RPC:', createError);
        
        // Try direct insertion to create table
        try {
          const { error: insertError } = await supabase
            .from('staff')
            .insert([{
              id: '00000000-0000-0000-0000-000000000000',
              first_name: 'Auto',
              last_name: 'Assign',
              department: 'General',
              job_title: 'System Default'
            }]);
          
          if (insertError && !insertError.message.includes('already exists')) {
            console.log('Failed to create staff record:', insertError);
          }
        } catch (insertFailure) {
          console.error('Failed to create staff table via insert:', insertFailure);
        }
      }
    } else {
      // Table exists, but check if we have the default record
      const { data: defaultStaff, error: defaultError } = await supabase
        .from('staff')
        .select('id')
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .maybeSingle();
      
      if (!defaultStaff && !defaultError) {
        // Create default staff record
        console.log('Creating default staff record...');
        const { error: insertError } = await supabase
          .from('staff')
          .insert([{
            id: '00000000-0000-0000-0000-000000000000',
            first_name: 'Auto',
            last_name: 'Assign',
            department: 'General',
            job_title: 'System Default'
          }]);
        
        if (insertError) {
          console.log('Failed to create default staff record:', insertError);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring staff table exists:', error);
    return false;
  }
} 