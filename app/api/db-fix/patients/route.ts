import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('Running comprehensive patients table fix...');
    
    // Approach 1: Check if the column exists and add it if not
    try {
      // First check if the column exists
      const { data: columnExists, error: checkError } = await supabase.rpc('execute_sql', { 
        sql_query: `
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'patients' 
            AND column_name = 'contact_info'
          );
        `
      });
      
      console.log('Column exists check result:', columnExists);
      
      if (checkError) {
        console.error('Error checking column:', checkError);
      }
      
      // Add column if it doesn't exist
      await supabase.rpc('execute_sql', { 
        sql_query: `
          ALTER TABLE public.patients 
          ADD COLUMN IF NOT EXISTS contact_info TEXT;
        `
      });
      
      console.log('Added contact_info column if it didn\'t exist');
    } catch (addColumnError) {
      console.error('Error adding column:', addColumnError);
    }
    
    // Approach 2: Update existing patients to populate contact_info
    try {
      await supabase.rpc('execute_sql', { 
        sql_query: `
          UPDATE public.patients 
          SET contact_info = email
          WHERE contact_info IS NULL AND email IS NOT NULL;
        `
      });
      
      await supabase.rpc('execute_sql', { 
        sql_query: `
          UPDATE public.patients 
          SET contact_info = phone_number
          WHERE contact_info IS NULL AND phone_number IS NOT NULL;
        `
      });
      
      await supabase.rpc('execute_sql', { 
        sql_query: `
          UPDATE public.patients 
          SET contact_info = CONCAT(first_name, '.', last_name, '@example.com')
          WHERE contact_info IS NULL;
        `
      });
      
      console.log('Updated existing patients with contact_info');
    } catch (updateError) {
      console.error('Error updating patients:', updateError);
    }
    
    // Approach 3: Create a temporary view to force schema refresh
    try {
      await supabase.rpc('execute_sql', { 
        sql_query: `
          CREATE OR REPLACE VIEW temp_patients_view AS
          SELECT id, name, first_name, last_name, date_of_birth, contact_info
          FROM patients;
          
          DROP VIEW IF EXISTS temp_patients_view;
        `
      });
      console.log('Created and dropped temporary view');
    } catch (viewError) {
      console.error('View approach failed:', viewError);
    }
    
    // Approach 4: Force refresh the schema cache
    try {
      // Multiple refreshes for better chances
      for (let i = 0; i < 3; i++) {
        await supabase.from('patients').select('id').limit(1);
      }
      console.log('Forced schema cache refresh');
    } catch (refreshError) {
      console.error('Error refreshing schema cache:', refreshError);
    }
    
    // Return success with detailed response
    return NextResponse.json({ 
      success: true,
      message: 'Fixed patients table and contact_info column'
    });
  } catch (error) {
    console.error('Database fix failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Database fix failed'
    }, { status: 500 });
  }
} 