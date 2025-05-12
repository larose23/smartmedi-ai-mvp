import { createClient } from '@supabase/supabase-js';
import { fixCheckInsTable } from './fix-check-ins';

// This init script can be imported in app initialization components

export async function initializeDatabase() {
  console.log('[DB Init] Starting database schema initialization');
  
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
    // Initialize check_ins table first
    console.log('[DB Init] Initializing check_ins table...');
    const checkInsResults = await fixCheckInsTable();
    
    // Merge results
    results.operations.push(...checkInsResults.operations);
    results.errors.push(...checkInsResults.errors);
    
    if (!checkInsResults.success) {
      results.success = false;
      console.error('[DB Init] check_ins table initialization failed.');
    } else {
      console.log('[DB Init] check_ins table initialization completed successfully.');
    }

    // First check if patients table exists
    const { data: patientsCheck, error: patientsCheckError } = await supabase
      .from('patients')
      .select('id')
      .limit(1);
      
    if (patientsCheckError) {
      console.error('[DB Init] Error checking patients table:', patientsCheckError);
      results.errors.push(`Error checking patients table: ${patientsCheckError.message}`);
      results.success = false;
    } else {
      console.log('[DB Init] Patients table exists');
      results.operations.push('Verified patients table exists');
      
      // Check for required columns
      const requiredColumns = [
        { name: 'archived_at', type: 'timestamptz' },
        { name: 'appointment_id', type: 'uuid' },
        { name: 'name', type: 'text' },
        { name: 'additional_symptoms', type: 'text' }
      ];
      
      for (const column of requiredColumns) {
        try {
          const { data, error } = await supabase
            .from('patients')
            .select(column.name)
            .limit(1);
            
          if (error && error.message.includes('does not exist')) {
            console.log(`[DB Init] Column ${column.name} is missing from patients table`);
            
            // Attempt to add the column via RPC function if available
            try {
              const { error: rpcError } = await supabase.rpc('execute_sql', {
                sql_query: `ALTER TABLE patients ADD COLUMN IF NOT EXISTS ${column.name} ${column.type};`
              });
              
              if (rpcError) {
                console.error(`[DB Init] Failed to add column ${column.name}:`, rpcError);
                results.errors.push(`Failed to add column ${column.name}: ${rpcError.message}`);
                results.success = false;
              } else {
                console.log(`[DB Init] Successfully added column ${column.name}`);
                results.operations.push(`Added column ${column.name} to patients table`);
              }
            } catch (e) {
              console.error(`[DB Init] Exception adding column ${column.name}:`, e);
              results.errors.push(`Exception adding column ${column.name}: ${e}`);
              results.success = false;
            }
          } else {
            console.log(`[DB Init] Column ${column.name} already exists in patients table`);
            results.operations.push(`Verified column ${column.name} exists`);
          }
        } catch (e) {
          console.error(`[DB Init] Error checking column ${column.name}:`, e);
          results.errors.push(`Error checking column ${column.name}: ${e}`);
          results.success = false;
        }
      }
    }
    
    // Check appointments table
    const { data: appointmentsCheck, error: appointmentsCheckError } = await supabase
      .from('appointments')
      .select('id')
      .limit(1);
      
    if (appointmentsCheckError) {
      console.error('[DB Init] Error checking appointments table:', appointmentsCheckError);
      results.errors.push(`Error checking appointments table: ${appointmentsCheckError.message}`);
      results.success = false;
    } else {
      console.log('[DB Init] Appointments table exists');
      results.operations.push('Verified appointments table exists');
      
      // Check for department column
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('department')
          .limit(1);
          
        if (error && error.message.includes('does not exist')) {
          console.log('[DB Init] Department column missing from appointments table');
          
          // Try to add department column
          try {
            const { error: rpcError } = await supabase.rpc('execute_sql', {
              sql_query: `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS department text;`
            });
            
            if (rpcError) {
              console.error('[DB Init] Failed to add department column:', rpcError);
              results.errors.push(`Failed to add department column: ${rpcError.message}`);
              results.success = false;
            } else {
              console.log('[DB Init] Successfully added department column');
              results.operations.push('Added department column to appointments table');
            }
          } catch (e) {
            console.error('[DB Init] Exception adding department column:', e);
            results.errors.push(`Exception adding department column: ${e}`);
            results.success = false;
          }
        } else {
          console.log('[DB Init] Department column already exists in appointments table');
          results.operations.push('Verified department column exists');
        }
      } catch (e) {
        console.error('[DB Init] Error checking department column:', e);
        results.errors.push(`Error checking department column: ${e}`);
        results.success = false;
      }
    }
    
    // Check if any check_ins need to be archived
    try {
      console.log('[DB Init] Checking for patients that should be archived');
      
      // Look for patients with appointments that aren't archived
      const { data: pendingArchive, error: pendingError } = await supabase
        .from('appointments')
        .select('id, patient_id, status')
        .not('patient_id', 'is', null)
        .limit(10);
        
      if (pendingError) {
        console.error('[DB Init] Error checking for pending archives:', pendingError);
      } else if (pendingArchive && pendingArchive.length > 0) {
        console.log(`[DB Init] Found ${pendingArchive.length} appointments that may need archiving`);
        
        // For each appointment, check if patient is already archived
        for (const appointment of pendingArchive) {
          if (!appointment.patient_id) continue;
          
          // Check if patient exists in patients table (archive)
          const { data: archivedPatient, error: archivedError } = await supabase
            .from('patients')
            .select('id')
            .eq('id', appointment.patient_id)
            .maybeSingle();
            
          if (archivedError && archivedError.code !== 'PGRST116') {
            console.error(`[DB Init] Error checking if patient ${appointment.patient_id} is archived:`, archivedError);
          }
          
          // If patient is not archived, check if they exist in check_ins
          if (!archivedPatient) {
            const { data: checkIn, error: checkInError } = await supabase
              .from('check_ins')
              .select('id, status')
              .eq('id', appointment.patient_id)
              .maybeSingle();
              
            if (checkInError && checkInError.code !== 'PGRST116') {
              console.error(`[DB Init] Error checking patient ${appointment.patient_id} in check_ins:`, checkInError);
            }
            
            // If patient exists in check_ins and is not archived, mark them as archived
            if (checkIn && checkIn.status !== 'archived') {
              console.log(`[DB Init] Patient ${appointment.patient_id} has appointment but is not archived - fixing`);
              
              const { error: updateError } = await supabase
                .from('check_ins')
                .update({ status: 'archived' })
                .eq('id', appointment.patient_id);
                
              if (updateError) {
                console.error(`[DB Init] Error updating patient ${appointment.patient_id} status:`, updateError);
              } else {
                console.log(`[DB Init] Successfully marked patient ${appointment.patient_id} as archived`);
                results.operations.push(`Marked patient ${appointment.patient_id} as archived`);
              }
            }
          }
        }
      } else {
        console.log('[DB Init] No patients found that need archiving');
      }
    } catch (e) {
      console.error('[DB Init] Error checking pending archives:', e);
    }
    
    if (results.success) {
      console.log('[DB Init] Database initialization completed successfully');
    } else {
      console.error('[DB Init] Database initialization completed with errors:', results.errors);
    }
    
    return results;
  } catch (error) {
    console.error('[DB Init] Critical error during initialization:', error);
    return {
      success: false,
      operations: results.operations,
      errors: [...results.errors, `Critical error: ${error}`]
    };
  }
} 