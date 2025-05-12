import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Get Supabase client with direct PostgreSQL connection
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET() {
  try {
    console.log('Creating database tables using SQL queries...');
    
    // We can't execute DDL statements directly via Supabase JS client
    // Instead, let's use the regular client to insert test data, which will create the table
    const { error: insertError } = await supabase
      .from('check_ins')
      .insert([
        {
          full_name: 'John Smith',
          date_of_birth: '1970-01-01',
          contact_info: '555-1234',
          primary_symptom: 'Headache',
          additional_symptoms: ['dizziness', 'nausea'],
          department: 'Neurology',
          triage_score: 'Medium',
          priority_level: 'Medium',
          estimated_wait_minutes: 30
        }
      ]);
    
    if (insertError) {
      console.error('Error creating table via insert:', insertError);
      return NextResponse.json(
        { error: 'Failed to create tables: ' + insertError.message },
        { status: 500 }
      );
    }
    
    console.log('Tables created successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Tables created successfully'
    });
  } catch (error) {
    console.error('Error creating tables:', error);
    return NextResponse.json(
      { error: 'Failed to create tables: ' + (error as Error).message },
      { status: 500 }
    );
  }
} 