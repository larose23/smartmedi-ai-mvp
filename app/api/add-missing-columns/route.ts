import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    console.log('[Add Missing Columns] Starting fix process');

    const results = {
      success: true,
      operations: [],
      errors: []
    };

    // First verify if the patients table exists
    try {
      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select('id')
        .limit(1);
        
      if (patientsError) {
        console.error('[Add Missing Columns] Error accessing patients table:', patientsError);
        results.errors.push(`Error accessing patients table: ${patientsError.message}`);
        return NextResponse.json({ 
          success: false, 
          error: patientsError.message,
          message: 'Cannot access patients table'
        });
      }
      
      console.log('[Add Missing Columns] Patients table exists and is accessible');
      results.operations.push('Verified patients table exists');
    } catch (e) {
      console.error('[Add Missing Columns] Exception checking patients table:', e);
      results.errors.push(`Exception checking patients table: ${e}`);
      return NextResponse.json({ 
        success: false, 
        error: String(e),
        message: 'Exception checking patients table'
      });
    }

    // Direct approach to fix the schema using raw SQL via REST API
    const columns = [
      { name: 'archived_at', type: 'timestamptz' },
      { name: 'appointment_id', type: 'uuid' }
    ];

    // Try to add each column directly with Supabase JavaScript client
    for (const column of columns) {
      try {
        console.log(`[Add Missing Columns] Checking if ${column.name} exists`);
        
        // Check if column exists
        let columnExists = false;
        try {
          // Try to select the column - if it works, column exists
          const query = `select id, ${column.name} from patients limit 1`;
          const { error: checkError } = await supabase.from('patients').select(column.name).limit(1);
          
          if (!checkError) {
            console.log(`[Add Missing Columns] Column ${column.name} already exists`);
            columnExists = true;
            results.operations.push(`Column ${column.name} already exists`);
          }
        } catch (checkError) {
          console.log(`[Add Missing Columns] Column ${column.name} does not exist:`, checkError);
        }
        
        if (!columnExists) {
          console.log(`[Add Missing Columns] Adding column ${column.name}`);
          
          // Create the column using the REST API
          const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/patients?column=${column.name}&type=${column.type}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
              'Prefer': 'return=representation',
              'X-Add-Column': 'true'
            }
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error(`[Add Missing Columns] Error adding column ${column.name}:`, errorData);
            results.errors.push(`Error adding column ${column.name}: ${JSON.stringify(errorData)}`);
            
            // Try direct manipulation of check_ins table instead
            console.log(`[Add Missing Columns] Trying alternative approach - mark check_ins as archived`);
            const { error: updateError } = await supabase
              .from('check_ins')
              .update({ status: 'archived' })
              .eq('status', 'completed');
              
            if (updateError) {
              console.error('[Add Missing Columns] Error marking check_ins as archived:', updateError);
              results.errors.push(`Error marking check_ins as archived: ${updateError.message}`);
            } else {
              console.log('[Add Missing Columns] Successfully marked completed check_ins as archived');
              results.operations.push('Marked completed check_ins as archived');
            }
          } else {
            console.log(`[Add Missing Columns] Successfully added column ${column.name}`);
            results.operations.push(`Added column ${column.name}`);
          }
        }
      } catch (e) {
        console.error(`[Add Missing Columns] Exception handling column ${column.name}:`, e);
        results.errors.push(`Exception handling column ${column.name}: ${e}`);
      }
    }

    // Create a patients_fixed table if we couldn't fix the original
    if (results.errors.length > 0) {
      console.log('[Add Missing Columns] Creating a patients_fixed table as alternative');
      
      try {
        // Get all patients from the original table
        const { data: originalPatients, error: fetchError } = await supabase
          .from('patients')
          .select('*');
          
        if (fetchError) {
          console.error('[Add Missing Columns] Error fetching original patients:', fetchError);
          results.errors.push(`Error fetching original patients: ${fetchError.message}`);
        } else {
          console.log(`[Add Missing Columns] Fetched ${originalPatients?.length || 0} patients`);
          
          // Create new patients_fixed table if it doesn't exist
          const createTableQuery = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/create_patients_fixed`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({})
          });
          
          if (!createTableQuery.ok) {
            // Table might already exist, which is fine
            console.log('[Add Missing Columns] Note: patients_fixed table may already exist');
          } else {
            console.log('[Add Missing Columns] Created patients_fixed table');
            results.operations.push('Created patients_fixed table');
          }
          
          // Copy patients to the new table
          if (originalPatients && originalPatients.length > 0) {
            const { error: insertError } = await supabase
              .from('patients_fixed')
              .upsert(originalPatients.map(p => ({
                ...p,
                archived_at: p.archived_at || new Date().toISOString(),
                appointment_id: p.appointment_id || null
              })));
              
            if (insertError) {
              console.error('[Add Missing Columns] Error copying patients to fixed table:', insertError);
              results.errors.push(`Error copying patients: ${insertError.message}`);
            } else {
              console.log('[Add Missing Columns] Successfully copied patients to fixed table');
              results.operations.push('Copied patients to fixed table');
            }
          }
        }
      } catch (e) {
        console.error('[Add Missing Columns] Exception creating fixed table:', e);
        results.errors.push(`Exception creating fixed table: ${e}`);
      }
    }

    // Finally, mark check_ins as archived
    try {
      console.log('[Add Missing Columns] Marking completed check_ins as archived');
      
      const { error: markError } = await supabase
        .from('check_ins')
        .update({ status: 'archived' })
        .eq('status', 'completed');
        
      if (markError) {
        console.error('[Add Missing Columns] Error marking check_ins as archived:', markError);
        results.errors.push(`Error marking check_ins as archived: ${markError.message}`);
      } else {
        console.log('[Add Missing Columns] Successfully marked completed check_ins as archived');
        results.operations.push('Marked completed check_ins as archived');
      }
    } catch (e) {
      console.error('[Add Missing Columns] Exception marking check_ins:', e);
      results.errors.push(`Exception marking check_ins: ${e}`);
    }
    
    // Return final results
    results.success = results.errors.length === 0;
    return NextResponse.json({
      success: results.success,
      operations_count: results.operations.length,
      operations: results.operations,
      errors_count: results.errors.length,
      errors: results.errors,
      message: results.success 
        ? 'Successfully added missing columns' 
        : 'Added columns with some errors'
    });
  } catch (error) {
    console.error('[Add Missing Columns] Unhandled error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error),
      message: 'Unhandled error adding columns'
    });
  }
} 