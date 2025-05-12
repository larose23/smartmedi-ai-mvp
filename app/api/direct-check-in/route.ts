import { NextResponse } from 'next/server';
import { supabase, refreshSchemaCache } from '@/lib/supabase';
import { initializeDatabase } from '@/lib/dbInit';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Direct check-in request:', body);

    // Validate required fields
    if (!body.patient_name || !body.symptoms) {
      return NextResponse.json(
        { error: 'Missing required fields: patient_name and symptoms' },
        { status: 400 }
      );
    }

    // Format symptoms as JSON if they're not already
    let symptoms;
    try {
      symptoms = typeof body.symptoms === 'string'
        ? JSON.parse(body.symptoms)
        : body.symptoms;
    } catch (err) {
      console.warn('Error parsing symptoms, using as-is:', err);
      symptoms = { text: body.symptoms };
    }
    
    // Try to create/get a patient record first
    let patientId;
    try {
      // Check if patient exists by name
      const { data: existingPatients, error: searchError } = await supabase
        .from('patients')
        .select('id')
        .eq('name', body.patient_name)
        .limit(1);

      if (!searchError && existingPatients && existingPatients.length > 0) {
        // Use existing patient ID
        patientId = existingPatients[0].id;
        console.log('Found existing patient with ID:', patientId);
      } else {
        // Create new patient
        const { data: newPatient, error: createError } = await supabase
          .from('patients')
          .insert([{ name: body.patient_name }])
          .select('id')
          .single();

        if (!createError && newPatient) {
          patientId = newPatient.id;
          console.log('Created new patient with ID:', patientId);
        } else {
          console.warn('Error creating patient:', createError);
          
          // Generate a UUID as fallback
          patientId = crypto.randomUUID();
          console.log('Using generated patient ID:', patientId);
        }
      }
    } catch (err) {
      console.error('Error handling patient record:', err);
      // Generate a UUID as fallback
      patientId = crypto.randomUUID();
      console.log('Using generated patient ID after error:', patientId);
    }

    // Prepare check-in data
    interface CheckInData {
      patient_id: string;
      symptoms: any;
      triage_score?: string;
      suggested_department?: string;
      estimated_wait_minutes?: number;
      potential_diagnoses?: string[];
      recommended_actions?: string[];
      risk_factors?: string[];
    }
    
    const checkInData: CheckInData = {
      patient_id: patientId,
      symptoms: symptoms,
    };

    // Try to add optional fields if available
    if (body.triage_score) checkInData.triage_score = body.triage_score;
    if (body.suggested_department) checkInData.suggested_department = body.suggested_department;
    if (body.estimated_wait_minutes) checkInData.estimated_wait_minutes = body.estimated_wait_minutes;
    if (body.potential_diagnoses) checkInData.potential_diagnoses = body.potential_diagnoses;
    if (body.recommended_actions) checkInData.recommended_actions = body.recommended_actions;
    if (body.risk_factors) checkInData.risk_factors = body.risk_factors;

    // Ensure database schema is up to date before attempting inserts
    await initializeDatabase();
    await refreshSchemaCache();

    // Try check_ins table first
    try {
      console.log('Attempt 1: Insert into check_ins');
      const { error } = await supabase
        .from('check_ins')
        .insert([checkInData]);
      
      if (!error) {
        console.log('Successfully inserted into check_ins');
        return NextResponse.json({ 
          success: true,
          message: 'Check-in created successfully',
          patient_id: patientId
        });
      }
      
      console.log('Failed to insert into check_ins:', error);
      
      // If error is related to schema cache, refresh and retry
      if (error.message && (error.message.includes('schema cache') || 
                         error.message.includes('estimated_wait_minutes'))) {
        console.log('Schema cache issue detected, refreshing cache and retrying...');
        await refreshSchemaCache();
        
        // Retry insert after schema refresh
        const retryResult = await supabase
          .from('check_ins')
          .insert([checkInData]);
        
        if (!retryResult.error) {
          console.log('Success with check_ins insert after schema refresh!');
          return NextResponse.json({ 
            success: true,
            message: 'Check-in created successfully after schema refresh',
            patient_id: patientId
          });
        }
      }
    } catch (err) {
      console.error('Error inserting into check_ins:', err);
    }
    
    // Fallback to check_in_logs
    try {
      console.log('Attempt 2: Insert into check_in_logs');
      const timestamp = new Date().toISOString();
      
      const { error } = await supabase
        .from('check_in_logs')
        .insert([{
          patient_id: patientId,
          check_in_data: {
            patient_name: body.patient_name,
            patient_id: patientId,
            symptoms: symptoms,
            triage_data: {
              triage_score: body.triage_score || 'Medium',
              suggested_department: body.suggested_department || 'General Medicine',
              estimated_wait_minutes: body.estimated_wait_minutes || 30,
              potential_diagnoses: body.potential_diagnoses || ['Evaluation needed'],
              recommended_actions: body.recommended_actions || ['Consult with doctor'],
              risk_factors: body.risk_factors || ['None reported']
            },
            created_at: timestamp
          }
        }]);
      
      if (!error) {
        console.log('Successfully inserted into check_in_logs');
        return NextResponse.json({ 
          success: true,
          message: 'Check-in logged successfully',
          patient_id: patientId
        });
      }
      
      console.log('Failed to insert into check_in_logs:', error);
    } catch (err) {
      console.error('Error inserting into check_in_logs:', err);
    }
    
    // Last resort - try creating tables directly via SQL
    try {
      console.log('Attempt 3: Creating tables directly');
      
      // Create check_ins table if it doesn't exist
      await supabase.rpc('execute_sql', {
        sql_query: `
          CREATE TABLE IF NOT EXISTS check_ins (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            patient_id TEXT NOT NULL,
            symptoms JSONB NOT NULL,
            triage_score TEXT,
            suggested_department TEXT,
            estimated_wait_minutes INTEGER DEFAULT 30,
            potential_diagnoses TEXT[],
            recommended_actions TEXT[],
            risk_factors TEXT[],
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )
        `
      });
      
      // Explicitly refresh schema cache after direct table creation
      await refreshSchemaCache();
      
      // Try a minimal insert again
      const { error } = await supabase
        .from('check_ins')
        .insert([{
          patient_id: patientId,
          symptoms: symptoms
        }]);
      
      if (!error) {
        console.log('Successfully inserted after creating table');
        return NextResponse.json({ 
          success: true,
          message: 'Check-in created with minimal data',
          patient_id: patientId
        });
      }
      
      console.log('Still failed to insert:', error);
    } catch (err) {
      console.error('Error with direct table creation:', err);
    }
    
    // All attempts failed
    return NextResponse.json({ 
      error: 'Failed to process check-in',
      patient_id: patientId
    }, { status: 500 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 