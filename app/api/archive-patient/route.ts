import { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { successResponse, errorResponse, withErrorHandling } from '@/lib/api/routeHelpers';
import { HttpStatus } from '@/lib/api/types';

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    // Parse request data
    const requestData = await request.json();
    const { patientId, appointmentId } = requestData;
    
    // Validate required data
    if (!patientId) {
      return errorResponse(
        'Patient ID is required',
        HttpStatus.BAD_REQUEST
      );
    }
    
    // Initialize Supabase client with cookies for auth context
    const supabase = createRouteHandlerClient({ cookies });

    // Use the transaction function to archive
    const { data: functionResult, error: functionError } = await supabase
      .rpc('archive_check_in', {
        p_check_in_id: patientId,
        p_appointment_id: appointmentId
      });

    if (functionError) {
      return errorResponse(
        'Failed to archive patient',
        HttpStatus.INTERNAL_SERVER_ERROR,
        { details: functionError }
      );
    }
    
    // Verify the archive operation was successful
    const { data: verifyData, error: verifyError } = await supabase
      .from('patients')
      .select('id, first_name, last_name, name, date_of_birth, gender, contact, archived_at')
      .eq('id', patientId)
      .single();
      
    if (verifyError) {
      return errorResponse(
        'Archive verification failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
        { details: verifyError }
      );
    }
    
    return successResponse({
      success: true,
      patient: verifyData
    });
  });
} 