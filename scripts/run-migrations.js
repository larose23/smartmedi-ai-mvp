const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local'), encoding: 'utf8', debug: true });

console.log('DEBUG: NEXT_PUBLIC_SUPABASE_URL is', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'defined' : 'undefined');
console.log('DEBUG: SUPABASE_SERVICE_ROLE_KEY is', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'defined' : 'undefined');

const { exec } = require('child_process');
const fs = require('fs');

console.log('Starting database migration script...');

// Get the Supabase project reference and API key from environment variables or .env file
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Function to run a migration file via the REST API
async function runMigration(migrationFile) {
  try {
    console.log(`Running migration: ${migrationFile}...`);
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Run the SQL via the Supabase REST API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      },
      body: JSON.stringify({ sql_query: sql })
    });
    
    if (response.ok) {
      console.log(`Migration ${migrationFile} completed successfully.`);
    } else {
      const error = await response.json();
      console.error(`Error running migration ${migrationFile}:`, error);
    }
  } catch (error) {
    console.error(`Error processing migration ${migrationFile}:`, error);
  }
}

// Main function to run all migrations
async function runAllMigrations() {
  try {
    // Define the migration files to run, in order
    const migrations = [
      '20240511_archive_check_in_function.sql',
      '20240525_archive_trigger.sql',
      '20240520_update_patients_table.sql',
      // Add other migration files here if needed
    ];
    
    // Run each migration in sequence
    for (const migration of migrations) {
      await runMigration(migration);
    }
    
    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

// Execute the migrations
runAllMigrations(); 