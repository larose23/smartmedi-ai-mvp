import { NextResponse } from 'next/server';
import { supabase, refreshSchemaCache } from '@/lib/supabase';
import { initializeDatabase } from '@/lib/dbInit';

// GET handler to fetch check-ins
export async function GET() {
  try {
    // Try to get data from check_ins table first
    let { data: checkInsData, error: checkInsError } = await supabase
      .from('check_ins')
      .select('*')
      .order('created_at', { ascending: false });
    
    // If error contains schema cache issue, try refreshing the cache
    if (checkInsError && checkInsError.message && 
        (checkInsError.message.includes('schema cache') || 
         checkInsError.message.includes('estimated_wait_minutes'))) {
      console.log('Schema cache issue detected, refreshing cache and retrying...');
      await refreshSchemaCache();
      await initializeDatabase(); // Ensure tables and columns exist
      
      // Retry after schema refresh
      const result = await supabase
        .from('check_ins')
        .select('*')
        .order('created_at', { ascending: false });
      
      checkInsData = result.data;
      checkInsError = result.error;
    }
    
    if (!checkInsError && checkInsData) {
      return NextResponse.json(checkInsData);
    }
    
    console.log('Failed to get data from check_ins, trying check_in_logs');
    
    // If check_ins failed, try to get from check_in_logs
    const { data: logsData, error: logsError } = await supabase
      .from('check_in_logs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (logsError) {
      console.error('Failed to get check-in data from any table:', logsError);
      throw new Error('Could not retrieve check-in data');
    }
    
    return NextResponse.json(logsData);
  } catch (error) {
    console.error('Check-ins API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST handler to create a new check-in
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    console.log('Processing check-in request with body:', body);
    
    // Validate required fields
    if (!body.patient_id || !body.symptoms) {
      return NextResponse.json(
        { error: 'Missing required fields: patient_id and symptoms' },
        { status: 400 }
      );
    }
    
    // Prepare check-in data with proper type
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
      patient_id: body.patient_id,
      symptoms: body.symptoms,
    };
    
    // Add optional fields if available
    if (body.triage_score) checkInData.triage_score = body.triage_score;
    if (body.suggested_department) checkInData.suggested_department = body.suggested_department;
    if (body.estimated_wait_minutes) checkInData.estimated_wait_minutes = body.estimated_wait_minutes;
    if (body.potential_diagnoses) checkInData.potential_diagnoses = body.potential_diagnoses;
    if (body.recommended_actions) checkInData.recommended_actions = body.recommended_actions;
    if (body.risk_factors) checkInData.risk_factors = body.risk_factors;
    
    // Ensure database schema is up to date before attempting inserts
    await initializeDatabase();
    await refreshSchemaCache();
    
    // Try direct insert first
    try {
      console.log('Attempt 1: Direct insert into check_ins');
      const { error } = await supabase
        .from('check_ins')
        .insert([checkInData]);
      
      if (!error) {
        console.log('Success with check_ins insert!');
        return NextResponse.json({ 
          success: true,
          message: 'Check-in created successfully'
        });
      }
      
      console.log('Check_ins insert failed with error:', error);
      
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
            message: 'Check-in created successfully after schema refresh'
          });
        }
      }
    } catch (err) {
      console.error('Check_ins insert exception:', err);
    }
    
    // Rest of the fallback logic...
    // Fallback to check_in_logs table
    try {
      console.log('Attempt 2: Fallback to check_in_logs');
      const { error } = await supabase
        .from('check_in_logs')
        .insert([{
          patient_id: body.patient_id,
          check_in_data: {
            patient_id: body.patient_id,
            symptoms: body.symptoms,
            triage_data: {
              triage_score: body.triage_score || 'Medium',
              suggested_department: body.suggested_department || 'General Medicine',
              estimated_wait_minutes: body.estimated_wait_minutes || 30,
              potential_diagnoses: body.potential_diagnoses || ['Evaluation needed'],
              recommended_actions: body.recommended_actions || ['Consult with doctor'],
              risk_factors: body.risk_factors || ['None reported']
            },
            created_at: new Date().toISOString()
          }
        }]);
      
      if (!error) {
        console.log('Success with check_in_logs insert!');
        return NextResponse.json({ 
          success: true,
          message: 'Check-in logged successfully'
        });
      }
      
      console.log('Check_in_logs insert failed with error:', error);
    } catch (err) {
      console.error('Check_in_logs insert exception:', err);
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
          patient_id: body.patient_id,
          symptoms: body.symptoms
        }]);
      
      if (!error) {
        console.log('Successfully inserted after creating table');
        return NextResponse.json({ 
          success: true,
          message: 'Check-in created with minimal data'
        });
      }
      
      console.log('Still failed to insert:', error);
    } catch (err) {
      console.error('Error with direct table creation:', err);
    }
    
    // All attempts failed
    return NextResponse.json(
      { error: 'All attempts to create check-in failed' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Check-in API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 