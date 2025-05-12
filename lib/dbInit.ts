import { supabase, refreshSchemaCache } from './supabase';
import { fixSchema } from './fix-schema';

// Function to check if execute_sql RPC is available
async function isExecuteSqlAvailable() {
  try {
    const { error } = await supabase.rpc('execute_sql', { sql_query: 'SELECT 1' });
    if (error && (error.code === 'PGRST202' || error.message.includes("function public.execute_sql"))) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}

// Function to initialize database schema
export async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Call our comprehensive schema fix endpoint
    try {
      // Only run this in client-side contexts
      if (typeof window !== 'undefined') {
        console.log('Running comprehensive schema fix...');
        const response = await fetch('/api/appointments/fix-schema', { method: 'POST' });
        const result = await response.json();
        console.log('Schema fix result:', result);
      } else {
        console.log('Skipping schema fix - server-side context');
      }
    } catch (fixError) {
      console.error('Schema fix error:', fixError);
    }
    
    // Check if we can use execute_sql
    const rpcAvailable = await isExecuteSqlAvailable();
    
    if (rpcAvailable) {
      // Try direct SQL execution to create tables
      try {
        console.log('Creating check_ins table if not exists');
        await supabase.rpc('execute_sql', {
          sql_query: `
            CREATE TABLE IF NOT EXISTS check_ins (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              full_name TEXT NOT NULL,
              date_of_birth TEXT,
              contact_info TEXT,
              primary_symptom TEXT,
              additional_symptoms TEXT[],
              department TEXT,
              triage_score TEXT,
              priority_level TEXT,
              symptoms JSONB,
              estimated_wait_minutes INTEGER DEFAULT 30,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
          `
        });
        
        console.log('Creating check_in_logs table if not exists');
        await supabase.rpc('execute_sql', {
          sql_query: `
            CREATE TABLE IF NOT EXISTS check_in_logs (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              check_in_id UUID REFERENCES check_ins(id),
              action TEXT,
              details JSONB,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
          `
        });
        
        console.log('Tables created successfully');
      } catch (err) {
        console.warn('Error creating tables via RPC:', err);
      }
    } else {
      console.log('Execute SQL RPC not available, using standard API');
    }
    
    // Fallback approach using standard Supabase API
    try {
      // Verify check_ins table exists
      const { error: checkInsError } = await supabase
        .from('check_ins')
        .select('id')
        .limit(1);
        
      if (checkInsError) {
        console.log('Error querying check_ins table, might need to be created:', checkInsError);
      } else {
        console.log('Check-ins table exists');
      }
      
      // Refresh the schema cache to reflect any changes
      await refreshSchemaCache();
      
    } catch (err) {
      console.warn('Error checking tables, proceeding with app anyway:', err);
    }
    
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    return false;
  }
} 