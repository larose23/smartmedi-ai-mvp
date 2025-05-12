import { createClient } from '@supabase/supabase-js';

export async function fixCheckInsTable() {
  console.log('[Fix Check-ins] Starting check_ins table initialization');
  
  // Create a Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const results = {
    success: true,
    operations: [] as string[],
    errors: [] as string[]
  };
  
  try {
    // First check if check_ins table exists
    console.log('[Fix Check-ins] Checking if check_ins table exists...');
    const { data: checkInsCheck, error: checkInsCheckError } = await supabase
      .from('check_ins')
      .select('id')
      .limit(1);
      
    if (checkInsCheckError) {
      console.error('[Fix Check-ins] Error checking check_ins table:', checkInsCheckError);
      results.errors.push(`Error checking check_ins table: ${checkInsCheckError.message}`);
      
      // If table doesn't exist, try to create it
      if (checkInsCheckError.code === 'PGRST116' || checkInsCheckError.message.includes('does not exist')) {
        try {
          const { error: createError } = await supabase.rpc('execute_sql', { 
            sql_query: `
              CREATE TABLE IF NOT EXISTS check_ins (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                patient_id TEXT,
                full_name TEXT,
                date_of_birth TEXT,
                contact_info TEXT,
                primary_symptom TEXT,
                additional_symptoms TEXT[],
                symptoms JSONB,
                triage_score TEXT DEFAULT 'Medium',
                suggested_department TEXT DEFAULT 'General Medicine',
                estimated_wait_minutes INTEGER DEFAULT 30,
                potential_diagnoses TEXT[] DEFAULT ARRAY['Evaluation needed'],
                recommended_actions TEXT[] DEFAULT ARRAY['Consult with doctor'],
                risk_factors TEXT[] DEFAULT ARRAY['None reported'],
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'pending'
              );
              
              -- Create indices for better performance
              CREATE INDEX IF NOT EXISTS idx_check_ins_patient_id ON check_ins(patient_id);
              CREATE INDEX IF NOT EXISTS idx_check_ins_created_at ON check_ins(created_at);
              CREATE INDEX IF NOT EXISTS idx_check_ins_status ON check_ins(status);
            `
          });
          
          if (createError) {
            console.error('[Fix Check-ins] Failed to create check_ins table:', createError);
            results.errors.push(`Failed to create check_ins table: ${createError.message}`);
            results.success = false;
          } else {
            console.log('[Fix Check-ins] Successfully created check_ins table');
            results.operations.push('Created check_ins table');
          }
        } catch (e) {
          console.error('[Fix Check-ins] Exception creating check_ins table:', e);
          results.errors.push(`Exception creating check_ins table: ${e}`);
          results.success = false;
        }
      } else {
        results.success = false;
      }
    } else {
      console.log('[Fix Check-ins] check_ins table exists, checking for status column...');
      results.operations.push('Verified check_ins table exists');
      
      // Check for status column
      try {
        const { data, error } = await supabase
          .from('check_ins')
          .select('status')
          .limit(1);
          
        if (error && error.message.includes('does not exist')) {
          console.log('[Fix Check-ins] Status column missing, adding it...');
          
          // Add status column
          try {
            const { error: addColumnError } = await supabase.rpc('execute_sql', {
              sql_query: `ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';`
            });
            
            if (addColumnError) {
              console.error('[Fix Check-ins] Failed to add status column:', addColumnError);
              results.errors.push(`Failed to add status column: ${addColumnError.message}`);
              results.success = false;
            } else {
              console.log('[Fix Check-ins] Successfully added status column');
              results.operations.push('Added status column to check_ins table');
              
              // Create index on status column
              try {
                const { error: indexError } = await supabase.rpc('execute_sql', {
                  sql_query: `CREATE INDEX IF NOT EXISTS idx_check_ins_status ON check_ins(status);`
                });
                
                if (indexError) {
                  console.error('[Fix Check-ins] Failed to create status index:', indexError);
                  results.errors.push(`Failed to create status index: ${indexError.message}`);
                } else {
                  console.log('[Fix Check-ins] Successfully created status index');
                  results.operations.push('Created index on status column');
                }
              } catch (e) {
                console.error('[Fix Check-ins] Exception creating status index:', e);
                results.errors.push(`Exception creating status index: ${e}`);
              }
            }
          } catch (e) {
            console.error('[Fix Check-ins] Exception adding status column:', e);
            results.errors.push(`Exception adding status column: ${e}`);
            results.success = false;
          }
        } else {
          console.log('[Fix Check-ins] Status column already exists');
          results.operations.push('Verified status column exists');
          
          // Ensure index exists on status column
          try {
            const { error: indexError } = await supabase.rpc('execute_sql', {
              sql_query: `CREATE INDEX IF NOT EXISTS idx_check_ins_status ON check_ins(status);`
            });
            
            if (indexError) {
              console.error('[Fix Check-ins] Failed to ensure status index exists:', indexError);
              results.errors.push(`Failed to ensure status index exists: ${indexError.message}`);
            } else {
              console.log('[Fix Check-ins] Status index exists or was created');
              results.operations.push('Verified status index exists');
            }
          } catch (e) {
            console.error('[Fix Check-ins] Exception ensuring status index:', e);
            results.errors.push(`Exception ensuring status index: ${e}`);
          }
        }
      } catch (e) {
        console.error('[Fix Check-ins] Error checking status column:', e);
        results.errors.push(`Error checking status column: ${e}`);
        results.success = false;
      }
      
      // Check for archive_check_in function
      try {
        console.log('[Fix Check-ins] Checking for archive_check_in function...');
        
        const { data: functionCheck, error: functionCheckError } = await supabase.rpc('execute_sql', {
          sql_query: `SELECT 1 FROM pg_proc WHERE proname = 'archive_check_in' LIMIT 1;`
        });
        
        if (functionCheckError || !functionCheck) {
          console.log('[Fix Check-ins] archive_check_in function may not exist, creating it...');
          
          const { error: createFunctionError } = await supabase.rpc('execute_sql', {
            sql_query: `
              -- Function to archive a check-in and create a patient record in a single transaction
              CREATE OR REPLACE FUNCTION archive_check_in(
                p_check_in_id UUID,
                p_appointment_id UUID DEFAULT NULL
              )
              RETURNS BOOLEAN AS $$
              DECLARE
                v_check_in RECORD;
                v_success BOOLEAN := FALSE;
              BEGIN
                -- First, check if the check-in exists
                SELECT * INTO v_check_in 
                FROM check_ins 
                WHERE id = p_check_in_id;
                
                IF v_check_in IS NULL THEN
                  RAISE EXCEPTION 'Check-in with ID % not found', p_check_in_id;
                END IF;
                
                -- Update the check-in status to 'archived'
                UPDATE check_ins 
                SET status = 'archived' 
                WHERE id = p_check_in_id;
                
                -- Create or update the patient record in the patients table
                INSERT INTO patients (
                  id,
                  first_name,
                  last_name,
                  date_of_birth,
                  gender,
                  contact,
                  phone_number,
                  name,
                  created_at,
                  appointment_id,
                  archived_at
                ) VALUES (
                  v_check_in.id,
                  COALESCE(SPLIT_PART(v_check_in.full_name, ' ', 1), 'Unknown'),
                  CASE 
                    WHEN v_check_in.full_name IS NULL OR POSITION(' ' IN v_check_in.full_name) = 0 THEN 'Patient'
                    ELSE SUBSTRING(v_check_in.full_name FROM POSITION(' ' IN v_check_in.full_name) + 1)
                  END,
                  COALESCE(v_check_in.date_of_birth, 'Not Available'),
                  COALESCE(v_check_in.gender, 'Not Specified'),
                  COALESCE(v_check_in.contact_info, 'Not Available'),
                  COALESCE(v_check_in.contact_info, 'Not Available'),
                  COALESCE(v_check_in.full_name, 'Unknown Patient'),
                  COALESCE(v_check_in.created_at, CURRENT_TIMESTAMP),
                  p_appointment_id,
                  CURRENT_TIMESTAMP
                )
                ON CONFLICT (id) DO UPDATE SET
                  first_name = EXCLUDED.first_name,
                  last_name = EXCLUDED.last_name,
                  date_of_birth = EXCLUDED.date_of_birth,
                  gender = EXCLUDED.gender,
                  contact = EXCLUDED.contact,
                  phone_number = EXCLUDED.phone_number,
                  name = EXCLUDED.name,
                  appointment_id = EXCLUDED.appointment_id,
                  archived_at = EXCLUDED.archived_at;
                
                v_success := TRUE;
                RETURN v_success;
              EXCEPTION
                WHEN OTHERS THEN
                  RAISE NOTICE 'Error in archive_check_in function: %', SQLERRM;
                  RETURN FALSE;
              END;
              $$ LANGUAGE plpgsql;
            `
          });
          
          if (createFunctionError) {
            console.error('[Fix Check-ins] Failed to create archive_check_in function:', createFunctionError);
            results.errors.push(`Failed to create archive_check_in function: ${createFunctionError.message}`);
          } else {
            console.log('[Fix Check-ins] Successfully created archive_check_in function');
            results.operations.push('Created archive_check_in function');
          }
        } else {
          console.log('[Fix Check-ins] archive_check_in function exists');
          results.operations.push('Verified archive_check_in function exists');
        }
      } catch (e) {
        console.error('[Fix Check-ins] Error checking archive_check_in function:', e);
        results.errors.push(`Error checking archive_check_in function: ${e}`);
      }
    }
    
    // Return results
    if (results.success) {
      console.log('[Fix Check-ins] Check-ins table initialization completed successfully');
    } else {
      console.error('[Fix Check-ins] Check-ins table initialization completed with errors:', results.errors);
    }
    
    return results;
  } catch (error) {
    console.error('[Fix Check-ins] Critical error during initialization:', error);
    return {
      success: false,
      operations: results.operations,
      errors: [...results.errors, `Critical error: ${error}`]
    };
  }
} 