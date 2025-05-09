import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    console.log('[Archive API] Processing archive request');
    const requestData = await request.json();
    
    const { patientId, appointmentId } = requestData;
    
    console.log('[Archive API] Called with patientId:', patientId, 'appointmentId:', appointmentId);
    
    if (!patientId) {
      return NextResponse.json({ success: false, error: 'Patient ID is required' }, { status: 400 });
    }
    
    // Initialize Supabase client
    const supabase = createRouteHandlerClient({ cookies });

    // Use the transaction function to archive
    console.log('[Archive API] Calling archive_check_in function');
    const { data: functionResult, error: functionError } = await supabase
      .rpc('archive_check_in', {
        p_check_in_id: patientId,
        p_appointment_id: appointmentId
      });

    if (functionError) {
      console.error('[Archive API] Transaction function error:', functionError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to archive patient',
        details: functionError
      }, { status: 500 });
    }
    
    console.log('[Archive API] Archive function call successful:', functionResult);
    
    // Verify the patient was archived correctly
    const { data: verifyData, error: verifyError } = await supabase
      .from('patients')
      .select('id, first_name, last_name, name, date_of_birth, gender, contact, archived_at')
      .eq('id', patientId)
      .single();
      
    if (verifyError) {
      console.error('[Archive API] Error verifying archive:', verifyError);
      return NextResponse.json({ 
        success: false, 
        error: 'Archive verification failed',
        details: verifyError
      }, { status: 500 });
    }
    
    console.log('[Archive API] Archive verification successful:', verifyData);
    
    // Also verify the check-in status was updated
    const { data: checkInStatus, error: statusError } = await supabase
      .from('check_ins')
      .select('id, status')
      .eq('id', patientId)
      .maybeSingle();
      
    if (statusError) {
      console.error('[Archive API] Error verifying check-in status:', statusError);
    } else if (checkInStatus) {
      console.log('[Archive API] Check-in status updated to:', checkInStatus.status);
    } else {
      console.log('[Archive API] Check-in no longer exists or was not found');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Patient archived successfully',
      patient: verifyData
    });
    
  } catch (error) {
    console.error('[Archive API] Uncaught error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error
    }, { status: 500 });
  }
} 