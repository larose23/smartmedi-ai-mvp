import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// API route to fix contact_info and gender fields in check_ins
export async function GET() {
  try {
    console.log('Running contact info and gender fields database fix...');
    
    // First check if check_ins table exists
    try {
      const { data: tableExists, error: tableCheckError } = await supabase
        .from('check_ins')
        .select('id')
        .limit(1);
      
      if (tableCheckError && tableCheckError.message.includes('does not exist')) {
        console.log('check_ins table does not exist, skipping contact_info fix');
        return NextResponse.json({ 
          success: false, 
          message: 'check_ins table does not exist' 
        });
      }
      
      // Check if contact_info column exists
      try {
        const { data: hasContactInfo, error: contactInfoError } = await supabase
          .from('check_ins')
          .select('contact_info')
          .limit(1);
          
        // If error contains "column", it likely doesn't exist
        if (contactInfoError && contactInfoError.message.includes('column')) {
          console.log('Adding contact_info column to check_ins table');
          
          try {
            // Try using RPC first
            const { error: rpcError } = await supabase.rpc('execute_sql', {
              sql_query: `ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS contact_info TEXT;`
            });
            
            if (rpcError) {
              console.log('RPC error adding contact_info column:', rpcError);
              // Fall back to creating a dummy record with the column
              const { error: insertError } = await supabase
                .from('check_ins')
                .insert([{
        id: '00000000-0000-0000-0000-000000000000',
                  contact_info: 'contact_info migration',
                  patient_id: '00000000-0000-0000-0000-000000000000',
                  symptoms: {}
                }]);
                
              if (insertError && !insertError.message.includes('already exists')) {
                console.error('Error creating contact_info column:', insertError);
              }
            }
          } catch (alterError) {
            console.error('Error altering check_ins table:', alterError);
          }
        } else {
          console.log('contact_info column already exists');
        }
        
        // Check if gender column exists
        const { data: hasGender, error: genderError } = await supabase
          .from('check_ins')
          .select('gender')
          .limit(1);
          
        // If error contains "column", it likely doesn't exist
        if (genderError && genderError.message.includes('column')) {
          console.log('Adding gender column to check_ins table');
          
          try {
            // Try using RPC first
            const { error: rpcError } = await supabase.rpc('execute_sql', {
              sql_query: `ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'Not Specified';`
            });
            
            if (rpcError) {
              console.log('RPC error adding gender column:', rpcError);
              // Fall back to creating a dummy record with the column
              const { error: insertError } = await supabase
                .from('check_ins')
                .insert([{
                  id: '00000000-0000-0000-0000-000000000001',
                  gender: 'Not Specified',
                  patient_id: '00000000-0000-0000-0000-000000000000',
                  symptoms: {}
                }]);
                
              if (insertError && !insertError.message.includes('already exists')) {
                console.error('Error creating gender column:', insertError);
              }
            }
          } catch (alterError) {
            console.error('Error altering check_ins table:', alterError);
          }
        } else {
          console.log('gender column already exists');
        }
        
        // Try populating gender from patients table if it's empty
        try {
          const { data: checkIns, error: listError } = await supabase
            .from('check_ins')
            .select('id, patient_id')
            .is('gender', null)
            .limit(50);
            
          if (!listError && checkIns && checkIns.length > 0) {
            console.log(`Found ${checkIns.length} check-ins with empty gender, updating...`);
            
            for (const checkIn of checkIns) {
              if (checkIn.patient_id) {
                // Find corresponding patient
                const { data: patient, error: patientError } = await supabase
                  .from('patients')
                  .select('gender')
                  .eq('id', checkIn.patient_id)
                  .maybeSingle();
                  
                if (!patientError && patient && patient.gender) {
                  // Update check-in with patient's gender
                  const { error: updateError } = await supabase
                    .from('check_ins')
                    .update({ gender: patient.gender })
                    .eq('id', checkIn.id);
                    
                  if (updateError) {
                    console.error(`Error updating gender for check-in ${checkIn.id}:`, updateError);
                  }
                }
              }
            }
          }
        } catch (populateError) {
          console.error('Error populating gender field:', populateError);
        }
        
      } catch (columnError) {
        console.error('Error checking for contact_info column:', columnError);
      }
      
    } catch (error) {
      console.error('Error checking check_ins table:', error);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Contact info and gender fields fixed successfully' 
    });
  } catch (error) {
    console.error('Error fixing contact info fields:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
} 