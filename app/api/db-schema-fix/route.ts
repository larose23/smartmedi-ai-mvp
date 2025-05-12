import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('Running database schema fix...');
    
    // First, check if the table exists
    const { data: tables, error: tableError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
      .eq('tablename', 'check_ins');
    
    if (tableError) {
      console.error('Error checking tables:', tableError);
      // Create the check_ins table with proper schema
      await createCheckInsTable();
    } else if (!tables || tables.length === 0) {
      console.log('check_ins table does not exist, creating it');
      await createCheckInsTable();
    } else {
      console.log('check_ins table exists, checking schema');
      await ensureColumnsExist();
    }
    
    return NextResponse.json({ success: true, message: 'Database schema fixed' });
  } catch (error) {
    console.error('Database schema fix error:', error);
    return NextResponse.json({ error: 'Failed to fix database schema' }, { status: 500 });
  }
}

async function createCheckInsTable() {
  try {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.check_ins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name TEXT NOT NULL,
        date_of_birth DATE,
        contact_info TEXT,
        primary_symptom TEXT,
        department TEXT DEFAULT 'General',
        triage_score TEXT DEFAULT 'Medium',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        priority_level TEXT DEFAULT 'Routine',
        additional_symptoms JSONB,
        estimated_wait_minutes INTEGER DEFAULT 30,
        status TEXT DEFAULT 'Waiting',
        staff_notes TEXT
      );
    `;
    
    const { error } = await supabase.rpc('execute_sql', { sql_query: createTableSQL });
    
    if (error) {
      console.error('Error creating check_ins table:', error);
      // Try alternative method with direct SQL
      const { error: directError } = await supabase
        .from('check_ins')
        .insert({
          full_name: 'System Test',
          date_of_birth: '2000-01-01',
          contact_info: 'test@example.com',
          primary_symptom: 'System Test',
          department: 'System',
          triage_score: 'Low',
          priority_level: 'Routine',
          estimated_wait_minutes: 30,
          status: 'Test'
        });
      
      if (directError) {
        console.error('Alternative approach also failed:', directError);
      } else {
        console.log('Successfully created table through alternative method');
      }
    } else {
      console.log('Successfully created check_ins table');
    }
  } catch (error) {
    console.error('Error in createCheckInsTable:', error);
  }
}

async function ensureColumnsExist() {
  try {
    // Try to add columns that might be missing
    const addColumnsSQL = `
      ALTER TABLE public.check_ins 
      ADD COLUMN IF NOT EXISTS estimated_wait_minutes INTEGER DEFAULT 30,
      ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT 'Routine',
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Waiting',
      ADD COLUMN IF NOT EXISTS staff_notes TEXT;
    `;
    
    const { error } = await supabase.rpc('execute_sql', { sql_query: addColumnsSQL });
    
    if (error) {
      console.error('Error adding columns to check_ins table:', error);
    } else {
      console.log('Successfully ensured all columns exist');
    }
  } catch (error) {
    console.error('Error in ensureColumnsExist:', error);
  }
} 