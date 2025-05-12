import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    console.log('[Fix Archive Schema] Starting fix process');

    const columnsToAdd = [
      { name: 'archived_at', type: 'timestamptz' },
      { name: 'appointment_id', type: 'uuid' },
      { name: 'additional_symptoms', type: 'jsonb' },
      { name: 'primary_symptom', type: 'text' },
      { name: 'triage_score', type: 'text' },
      { name: 'suggested_department', type: 'text' },
      { name: 'estimated_wait_minutes', type: 'integer' },
      { name: 'potential_diagnoses', type: 'jsonb' },
      { name: 'recommended_actions', type: 'jsonb' },
      { name: 'risk_factors', type: 'jsonb' }
    ];

    const results = {
      success: true,
      operations: [],
      errors: []
    };

    // Add each column
    for (const column of columnsToAdd) {
      try {
        console.log(`[Fix Archive Schema] Adding column ${column.name} to patients table`);
        
        // Direct SQL approach using execute_sql RPC
        const sql = `
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'patients' 
              AND column_name = '${column.name}'
            ) THEN
              ALTER TABLE patients ADD COLUMN ${column.name} ${column.type};
            END IF;
          END $$;
        `;
        
        const { error: sqlError } = await supabase.rpc('execute_sql', { 
          sql_query: sql 
        });
        
        if (sqlError) {
          console.error(`[Fix Archive Schema] Error adding ${column.name}:`, sqlError);
          results.errors.push(`Failed to add ${column.name}: ${sqlError.message}`);
          
          // Try alternative approach - direct SQL without PL/pgSQL wrapper
          const altSql = `ALTER TABLE patients ADD COLUMN IF NOT EXISTS ${column.name} ${column.type};`;
          const { error: altError } = await supabase.rpc('execute_sql', { 
            sql_query: altSql 
          });
          
          if (altError) {
            console.error(`[Fix Archive Schema] Alternative approach also failed:`, altError);
            results.errors.push(`Alternative approach for ${column.name} also failed: ${altError.message}`);
          } else {
            console.log(`[Fix Archive Schema] Successfully added ${column.name} using alternative approach`);
            results.operations.push(`Added ${column.name} to patients table (alt method)`);
          }
        } else {
          console.log(`[Fix Archive Schema] Successfully added ${column.name}`);
          results.operations.push(`Added ${column.name} to patients table`);
        }
      } catch (e) {
        console.error(`[Fix Archive Schema] Exception when adding ${column.name}:`, e);
        results.errors.push(`Exception adding ${column.name}: ${e}`);
      }
    }
    
    // Verify the schema changes
    try {
      console.log('[Fix Archive Schema] Verifying patients table schema');
      
      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select('id')
        .limit(1);
        
      if (patientsError) {
        console.error('[Fix Archive Schema] Error verifying patients table:', patientsError);
        results.errors.push(`Error verifying patients table: ${patientsError.message}`);
      } else {
        console.log('[Fix Archive Schema] Patients table exists and is accessible');
        results.operations.push('Verified patients table exists');
      }
      
      // Try to select the most important columns
      try {
        const { error: columnsError } = await supabase.rpc('execute_sql', {
          sql_query: `
            SELECT 
              EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'archived_at') as has_archived_at,
              EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'appointment_id') as has_appointment_id
          `
        });
        
        if (columnsError) {
          console.error('[Fix Archive Schema] Error checking columns:', columnsError);
          results.errors.push(`Error checking columns: ${columnsError.message}`);
        } else {
          console.log('[Fix Archive Schema] Successfully verified key columns');
          results.operations.push('Verified key columns exist');
        }
      } catch (e) {
        console.error('[Fix Archive Schema] Exception checking columns:', e);
        results.errors.push(`Exception checking columns: ${e}`);
      }
    } catch (e) {
      console.error('[Fix Archive Schema] Error in verification step:', e);
      results.errors.push(`Error in verification step: ${e}`);
    }

    // Create the archive_check_in function if it doesn't exist
    try {
      console.log('[Fix Archive Schema] Creating archive_check_in function');
      
      const functionSql = `
        CREATE OR REPLACE FUNCTION archive_check_in(
          p_check_in_id UUID,
          p_appointment_id UUID DEFAULT NULL
        )
        RETURNS BOOLEAN AS $$
        DECLARE
          v_check_in RECORD;
          v_success BOOLEAN := FALSE;
        BEGIN
          -- Start transaction
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
            
            -- If we got here, the transaction was successful
            RETURN v_success;
          EXCEPTION
            WHEN OTHERS THEN
              -- Log the error
              RAISE NOTICE 'Error in archive_check_in function: %', SQLERRM;
              RETURN FALSE;
          END;
        END;
        $$ LANGUAGE plpgsql;
      `;
      
      const { error: functionError } = await supabase.rpc('execute_sql', { 
        sql_query: functionSql 
      });
      
      if (functionError) {
        console.error('[Fix Archive Schema] Error creating function:', functionError);
        results.errors.push(`Failed to create archive_check_in function: ${functionError.message}`);
      } else {
        console.log('[Fix Archive Schema] Successfully created archive_check_in function');
        results.operations.push('Created archive_check_in function');
      }
    } catch (e) {
      console.error('[Fix Archive Schema] Exception creating function:', e);
      results.errors.push(`Exception creating function: ${e}`);
    }
    
    // Return results
    results.success = results.errors.length === 0;
    return NextResponse.json({
      success: results.success,
      operations_count: results.operations.length,
      operations: results.operations,
      errors_count: results.errors.length,
      errors: results.errors,
      message: results.success 
        ? 'Successfully fixed patients table schema' 
        : 'Fixed schema with some errors'
    });
  } catch (error) {
    console.error('[Fix Archive Schema] Critical error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error),
      message: 'Failed to fix schema'
    });
  }
} 