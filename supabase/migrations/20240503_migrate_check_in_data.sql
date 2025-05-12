-- Migrate any existing check-in data
DO $$
DECLARE
  old_check_ins_table_exists BOOLEAN;
  new_check_ins_table_exists BOOLEAN;
  check_in_logs_table_exists BOOLEAN;
  source_table_name TEXT;
BEGIN
  -- Check if various tables exist
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'check_ins'
  ) INTO new_check_ins_table_exists;
  
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'check_in_logs'
  ) INTO check_in_logs_table_exists;
  
  -- Only proceed if new check_ins table exists
  IF NOT new_check_ins_table_exists THEN
    RAISE NOTICE 'check_ins table does not exist, nothing to migrate';
    RETURN;
  END IF;
  
  -- Create check_in_logs if it doesn't exist
  IF NOT check_in_logs_table_exists THEN
    CREATE TABLE check_in_logs (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      patient_id TEXT,
      check_in_data JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
    );
    
    -- Enable RLS on the new table
    ALTER TABLE check_in_logs ENABLE ROW LEVEL SECURITY;
    
    -- Create policy
    CREATE POLICY "Check-in logs are viewable by authenticated users" ON check_in_logs
      FOR SELECT USING (auth.role() = 'authenticated');
    
    CREATE POLICY "Check-in logs can be inserted by authenticated users" ON check_in_logs
      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    
    RAISE NOTICE 'Created check_in_logs table';
  END IF;
  
  -- Migrate data from check_ins to check_in_logs for backup
  BEGIN
    -- Check if any records exist
    IF EXISTS (SELECT 1 FROM check_ins LIMIT 1) THEN
      -- Copy data to logs table
      INSERT INTO check_in_logs (patient_id, check_in_data, created_at)
      SELECT 
        patient_id,
        jsonb_build_object(
          'patient_id', patient_id,
          'symptoms', symptoms,
          'triage_score', triage_score,
          'suggested_department', suggested_department,
          'estimated_wait_minutes', estimated_wait_minutes,
          'potential_diagnoses', potential_diagnoses,
          'recommended_actions', recommended_actions,
          'risk_factors', risk_factors,
          'created_at', created_at
        ),
        created_at
      FROM check_ins
      -- Avoid duplicates
      WHERE NOT EXISTS (
        SELECT 1 FROM check_in_logs 
        WHERE check_in_logs.patient_id = check_ins.patient_id 
        AND check_in_logs.created_at = check_ins.created_at
      );
      
      RAISE NOTICE 'Migrated check-in data to logs table';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error migrating check-in data: %', SQLERRM;
  END;
END $$; 