import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { patientId, checkInId, gender } = await request.json();
    console.log('Updating gender for patient:', patientId, 'to:', gender);

    let success = false;
    let errors = [];

    // Update in patients table if patientId is provided
    if (patientId) {
      const { error: patientUpdateError } = await supabase
        .from('patients')
        .update({ gender })
        .eq('id', patientId);
      
      if (patientUpdateError) {
        console.error('Error updating patient gender:', patientUpdateError);
        errors.push(patientUpdateError.message);
      } else {
        success = true;
      }
    }

    // Update in check_ins table if checkInId is provided
    if (checkInId) {
      const { error: checkInUpdateError } = await supabase
        .from('check_ins')
        .update({ gender })
        .eq('id', checkInId);
      
      if (checkInUpdateError) {
        console.error('Error updating check-in gender:', checkInUpdateError);
        errors.push(checkInUpdateError.message);
      } else {
        success = true;
      }
    }

    return NextResponse.json({
      success,
      errors: errors.length > 0 ? errors : null,
      message: success 
        ? 'Gender updated successfully' 
        : 'Failed to update gender'
    });
  } catch (error) {
    console.error('Error in gender update API:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
} 