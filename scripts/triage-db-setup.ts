import { supabase } from '../lib/supabase';

/**
 * Script to set up required tables for triage system in Supabase
 * Run with: npm run ts-node scripts/triage-db-setup.ts
 */
async function setupTriageDatabase() {
  console.log('Setting up triage system database tables...');
  
  try {
    // Create triage_responses table for storing all triage requests and responses
    const { error: responseTableError } = await supabase.rpc('create_triage_responses_table', {});
    
    if (responseTableError) {
      // If rpc doesn't exist, create the table directly
      const { error } = await supabase.query(`
        CREATE TABLE IF NOT EXISTS triage_responses (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          request JSONB NOT NULL,
          response JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL,
          is_training_example BOOLEAN DEFAULT FALSE
        );
      `);
      
      if (error) throw error;
      console.log('Created triage_responses table directly');
    } else {
      console.log('Created triage_responses table via RPC');
    }
    
    // Create triage_feedback table for storing clinician feedback
    const { error: feedbackTableError } = await supabase.rpc('create_triage_feedback_table', {});
    
    if (feedbackTableError) {
      const { error } = await supabase.query(`
        CREATE TABLE IF NOT EXISTS triage_feedback (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          triage_id UUID NOT NULL REFERENCES triage_responses(id),
          actual_triage_score TEXT NOT NULL,
          actual_priority_level INTEGER NOT NULL,
          actual_department TEXT NOT NULL,
          actual_diagnoses TEXT[] NOT NULL,
          feedback_comments TEXT,
          clinician_id TEXT NOT NULL,
          adjustments_made JSONB,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL
        );
      `);
      
      if (error) throw error;
      console.log('Created triage_feedback table directly');
    } else {
      console.log('Created triage_feedback table via RPC');
    }
    
    // Create triage_learning_state table for storing reinforcement learning state
    const { error: learningStateTableError } = await supabase.rpc('create_triage_learning_state_table', {});
    
    if (learningStateTableError) {
      const { error } = await supabase.query(`
        CREATE TABLE IF NOT EXISTS triage_learning_state (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          state JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL
        );
      `);
      
      if (error) throw error;
      console.log('Created triage_learning_state table directly');
    } else {
      console.log('Created triage_learning_state table via RPC');
    }
    
    // Create indexes for performance
    console.log('Creating indexes...');
    
    // Index on triage_responses.created_at for efficient time-based queries
    await supabase.query(`
      CREATE INDEX IF NOT EXISTS triage_responses_created_at_idx 
      ON triage_responses (created_at DESC);
    `);
    
    // Index on triage_feedback.triage_id for efficient lookups
    await supabase.query(`
      CREATE INDEX IF NOT EXISTS triage_feedback_triage_id_idx 
      ON triage_feedback (triage_id);
    `);
    
    // Index on triage_learning_state.created_at for efficient retrieval of latest state
    await supabase.query(`
      CREATE INDEX IF NOT EXISTS triage_learning_state_created_at_idx 
      ON triage_learning_state (created_at DESC);
    `);
    
    console.log('Successfully created all required triage system tables and indexes');
    
    // Initialize learning state with empty values if none exists
    const { data: existingState } = await supabase
      .from('triage_learning_state')
      .select('*')
      .limit(1);
    
    if (!existingState || existingState.length === 0) {
      console.log('Initializing learning state...');
      const initialState = {
        symptomWeights: {},
        diagnosisConfidence: {},
        departmentAccuracy: {},
        lastUpdated: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('triage_learning_state')
        .insert({
          state: initialState,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Error initializing learning state:', error);
      } else {
        console.log('Learning state initialized successfully');
      }
    }
    
  } catch (error) {
    console.error('Database setup error:', error);
    throw error;
  }
}

// Execute if this file is run directly
if (require.main === module) {
  setupTriageDatabase()
    .then(() => {
      console.log('Database setup complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('Database setup failed:', error);
      process.exit(1);
    });
}

export default setupTriageDatabase; 