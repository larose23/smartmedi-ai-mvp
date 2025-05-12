const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fixPatientsSchema() {
  console.log('Starting patients table schema fix...');
  
  // Add missing columns to patients table
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
  
  for (const column of columnsToAdd) {
    try {
      console.log(`Adding column ${column.name} to patients table...`);
      
      // Use direct SQL to add the column
      const { error } = await supabase.rpc(
        'execute_sql',
        { sql_query: `ALTER TABLE patients ADD COLUMN IF NOT EXISTS ${column.name} ${column.type};` }
      );
      
      if (error) {
        console.error(`Error adding column ${column.name}:`, error);
      } else {
        console.log(`Successfully added column ${column.name}`);
      }
    } catch (e) {
      console.error(`Exception when adding column ${column.name}:`, e);
    }
  }
  
  // Verify the schema changes
  try {
    console.log('Verifying patients table schema...');
    
    // Check if a column exists by attempting to select it
    const columnsToCheck = ['archived_at', 'appointment_id'];
    let allColumnsExist = true;
    
    for (const columnName of columnsToCheck) {
      const query = `SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = '${columnName}'
      ) as exists`;
      
      const { data, error } = await supabase.rpc('execute_sql', { sql_query: query });
      
      if (error) {
        console.error(`Error checking column ${columnName}:`, error);
        allColumnsExist = false;
      } else if (data && data[0] && data[0].exists === false) {
        console.error(`Column ${columnName} still does not exist in patients table`);
        allColumnsExist = false;
      } else {
        console.log(`Verified column ${columnName} exists`);
      }
    }
    
    if (allColumnsExist) {
      console.log('All required columns exist in patients table!');
    } else {
      console.error('Some columns are still missing from patients table');
    }
  } catch (e) {
    console.error('Error verifying schema changes:', e);
  }
  
  console.log('Schema fix process completed');
}

// Run the fix
fixPatientsSchema()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  }); 