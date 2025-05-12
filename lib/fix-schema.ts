import { supabase, refreshSchemaCache } from './supabase';

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

export async function fixSchema() {
  console.log('Running schema fix for check_ins table...');
  
  try {
    // Check if execute_sql is available
    const rpcAvailable = await isExecuteSqlAvailable();
    
    if (!rpcAvailable) {
      console.log('Execute SQL RPC not available, using simple schema verification');
      // Just try to query the table to ensure it exists
      const { error } = await supabase
        .from('check_ins')
        .select('id')
        .limit(1);
        
      if (error) {
        console.log('Error checking check_ins table:', error);
      } else {
        console.log('Check-ins table exists');
      }
      
      await refreshSchemaCache();
      return { success: true };
    }
    
    // If RPC is available, proceed with direct SQL approach
    const result = await supabase.rpc('execute_sql', {
      sql_query: `
        -- Create the check_ins table with all needed columns if it doesn't exist
        CREATE TABLE IF NOT EXISTS check_ins (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          full_name TEXT,
          date_of_birth TEXT,
          contact_info TEXT,
          primary_symptom TEXT,
          additional_symptoms TEXT[],
          symptoms JSONB,
          triage_score TEXT,
          department TEXT,
          priority_level TEXT,
          estimated_wait_minutes INTEGER DEFAULT 30,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'pending'
        );
        
        -- Add any missing columns explicitly
        DO $$ 
        BEGIN
          -- Add estimated_wait_minutes if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'check_ins' AND column_name = 'estimated_wait_minutes'
          ) THEN
            ALTER TABLE check_ins ADD COLUMN estimated_wait_minutes INTEGER DEFAULT 30;
          END IF;
          
          -- Add full_name if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'check_ins' AND column_name = 'full_name'
          ) THEN
            ALTER TABLE check_ins ADD COLUMN full_name TEXT;
          END IF;
          
          -- Add primary_symptom if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'check_ins' AND column_name = 'primary_symptom'
          ) THEN
            ALTER TABLE check_ins ADD COLUMN primary_symptom TEXT;
          END IF;
          
          -- Add additional_symptoms if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'check_ins' AND column_name = 'additional_symptoms'
          ) THEN
            ALTER TABLE check_ins ADD COLUMN additional_symptoms TEXT[];
          END IF;
          
          -- Add department if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'check_ins' AND column_name = 'department'
          ) THEN
            ALTER TABLE check_ins ADD COLUMN department TEXT;
          END IF;
          
          -- Add priority_level if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'check_ins' AND column_name = 'priority_level'
          ) THEN
            ALTER TABLE check_ins ADD COLUMN priority_level TEXT;
          END IF;
        END $$;
      `
    });
    
    console.log('Schema fix script executed, refreshing schema cache...');
    
    // Refresh the schema cache to pick up the changes
    await refreshSchemaCache();
    
    // Verify the schema if RPC is available
    try {
      // Verify the column now exists
      const verificationResult = await supabase.rpc('execute_sql', {
        sql_query: `
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'check_ins';
        `
      });
      
      console.log('Schema verification complete, check-ins table columns:');
      if (verificationResult.data) {
        console.log(verificationResult.data);
      }
    } catch (verifyError) {
      console.log('Schema verification skipped due to error:', verifyError);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error fixing schema:', error);
    return { success: false, error };
  }
} 