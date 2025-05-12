import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    console.log('[Manual Schema Fix] Starting direct schema modifications');
    
    const results = {
      patients_table: { success: false, columns_added: [] },
      appointments_table: { success: false, columns_added: [] },
      errors: []
    };
    
    // 1. First fix the patients table
    try {
      console.log('[Manual Schema Fix] Adding missing columns to patients table');
      
      // Check if archived_at column exists and add it if not
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('archived_at')
          .limit(1);
          
        if (error && error.message.includes('does not exist')) {
          console.log('[Manual Schema Fix] Adding archived_at column to patients table');
          // Add the column using raw PostgreSQL extension
          const { error: alterError } = await supabase.rpc(
            'pgext_alter_table',
            { table_name: 'patients', operation: 'ADD COLUMN archived_at TIMESTAMPTZ' }
          );
          
          if (alterError) {
            console.error('[Manual Schema Fix] Error adding archived_at column:', alterError);
            results.errors.push(`Error adding archived_at column: ${alterError.message}`);
          } else {
            results.patients_table.columns_added.push('archived_at');
          }
        } else {
          console.log('[Manual Schema Fix] archived_at column already exists');
        }
      } catch (e) {
        console.error('[Manual Schema Fix] Error checking/adding archived_at column:', e);
        results.errors.push(`Error checking/adding archived_at column: ${e}`);
      }
      
      // Check if appointment_id column exists and add it if not
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('appointment_id')
          .limit(1);
          
        if (error && error.message.includes('does not exist')) {
          console.log('[Manual Schema Fix] Adding appointment_id column to patients table');
          const { error: alterError } = await supabase.rpc(
            'pgext_alter_table',
            { table_name: 'patients', operation: 'ADD COLUMN appointment_id UUID' }
          );
          
          if (alterError) {
            console.error('[Manual Schema Fix] Error adding appointment_id column:', alterError);
            results.errors.push(`Error adding appointment_id column: ${alterError.message}`);
          } else {
            results.patients_table.columns_added.push('appointment_id');
          }
        } else {
          console.log('[Manual Schema Fix] appointment_id column already exists');
        }
      } catch (e) {
        console.error('[Manual Schema Fix] Error checking/adding appointment_id column:', e);
        results.errors.push(`Error checking/adding appointment_id column: ${e}`);
      }
      
      // Check if name column exists and add it if not
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('name')
          .limit(1);
          
        if (error && error.message.includes('does not exist')) {
          console.log('[Manual Schema Fix] Adding name column to patients table');
          const { error: alterError } = await supabase.rpc(
            'pgext_alter_table',
            { table_name: 'patients', operation: 'ADD COLUMN name TEXT' }
          );
          
          if (alterError) {
            console.error('[Manual Schema Fix] Error adding name column:', alterError);
            results.errors.push(`Error adding name column: ${alterError.message}`);
          } else {
            results.patients_table.columns_added.push('name');
          }
        } else {
          console.log('[Manual Schema Fix] name column already exists');
        }
      } catch (e) {
        console.error('[Manual Schema Fix] Error checking/adding name column:', e);
        results.errors.push(`Error checking/adding name column: ${e}`);
      }
      
      // Check if phone_number column exists and add it if not
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('phone_number')
          .limit(1);
          
        if (error && error.message.includes('does not exist')) {
          console.log('[Manual Schema Fix] Adding phone_number column to patients table');
          const { error: alterError } = await supabase.rpc(
            'pgext_alter_table',
            { table_name: 'patients', operation: 'ADD COLUMN phone_number TEXT' }
          );
          
          if (alterError) {
            console.error('[Manual Schema Fix] Error adding phone_number column:', alterError);
            results.errors.push(`Error adding phone_number column: ${alterError.message}`);
          } else {
            results.patients_table.columns_added.push('phone_number');
          }
        } else {
          console.log('[Manual Schema Fix] phone_number column already exists');
        }
      } catch (e) {
        console.error('[Manual Schema Fix] Error checking/adding phone_number column:', e);
        results.errors.push(`Error checking/adding phone_number column: ${e}`);
      }
      
      // Check for required additional_symptoms column
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('additional_symptoms')
          .limit(1);
          
        if (error && error.message.includes('does not exist')) {
          console.log('[Manual Schema Fix] Adding additional_symptoms column to patients table');
          const { error: alterError } = await supabase.rpc(
            'pgext_alter_table',
            { table_name: 'patients', operation: 'ADD COLUMN additional_symptoms TEXT' }
          );
          
          if (alterError) {
            console.error('[Manual Schema Fix] Error adding additional_symptoms column:', alterError);
            results.errors.push(`Error adding additional_symptoms column: ${alterError.message}`);
          } else {
            results.patients_table.columns_added.push('additional_symptoms');
          }
        } else {
          console.log('[Manual Schema Fix] additional_symptoms column already exists');
        }
      } catch (e) {
        console.error('[Manual Schema Fix] Error checking/adding additional_symptoms column:', e);
        results.errors.push(`Error checking/adding additional_symptoms column: ${e}`);
      }
      
      // After adding columns, verify the patients table has the required structure
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('id, name, archived_at, appointment_id, phone_number, additional_symptoms')
          .limit(1);
          
        if (!error) {
          console.log('[Manual Schema Fix] Successfully verified patients table structure');
          results.patients_table.success = true;
        } else {
          console.error('[Manual Schema Fix] Error verifying patients table structure:', error);
          results.errors.push(`Error verifying patients table: ${error.message}`);
        }
      } catch (e) {
        console.error('[Manual Schema Fix] Exception verifying patients table:', e);
        results.errors.push(`Exception verifying patients table: ${e}`);
      }
    } catch (e) {
      console.error('[Manual Schema Fix] Error fixing patients table:', e);
      results.errors.push(`Error fixing patients table: ${e}`);
    }
    
    // 2. Fix appointments table
    try {
      console.log('[Manual Schema Fix] Checking/fixing appointments table');
      
      // Check if department column exists and add it if not
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('department')
          .limit(1);
          
        if (error && error.message.includes('does not exist')) {
          console.log('[Manual Schema Fix] Adding department column to appointments table');
          const { error: alterError } = await supabase.rpc(
            'pgext_alter_table',
            { table_name: 'appointments', operation: 'ADD COLUMN department TEXT' }
          );
          
          if (alterError) {
            console.error('[Manual Schema Fix] Error adding department column:', alterError);
            results.errors.push(`Error adding department column: ${alterError.message}`);
          } else {
            results.appointments_table.columns_added.push('department');
          }
        } else {
          console.log('[Manual Schema Fix] department column already exists');
        }
      } catch (e) {
        console.error('[Manual Schema Fix] Error checking/adding department column:', e);
        results.errors.push(`Error checking/adding department column: ${e}`);
      }
      
      // Verify appointments table structure
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('id, patient_id, department')
          .limit(1);
          
        if (!error) {
          console.log('[Manual Schema Fix] Successfully verified appointments table structure');
          results.appointments_table.success = true;
        } else {
          console.error('[Manual Schema Fix] Error verifying appointments table structure:', error);
          results.errors.push(`Error verifying appointments table: ${error.message}`);
        }
      } catch (e) {
        console.error('[Manual Schema Fix] Exception verifying appointments table:', e);
        results.errors.push(`Exception verifying appointments table: ${e}`);
      }
    } catch (e) {
      console.error('[Manual Schema Fix] Error fixing appointments table:', e);
      results.errors.push(`Error fixing appointments table: ${e}`);
    }
    
    // Generate response summary
    const allSuccess = results.patients_table.success && results.appointments_table.success;
    const summary = {
      success: allSuccess,
      schema_fixed: allSuccess,
      patients_table: results.patients_table,
      appointments_table: results.appointments_table,
      error_count: results.errors.length,
      errors: results.errors
    };
    
    console.log('[Manual Schema Fix] Schema fix completed with result:', allSuccess ? 'SUCCESS' : 'PARTIAL FAILURE');
    
    return NextResponse.json(summary);
  } catch (error) {
    console.error('[Manual Schema Fix] Critical error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error),
      message: 'Failed to fix database schema'
    });
  }
} 