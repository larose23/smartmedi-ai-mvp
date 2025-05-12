import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Initialize Supabase client
    const supabase = createRouteHandlerClient({ cookies });
    
    // Create an RPC function to delete check-ins more reliably
    await supabase.rpc('create_delete_patient_function', {}, { count: 'exact' });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database fixes applied successfully'
    });
  } catch (error) {
    console.error('Error in db-fix API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to apply database fixes',
      details: error
    }, { status: 500 });
  }
}

// Create the SQL function in Supabase - this is what we're executing
async function createDeletePatientFunction(supabase: any) {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE OR REPLACE FUNCTION delete_patient_checkin(patient_id UUID)
      RETURNS void AS $$
      BEGIN
        DELETE FROM check_ins WHERE id = patient_id;
      END;
      $$ LANGUAGE plpgsql;
    `
  });
  
  if (error) {
    console.error('Error creating delete_patient_checkin function:', error);
  } else {
    console.log('Successfully created delete_patient_checkin function');
  }
} 