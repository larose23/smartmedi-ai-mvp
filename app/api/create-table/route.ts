import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('Initializing database for SmartMedi-AI application...');
    
    // First, try to query the check_ins table to see if it exists
    const { error: checkError } = await supabase
      .from('check_ins')
      .select('id')
      .limit(1);
    
    if (checkError) {
      console.log('Creating tables for first-time setup:', checkError.message);
      
      // Create tables using SQL - use the PostgreSQL client directly
      const { error: createError } = await supabase.rpc('create_tables');
      
      if (createError) {
        console.error('Error creating tables via RPC:', createError);
        
        // Fallback: Try inserting into check_ins directly and let Supabase create it
        const { error: insertError } = await supabase
          .from('check_ins')
          .insert([
            {
              full_name: 'Sarah Johnson',
              date_of_birth: '1980-01-01',
              contact_info: '555-1234',
              primary_symptom: 'Chest Pain',
              additional_symptoms: ['shortness of breath', 'dizziness'],
              department: 'Emergency Medicine',
              triage_score: 'High',
              priority_level: 'Urgent',
              estimated_wait_minutes: 15
            }
          ]);
        
        if (insertError) {
          console.error('Failed to insert sample data:', insertError);
          return NextResponse.json(
            { error: 'Failed to initialize database' },
            { status: 500 }
          );
        }
      }
      
      console.log('Successfully created tables');
    } else {
      console.log('Tables already exist, ensuring proper structure...');
    }
    
    // Get current count of check-ins
    const { data: checkIns, error: countError } = await supabase
      .from('check_ins')
      .select('*');
    
    const count = checkIns?.length || 0;
    
    // If we have no check-ins, add sample data
    if (count === 0) {
      const samplePatients = [
        {
          full_name: 'Sarah Johnson',
          date_of_birth: '1980-01-01',
          contact_info: '555-1234',
          primary_symptom: 'Chest Pain',
          additional_symptoms: ['shortness of breath', 'dizziness'],
          department: 'Emergency Medicine',
          triage_score: 'High',
          priority_level: 'Urgent',
          estimated_wait_minutes: 15
        },
        {
          full_name: 'Michael Smith',
          date_of_birth: '1990-01-01',
          contact_info: '555-5678',
          primary_symptom: 'Headache',
          additional_symptoms: ['nausea', 'sensitivity to light'],
          department: 'Neurology',
          triage_score: 'Medium',
          priority_level: 'Medium',
          estimated_wait_minutes: 30
        },
        {
          full_name: 'David Williams',
          date_of_birth: '1975-03-15',
          contact_info: '555-9012',
          primary_symptom: 'Back Pain',
          additional_symptoms: ['numbness', 'difficulty walking'],
          department: 'Orthopedics',
          triage_score: 'Medium',
          priority_level: 'Medium',
          estimated_wait_minutes: 30
        }
      ];
      
      const { error: insertError } = await supabase
        .from('check_ins')
        .insert(samplePatients);
      
      if (insertError) {
        console.error('Error inserting sample data:', insertError);
      } else {
        console.log('Successfully inserted sample data');
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      checkInsCount: count
    });
  } catch (error) {
    console.error('Error initializing database:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database' },
      { status: 500 }
    );
  }
} 