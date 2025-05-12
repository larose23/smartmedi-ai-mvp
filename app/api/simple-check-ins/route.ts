import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    // First ensure the table exists
    try {
      await supabase.rpc('execute_sql', {
        sql_query: `
          CREATE TABLE IF NOT EXISTS simple_check_in_logs (
            id SERIAL PRIMARY KEY,
            patient_name TEXT,
            form_data JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `
      });
    } catch (err) {
      console.warn('Failed to ensure table exists:', err);
    }
    
    // Try getting data via direct SQL for reliability
    try {
      const { data, error } = await supabase.rpc('execute_sql', {
        sql_query: `
          SELECT * FROM simple_check_in_logs 
          ORDER BY created_at DESC 
          LIMIT 100;
        `
      });
      
      if (error) {
        throw error;
      }
      
      return NextResponse.json(data || []);
    } catch (err) {
      console.error('Failed to retrieve data with direct SQL:', err);
      
      // Fallback to regular query
      const { data, error } = await supabase
        .from('simple_check_in_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) {
        throw error;
      }
      
      return NextResponse.json(data || []);
    }
  } catch (error) {
    console.error('Error fetching check-in logs:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve check-in logs' },
      { status: 500 }
    );
  }
} 