import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Get Supabase client with service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('Received data for check-in insertion:', data);
    
    // Build SQL query
    let query = `
      INSERT INTO check_ins (
        full_name, 
        date_of_birth, 
        contact_info, 
        primary_symptom, 
        department, 
        triage_score, 
        priority_level, 
        estimated_wait_minutes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      ) RETURNING id;
    `;
    
    // Execute query
    const { data: result, error } = await supabase
      .from('_postgrest_rpc')
      .select('*')
      .execute(query, {
        params: [
          data.full_name,
          data.date_of_birth,
          data.contact_info,
          data.primary_symptom,
          data.department,
          data.triage_score,
          data.priority_level,
          data.estimated_wait_minutes
        ]
      });
    
    if (error) {
      console.error('Error executing check-in insertion:', error);
      return NextResponse.json(
        { error: 'Failed to insert check-in' },
        { status: 500 }
      );
    }
    
    console.log('Successfully inserted check-in');
    
    return NextResponse.json({
      success: true,
      message: 'Check-in inserted successfully',
      id: result?.[0]?.id
    });
  } catch (error) {
    console.error('Error processing check-in insertion:', error);
    return NextResponse.json(
      { error: 'Failed to insert check-in' },
      { status: 500 }
    );
  }
} 