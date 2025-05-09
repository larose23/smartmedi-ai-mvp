import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    console.log('[Run Migrations] Starting migration process');
    const supabase = createRouteHandlerClient({ cookies });
    
    // Read the migration files
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
    const newFixFile = path.join(migrationsDir, '20240615_rebuild_archive_system.sql');
    const oldFixFile = path.join(migrationsDir, '20240525_fix_archive_system.sql');
    const triggerFile = path.join(migrationsDir, '20240525_archive_trigger.sql');
    
    let results = {
      success: true,
      messages: [] as string[],
      errors: [] as string[]
    };
    
    // Check if files exist
    let primaryFixFile = '';
    if (fs.existsSync(newFixFile)) {
      primaryFixFile = newFixFile;
      results.messages.push('Using new consolidated archive fix file');
    } else if (fs.existsSync(oldFixFile)) {
      primaryFixFile = oldFixFile;
      results.messages.push('Using legacy archive fix file');
    } else {
      results.errors.push('No archive fix migration file found');
      results.success = false;
    }
    
    if (!results.success) {
      return NextResponse.json(results, { status: 404 });
    }
    
    // Read and execute the migrations
    const fixSql = fs.readFileSync(primaryFixFile, 'utf8');
    
    // Split the SQL into separate statements and execute each one
    try {
      // Execute the fix SQL directly
      console.log('[Run Migrations] Running archive fix migration');
      const { error: fixError } = await supabase.rpc('execute_sql', { sql_query: fixSql });
      
      if (fixError) {
        console.error('[Run Migrations] Error running fix migration:', fixError);
        results.errors.push(`Fix migration error: ${fixError.message}`);
        
        // Try alternative approach - execute each statement separately
        console.log('[Run Migrations] Trying alternative approach for fix migration');
        const statements = fixSql.split(';').filter(stmt => stmt.trim().length > 0);
        
        for (let i = 0; i < statements.length; i++) {
          const stmt = statements[i].trim() + ';';
          try {
            const { error } = await supabase.rpc('execute_sql', { sql_query: stmt });
            if (!error) {
              results.messages.push(`Statement ${i+1}/${statements.length} executed successfully`);
            } else {
              console.warn(`[Run Migrations] Statement ${i+1} error:`, error);
              results.errors.push(`Statement ${i+1} error: ${error.message}`);
            }
          } catch (e) {
            console.error(`[Run Migrations] Statement ${i+1} exception:`, e);
            results.errors.push(`Statement ${i+1} exception: ${String(e)}`);
          }
        }
      } else {
        results.messages.push('Fix migration executed successfully');
      }
      
      // Check if we should also run the legacy trigger file
      if (fs.existsSync(triggerFile) && primaryFixFile !== newFixFile) {
        // Only run the trigger file if we're not using the new consolidated fix
        console.log('[Run Migrations] Running trigger migration');
        const triggerSql = fs.readFileSync(triggerFile, 'utf8');
        const { error: triggerError } = await supabase.rpc('execute_sql', { sql_query: triggerSql });
        
        if (triggerError) {
          console.error('[Run Migrations] Error running trigger migration:', triggerError);
          results.errors.push(`Trigger migration error: ${triggerError.message}`);
          
          // Try alternative approach - execute each statement separately
          console.log('[Run Migrations] Trying alternative approach for trigger migration');
          const statements = triggerSql.split(';').filter(stmt => stmt.trim().length > 0);
          
          for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i].trim() + ';';
            try {
              const { error } = await supabase.rpc('execute_sql', { sql_query: stmt });
              if (!error) {
                results.messages.push(`Trigger statement ${i+1}/${statements.length} executed successfully`);
              } else {
                console.warn(`[Run Migrations] Trigger statement ${i+1} error:`, error);
                results.errors.push(`Trigger statement ${i+1} error: ${error.message}`);
              }
            } catch (e) {
              console.error(`[Run Migrations] Trigger statement ${i+1} exception:`, e);
              results.errors.push(`Trigger statement ${i+1} exception: ${String(e)}`);
            }
          }
        } else {
          results.messages.push('Trigger migration executed successfully');
        }
      }
      
      // Try to run a direct SQL cleanup for any remaining issues
      console.log('[Run Migrations] Running cleanup operations');
      const cleanupSql = `
        -- Mark all completed check-ins as archived
        UPDATE check_ins SET status = 'archived' WHERE status = 'completed';
        
        -- Update any patients without archived_at
        UPDATE patients SET archived_at = NOW() WHERE archived_at IS NULL;
      `;
      
      await supabase.rpc('execute_sql', { sql_query: cleanupSql });
      results.messages.push('Cleanup operations completed');
      
      // Finally, run a test of the archive function
      console.log('[Run Migrations] Testing archive function');
      const { data: testCheckIns, error: testError } = await supabase
        .from('check_ins')
        .select('id')
        .limit(1);
        
      if (testError) {
        console.error('[Run Migrations] Error finding test check-in:', testError);
      } else if (testCheckIns && testCheckIns.length > 0) {
        const testId = testCheckIns[0].id;
        
        // Test the archive function
        const { data, error } = await supabase
          .rpc('archive_check_in', { p_check_in_id: testId });
          
        if (error) {
          console.error('[Run Migrations] Error testing archive function:', error);
          results.errors.push(`Archive function test error: ${error.message}`);
        } else {
          console.log('[Run Migrations] Archive function test result:', data);
          results.messages.push(`Archive function tested successfully with ID ${testId}`);
        }
      }
    } catch (error) {
      console.error('[Run Migrations] Unhandled error:', error);
      results.errors.push(`Unhandled error: ${String(error)}`);
      results.success = false;
    }
    
    // Determine overall success
    results.success = results.errors.length === 0;
    
    return NextResponse.json({
      ...results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Run Migrations] Critical error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Critical error running migrations',
      error: String(error)
    }, { status: 500 });
  }
} 