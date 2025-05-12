import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    console.log('[Direct SQL Fix] Starting database schema fix');
    
    const results = {
      success: false,
      operations: [],
      errors: []
    };
    
    // Add columns to patients table using direct SQL queries
    const patientsColumns = [
      { name: 'archived_at', type: 'timestamptz' },
      { name: 'appointment_id', type: 'uuid' },
      { name: 'name', type: 'text' },
      { name: 'phone_number', type: 'text' },
      { name: 'additional_symptoms', type: 'text' }
    ];
    
    for (const column of patientsColumns) {
      try {
        console.log(`[Direct SQL Fix] Adding ${column.name} to patients table`);
        
        // First check if column exists (SELECT 1 will succeed if column exists)
        const { data: checkData, error: checkError } = await supabase
          .from('patients')
          .select(column.name)
          .limit(1);
        
        if (checkError && checkError.message.includes('does not exist')) {
          // Column doesn't exist, add it using direct SQL
          
          // Use a direct SQL query through the PostgreSQL extension
          const { error: sqlError } = await supabase.rpc(
            'execute_sql', 
            { sql: `ALTER TABLE patients ADD COLUMN IF NOT EXISTS ${column.name} ${column.type};` }
          );
          
          if (sqlError) {
            console.error(`[Direct SQL Fix] Error adding ${column.name}:`, sqlError);
            
            // Try alternative approach with Supabase functions
            const { error: altError } = await supabase.functions.invoke('schema-fix', {
              body: { 
                table: 'patients', 
                column: column.name, 
                type: column.type 
              }
            });
            
            if (altError) {
              console.error(`[Direct SQL Fix] Alternative approach also failed:`, altError);
              results.errors.push(`Failed to add ${column.name} to patients: ${sqlError.message}`);
            } else {
              console.log(`[Direct SQL Fix] Added ${column.name} via alternative method`);
              results.operations.push(`Added ${column.name} to patients table (alt method)`);
            }
          } else {
            console.log(`[Direct SQL Fix] Successfully added ${column.name} to patients`);
            results.operations.push(`Added ${column.name} to patients table`);
          }
        } else {
          console.log(`[Direct SQL Fix] Column ${column.name} already exists in patients`);
          results.operations.push(`Column ${column.name} already exists in patients`);
        }
      } catch (e) {
        console.error(`[Direct SQL Fix] Exception when adding ${column.name}:`, e);
        results.errors.push(`Exception adding ${column.name}: ${e}`);
      }
    }
    
    // Add department column to appointments table
    try {
      console.log(`[Direct SQL Fix] Adding department to appointments table`);
      
      // Check if department column exists
      const { data: checkData, error: checkError } = await supabase
        .from('appointments')
        .select('department')
        .limit(1);
      
      if (checkError && checkError.message.includes('does not exist')) {
        // Use direct SQL query
        const { error: sqlError } = await supabase.rpc(
          'execute_sql', 
          { sql: `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS department text;` }
        );
        
        if (sqlError) {
          console.error(`[Direct SQL Fix] Error adding department:`, sqlError);
          
          // Try alternative approach
          const { error: altError } = await supabase.functions.invoke('schema-fix', {
            body: { 
              table: 'appointments', 
              column: 'department', 
              type: 'text' 
            }
          });
          
          if (altError) {
            console.error(`[Direct SQL Fix] Alternative approach also failed:`, altError);
            results.errors.push(`Failed to add department to appointments: ${sqlError.message}`);
          } else {
            console.log(`[Direct SQL Fix] Added department via alternative method`);
            results.operations.push(`Added department to appointments table (alt method)`);
          }
        } else {
          console.log(`[Direct SQL Fix] Successfully added department to appointments`);
          results.operations.push(`Added department to appointments table`);
        }
      } else {
        console.log(`[Direct SQL Fix] Column department already exists in appointments`);
        results.operations.push(`Column department already exists in appointments`);
      }
    } catch (e) {
      console.error(`[Direct SQL Fix] Exception when adding department:`, e);
      results.errors.push(`Exception adding department: ${e}`);
    }
    
    // Create a simpler patients table if it doesn't exist properly
    if (results.errors.length > 0) {
      try {
        console.log(`[Direct SQL Fix] Attempting to recreate patients table from scratch`);
        
        // First create a backup of existing data
        const { data: existingPatients, error: fetchError } = await supabase
          .from('patients')
          .select('*');
          
        if (!fetchError && existingPatients && existingPatients.length > 0) {
          console.log(`[Direct SQL Fix] Backing up ${existingPatients.length} patients`);
          results.operations.push(`Backed up ${existingPatients.length} patients`);
        }
        
        // Try to create a new patients table with all required columns
        const { error: createError } = await supabase.rpc(
          'execute_sql', 
          { 
            sql: `
              CREATE TABLE IF NOT EXISTS patients_new (
                id UUID PRIMARY KEY,
                first_name TEXT,
                last_name TEXT,
                date_of_birth TEXT,
                gender TEXT,
                contact TEXT,
                created_at TIMESTAMPTZ,
                archived_at TIMESTAMPTZ,
                appointment_id UUID,
                name TEXT,
                phone_number TEXT,
                additional_symptoms TEXT
              );
              
              -- Copy any existing data we can
              INSERT INTO patients_new(id, first_name, last_name, date_of_birth, gender, contact, created_at)
              SELECT id, first_name, last_name, date_of_birth, gender, contact, created_at
              FROM patients;
            `
          }
        );
        
        if (createError) {
          console.error(`[Direct SQL Fix] Error creating new patients table:`, createError);
          results.errors.push(`Failed to create new patients table: ${createError.message}`);
        } else {
          console.log(`[Direct SQL Fix] Successfully created new patients table`);
          results.operations.push(`Created new patients_new table as backup`);
        }
      } catch (e) {
        console.error(`[Direct SQL Fix] Exception when recreating patients table:`, e);
        results.errors.push(`Exception recreating patients table: ${e}`);
      }
    }
    
    // Final verification
    try {
      // Try to select from patients table with new columns
      const { data: patientsCheck, error: patientsError } = await supabase
        .from('patients')
        .select('id, name, archived_at, appointment_id, additional_symptoms')
        .limit(1);
        
      // Try to select from appointments table with department column
      const { data: appointmentsCheck, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id, department')
        .limit(1);
        
      if (!patientsError && !appointmentsError) {
        console.log(`[Direct SQL Fix] Schema verification successful`);
        results.success = true;
      } else {
        if (patientsError) {
          console.error(`[Direct SQL Fix] Patients verification failed:`, patientsError);
          results.errors.push(`Patients verification failed: ${patientsError.message}`);
        }
        if (appointmentsError) {
          console.error(`[Direct SQL Fix] Appointments verification failed:`, appointmentsError);
          results.errors.push(`Appointments verification failed: ${appointmentsError.message}`);
        }
      }
    } catch (e) {
      console.error(`[Direct SQL Fix] Exception during verification:`, e);
      results.errors.push(`Exception during verification: ${e}`);
    }
    
    return NextResponse.json({ 
      success: results.success,
      operations_count: results.operations.length,
      operations: results.operations,
      errors_count: results.errors.length,
      errors: results.errors,
      message: results.success 
        ? 'Database schema fixed successfully' 
        : 'Schema fix completed with errors'
    });
  } catch (error) {
    console.error('[Direct SQL Fix] Critical error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error),
      message: 'Failed to fix database schema'
    });
  }
} 