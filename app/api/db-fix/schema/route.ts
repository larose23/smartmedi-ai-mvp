import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    console.log('[Schema Fix] Starting schema fix process');
    
    // PostgreSQL doesn't directly provide ALTER TABLE IF COLUMN NOT EXISTS
    // So we'll need to use RPC or SQL functions
    
    // First try using the direct SQL approach
    try {
      const fieldsToAdd = [
        { name: 'archived_at', type: 'timestamptz' },
        { name: 'appointment_id', type: 'uuid' },
        { name: 'name', type: 'text' },
        { name: 'phone_number', type: 'text' }
      ];
      
      const results = {};
      
      for (const field of fieldsToAdd) {
        try {
          // Use a more generic check-and-create approach
          const { error: rpcError } = await supabase.rpc('execute_sql', {
            sql_query: `
              DO $$
              BEGIN
                IF NOT EXISTS (
                  SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'patients' 
                  AND column_name = '${field.name}'
                ) THEN
                  ALTER TABLE patients ADD COLUMN ${field.name} ${field.type};
                END IF;
              END
              $$;
            `
          });
          
          if (rpcError) {
            console.error(`[Schema Fix] Failed to add ${field.name} column:`, rpcError);
            results[field.name] = { success: false, error: rpcError.message };
            
            // Try a fallback direct SQL with no transaction
            try {
              const { error: fallbackError } = await supabase.rpc('execute_sql', {
                sql_query: `ALTER TABLE patients ADD COLUMN IF NOT EXISTS ${field.name} ${field.type};`
              });
              
              if (fallbackError) {
                console.error(`[Schema Fix] Fallback also failed for ${field.name}:`, fallbackError);
              } else {
                console.log(`[Schema Fix] Fallback succeeded for ${field.name}`);
                results[field.name] = { success: true, method: 'fallback' };
              }
            } catch (fallbackEx) {
              console.error(`[Schema Fix] Fallback exception for ${field.name}:`, fallbackEx);
            }
          } else {
            console.log(`[Schema Fix] Added ${field.name} column successfully`);
            results[field.name] = { success: true, method: 'primary' };
          }
        } catch (fieldError) {
          console.error(`[Schema Fix] Exception adding ${field.name}:`, fieldError);
          results[field.name] = { success: false, error: String(fieldError) };
        }
      }
      
      // Verify if the schema fix succeeded
      const { data: verifyData, error: verifyError } = await supabase
        .from('patients')
        .select('archived_at, appointment_id, name, phone_number')
        .limit(1);
        
      let schemaFixed = false;
        
      if (verifyError) {
        console.error('[Schema Fix] Schema verification failed:', verifyError);
      } else {
        console.log('[Schema Fix] Schema verification succeeded');
        schemaFixed = true;
      }
      
      return NextResponse.json({
        success: true,
        schema_fixed: schemaFixed,
        message: 'Schema fix attempted',
        results
      });
    } catch (error) {
      console.error('[Schema Fix] Error fixing schema:', error);
      return NextResponse.json({ success: false, error: String(error) });
    }
  } catch (error) {
    console.error('[Schema Fix] Critical error:', error);
    return NextResponse.json({ success: false, error: String(error) });
  }
} 