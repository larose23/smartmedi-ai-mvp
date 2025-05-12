-- Create a function to ensure check_ins table exists
CREATE OR REPLACE FUNCTION create_check_ins_table_if_not_exists()
RETURNS VOID AS $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  -- Check if check_ins table exists
  SELECT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'check_ins'
  ) INTO table_exists;
  
  -- Create the table if it doesn't exist
  IF NOT table_exists THEN
    EXECUTE '
      CREATE TABLE check_ins (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        patient_id TEXT NOT NULL,
        symptoms JSONB NOT NULL,
        triage_score TEXT DEFAULT ''Medium'' CHECK (triage_score IN (''High'', ''Medium'', ''Low'')),
        suggested_department TEXT DEFAULT ''General Medicine'',
        estimated_wait_minutes INTEGER DEFAULT 30,
        potential_diagnoses TEXT[] DEFAULT ARRAY[''Evaluation needed''],
        recommended_actions TEXT[] DEFAULT ARRAY[''Consult with doctor''],
        risk_factors TEXT[] DEFAULT ARRAY[''None reported''],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    ';
    
    -- Enable RLS
    EXECUTE 'ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY';
    
    -- Create policies
    EXECUTE '
      CREATE POLICY "Check-ins are viewable by authenticated users" ON check_ins
        FOR SELECT USING (auth.role() = ''authenticated'')
    ';
    
    EXECUTE '
      CREATE POLICY "Check-ins can be inserted by authenticated users" ON check_ins
        FOR INSERT WITH CHECK (auth.role() = ''authenticated'')
    ';
    
    -- Create indices
    EXECUTE 'CREATE INDEX idx_check_ins_patient_id ON check_ins(patient_id)';
    EXECUTE 'CREATE INDEX idx_check_ins_created_at ON check_ins(created_at DESC)';
  END IF;
END;
$$ LANGUAGE plpgsql; 