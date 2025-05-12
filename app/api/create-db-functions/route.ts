import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  
  try {
    console.log('Setting up database functions...');
    
    // Function 1: Get all patients for archive view
    const createArchiveFunction = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE OR REPLACE FUNCTION get_all_patients_for_archive()
        RETURNS SETOF json AS $$
        BEGIN
          RETURN QUERY 
          SELECT json_build_object(
            'id', p.id,
            'first_name', COALESCE(p.first_name, split_part(p.name, ' ', 1), 'Unknown'),
            'last_name', COALESCE(p.last_name, 
                         CASE WHEN position(' ' in p.name) > 0 
                         THEN substring(p.name from position(' ' in p.name) + 1) 
                         ELSE '' END, 
                        ''),
            'name', COALESCE(p.name, concat_ws(' ', p.first_name, p.last_name), 'Unknown Patient'),
            'date_of_birth', COALESCE(p.date_of_birth, 'Not Available'),
            'gender', COALESCE(p.gender, 'Not Specified'),
            'contact', COALESCE(p.contact, p.contact_info, 'Not Available'),
            'created_at', COALESCE(p.created_at, NOW()),
            'appointment_count', 0,
            'last_visit_date', NULL
          )
          FROM patients p;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });
    
    // Create a helper function to insert test data
    const createTestDataFunction = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE OR REPLACE FUNCTION insert_test_patient()
        RETURNS json AS $$
        DECLARE
          test_id TEXT := 'test-' || extract(epoch from now())::text;
          result json;
        BEGIN
          INSERT INTO patients (
            id, 
            first_name, 
            last_name, 
            name,
            date_of_birth, 
            gender, 
            contact, 
            created_at
          ) VALUES (
            test_id,
            'Test',
            'Patient',
            'Test Patient',
            '1990-01-01',
            'Not Specified',
            '555-1234',
            NOW()
          )
          RETURNING to_json(patients.*) INTO result;
          
          RETURN result;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });
    
    // Create a function to examine the database schema
    const createExamineSchemaFunction = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE OR REPLACE FUNCTION examine_db_schema()
        RETURNS json AS $$
        DECLARE
          table_exists boolean;
          column_info json;
          result json;
        BEGIN
          -- Check if the patients table exists
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'patients'
          ) INTO table_exists;
          
          -- Get column information if table exists
          IF table_exists THEN
            SELECT json_agg(json_build_object(
              'column_name', column_name,
              'data_type', data_type,
              'is_nullable', is_nullable
            ))
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'patients'
            INTO column_info;
          ELSE
            column_info := '[]'::json;
          END IF;
          
          -- Build result
          result := json_build_object(
            'table_exists', table_exists,
            'column_info', column_info
          );
          
          RETURN result;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });
    
    // Create a function to insert a patient record that works with any schema
    const createFlexibleInsertFunction = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE OR REPLACE FUNCTION insert_patient_flexible(
          p_id TEXT,
          p_first_name TEXT,
          p_last_name TEXT,
          p_name TEXT,
          p_date_of_birth TEXT,
          p_gender TEXT,
          p_contact TEXT
        )
        RETURNS json AS $$
        DECLARE
          column_exists boolean;
          has_name boolean;
          has_first_name boolean;
          has_last_name boolean;
          query_text text;
          result json;
        BEGIN
          -- Check which columns exist
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'patients' AND column_name = 'name'
          ) INTO has_name;
          
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'patients' AND column_name = 'first_name'
          ) INTO has_first_name;
          
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'patients' AND column_name = 'last_name'
          ) INTO has_last_name;
          
          -- Build dynamic query based on available columns
          query_text := 'INSERT INTO patients (id';
          
          -- Add column names conditionally
          IF has_name THEN
            query_text := query_text || ', name';
          END IF;
          
          IF has_first_name THEN
            query_text := query_text || ', first_name';
          END IF;
          
          IF has_last_name THEN
            query_text := query_text || ', last_name';
          END IF;
          
          query_text := query_text || ', date_of_birth, gender, contact, created_at) VALUES ($1';
          
          -- Add parameter placeholders
          IF has_name THEN
            query_text := query_text || ', $2';
          END IF;
          
          IF has_first_name THEN
            query_text := query_text || ', $3';
          END IF;
          
          IF has_last_name THEN
            query_text := query_text || ', $4';
          END IF;
          
          query_text := query_text || ', $5, $6, $7, now()) RETURNING to_json(patients.*)';
          
          -- Execute the dynamic query with parameters
          EXECUTE query_text USING 
            p_id,
            p_name,
            p_first_name,
            p_last_name,
            p_date_of_birth,
            p_gender,
            p_contact
          INTO result;
          
          RETURN result;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });
    
    // This is a direct PostgreSQL query to create the execute_sql function
    // Note: This requires appropriate permissions in the database
    const createFunctionSql = `
      CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
      RETURNS JSONB AS $$
      DECLARE
        result JSONB;
      BEGIN
        EXECUTE sql_query INTO result;
        RETURN result;
      EXCEPTION
        WHEN OTHERS THEN
          RETURN jsonb_build_object(
            'error', SQLERRM,
            'detail', SQLSTATE
          );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    // Try to create the function using direct SQL
    // This approach uses the SQL API which should work
    const { data, error } = await supabase.from('_temp_create_function').select(`
      id, created_at, updated_at 
      FROM pg_temp.create_function($1)
    `).parameters([createFunctionSql]);

    if (error) {
      console.error('[Create DB Functions] Error creating execute_sql function:', error);
      
      // Try alternative approach - Create temporary table with SQL execution
      try {
        console.log('[Create DB Functions] Trying SQL execution through admin panel');
        
        // Log instructions for manual execution
        console.log('[Create DB Functions] Please execute this SQL in the Supabase dashboard SQL editor:');
        console.log(createFunctionSql);
        
        return NextResponse.json({ 
          success: false, 
          message: 'Manual intervention required - please execute SQL in Supabase dashboard', 
          sql: createFunctionSql
        });
      } catch (e) {
        console.error('[Create DB Functions] Exception:', e);
        return NextResponse.json({ 
          success: false, 
          error: String(e), 
          message: 'Failed to create execute_sql function'
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully created execute_sql function'
    });
  } catch (error) {
    console.error('[Create DB Functions] Unhandled error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error),
      message: 'Unhandled error creating function'
    });
  }
} 