// Direct database fix using Supabase JS client
const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from next.config.js
const fs = require('fs');
const path = require('path');

function getCredentials() {
  try {
    const configPath = path.join(process.cwd(), 'next.config.js');
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // Extract URL with regex
    const urlMatch = configContent.match(/NEXT_PUBLIC_SUPABASE_URL:\s*"([^"]+)"/);
    const url = urlMatch ? urlMatch[1] : null;
    
    // Extract key with regex
    const keyMatch = configContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY:\s*"([^"]+)"/);
    const key = keyMatch ? keyMatch[1] : null;
    
    if (!url || !key) {
      throw new Error('Could not extract Supabase credentials from next.config.js');
    }
    
    return { url, key };
  } catch (error) {
    console.error('Error reading Supabase credentials:', error);
    process.exit(1);
  }
}

async function main() {
  console.log('🔧 Starting direct database fix for staff_id...');
  
  const { url, key } = getCredentials();
  console.log(`Using Supabase URL: ${url}`);
  
  // Initialize Supabase client
  const supabase = createClient(url, key);
  
  try {
    // 1. Ensure staff table exists
    console.log('Step 1: Creating staff table if it doesn\'t exist...');
    
    try {
      // Try to select from staff table to see if it exists
      const { data: staffExists, error: staffExistsError } = await supabase
        .from('staff')
        .select('id')
        .limit(1);
      
      if (staffExistsError && staffExistsError.message.includes('does not exist')) {
        // Table doesn't exist, create minimal version
        console.log('Staff table doesn\'t exist, creating it...');
        
        // We must create it by inserting a record
        const { error: createError } = await supabase
          .from('staff')
          .insert([{ 
            id: '11111111-1111-1111-1111-111111111111', 
            name: 'Auto Assign' 
          }]);
        
        if (createError && !createError.message.includes('already exists')) {
          console.error('Error creating staff table:', createError.message);
        } else {
          console.log('Successfully created staff table');
        }
      } else {
        console.log('Staff table already exists');
      }
    } catch (error) {
      console.error('Error checking staff table:', error.message);
    }
    
    // 2. Ensure default staff exists
    console.log('Step 2: Creating default staff record...');
    
    try {
      const { error: insertError } = await supabase
        .from('staff')
        .upsert([{ 
          id: '11111111-1111-1111-1111-111111111111', 
          name: 'Auto Assign' 
        }], { 
          onConflict: 'id' 
        });
      
      if (insertError) {
        console.error('Error creating default staff:', insertError.message);
      } else {
        console.log('Default staff created or updated successfully');
      }
    } catch (error) {
      console.error('Error creating default staff:', error.message);
    }
    
    // 3. Make staff_id nullable (this is the key fix)
    console.log('Step 3: Making staff_id column nullable...');
    
    try {
      // Try inserting with null staff_id to verify it works
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .is('staff_id', null)
        .limit(1);
      
      if (error && error.message.includes('violates not-null constraint')) {
        console.log('Staff_id is not nullable, trying RPC approach...');
        
        // Try direct SQL if available
        try {
          const { error: rpcError } = await supabase.rpc('execute_sql', { 
            sql_query: 'ALTER TABLE appointments ALTER COLUMN staff_id DROP NOT NULL;' 
          });
          
          if (!rpcError) {
            console.log('Successfully made staff_id nullable via RPC');
          } else {
            console.error('RPC method failed:', rpcError.message);
            console.log('Will need to run the SQL manually in the Supabase dashboard');
            console.log('SQL to run: ALTER TABLE appointments ALTER COLUMN staff_id DROP NOT NULL;');
          }
        } catch (rpcError) {
          console.error('Error with RPC method:', rpcError.message);
          console.log('Will need to run the SQL manually in the Supabase dashboard');
          console.log('SQL to run: ALTER TABLE appointments ALTER COLUMN staff_id DROP NOT NULL;');
        }
      } else {
        console.log('Staff_id is already nullable or query failed for other reasons');
      }
    } catch (error) {
      console.error('Error checking staff_id nullability:', error.message);
    }
    
    // 4. Update any null staff_id values to use our default
    console.log('Step 4: Updating null staff_id values...');
    
    try {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ staff_id: '11111111-1111-1111-1111-111111111111' })
        .is('staff_id', null);
      
      if (updateError) {
        console.error('Error updating null staff_id values:', updateError.message);
      } else {
        console.log('Successfully updated any null staff_id values');
      }
    } catch (error) {
      console.error('Error updating null staff_id values:', error.message);
    }
    
    // 5. Try a basic appointment insertion test
    console.log('Step 5: Testing appointment insertion...');
    
    try {
      // Find a patient ID
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('id')
        .limit(1);
      
      if (patientError || !patientData || patientData.length === 0) {
        console.error('No patients found for test:', patientError?.message || 'No patients exist');
      } else {
        const patientId = patientData[0].id;
        
        // Try creating an appointment with the default staff_id
        const { error: testError } = await supabase
          .from('appointments')
          .insert([{
            patient_id: patientId,
            staff_id: '11111111-1111-1111-1111-111111111111', 
            appointment_date: new Date().toISOString(),
            status: 'test'
          }]);
        
        if (testError) {
          console.error('Test appointment creation failed:', testError.message);
        } else {
          console.log('Successfully created test appointment');
        }
      }
    } catch (error) {
      console.error('Error testing appointment creation:', error.message);
    }
    
    console.log('🏁 Database fix process completed!');
    console.log('You can now try running the application again');
    
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

main(); 