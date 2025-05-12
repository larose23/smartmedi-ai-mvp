#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

// Get Supabase credentials from environment or .env file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('🔧 Starting database migration process...');
  
  // 1. Apply our custom fix migration first
  console.log('📄 Applying special appointments fix migration...');
  
  try {
    const fixMigrationPath = path.join(process.cwd(), 'supabase/migrations/20240510_fix_appointments_staff_id.sql');
    if (fs.existsSync(fixMigrationPath)) {
      const sql = fs.readFileSync(fixMigrationPath, 'utf8');
      
      // Try to execute with rpc first
      try {
        await supabase.rpc('execute_sql', { sql_query: sql });
        console.log('✅ Successfully applied fix migration using RPC');
      } catch (rpcError) {
        console.log('⚠️ Could not use RPC, trying direct SQL...');
        
        // If running locally with Supabase CLI, use the CLI directly
        try {
          execSync('npx supabase migration up --file=20240510_fix_appointments_staff_id.sql', { stdio: 'inherit' });
          console.log('✅ Successfully applied fix migration using Supabase CLI');
        } catch (cliError) {
          console.log('⚠️ CLI approach failed, please run the SQL manually:', cliError.message);
          console.log('📋 SQL to run:\n', sql);
        }
      }
    } else {
      console.log('⚠️ Fix migration file not found');
    }
  } catch (error) {
    console.error('❌ Error applying fix migration:', error.message);
  }
  
  // 2. Try to run all other migrations
  console.log('\n📦 Attempting to run all migrations...');
  try {
    execSync('npx supabase migration up', { stdio: 'inherit' });
    console.log('✅ All migrations applied successfully');
  } catch (error) {
    console.error('❌ Error applying all migrations:', error.message);
  }
  
  // 3. Create the fix-schema endpoint functionality directly
  console.log('\n🔄 Running direct schema fixes...');
  try {
    // Create default staff record
    const defaultStaffId = '11111111-1111-1111-1111-111111111111';
    
    const { error: staffError } = await supabase
      .from('staff')
      .upsert([{
        id: defaultStaffId,
        name: 'Auto Assign',
        role: 'system',
        department: 'General',
        first_name: 'Auto',
        last_name: 'Assign',
        email: 'system@smartmedi.ai',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }], { 
        onConflict: 'id'
      });
      
    if (staffError) {
      console.error('❌ Error creating default staff:', staffError.message);
    } else {
      console.log('✅ Default staff record created/updated');
    }
    
    // Make staff_id nullable
    try {
      const { error: nullableError } = await supabase.rpc('execute_sql', { 
        sql_query: 'ALTER TABLE IF EXISTS appointments ALTER COLUMN staff_id DROP NOT NULL;' 
      });
      
      if (!nullableError) {
        console.log('✅ Made staff_id nullable');
      } else {
        console.error('❌ Error making staff_id nullable:', nullableError.message);
      }
    } catch (nullableError) {
      console.error('❌ Error making staff_id nullable:', nullableError.message);
    }
    
    // Update any null staff_id values
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ staff_id: defaultStaffId })
      .is('staff_id', null);
      
    if (updateError) {
      console.error('❌ Error updating null staff_id values:', updateError.message);
    } else {
      console.log('✅ Updated any null staff_id values');
    }
  } catch (error) {
    console.error('❌ Error during direct schema fixes:', error.message);
  }
  
  console.log('\n🏁 Database migration process completed!');
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
}); 