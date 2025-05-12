-- Create a function to ensure check_in_logs table exists
CREATE OR REPLACE FUNCTION create_check_in_logs_table_if_not_exists()
RETURNS VOID AS $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  -- Check if check_in_logs table exists
  SELECT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'check_in_logs'
  ) INTO table_exists;
  
  -- Create the table if it doesn't exist
  IF NOT table_exists THEN
    EXECUTE '
      CREATE TABLE check_in_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        patient_id TEXT,
        check_in_data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    ';
    
    -- Enable RLS
    EXECUTE 'ALTER TABLE check_in_logs ENABLE ROW LEVEL SECURITY';
    
    -- Create policies
    EXECUTE '
      CREATE POLICY "Check-in logs are viewable by authenticated users" ON check_in_logs
        FOR SELECT USING (auth.role() = ''authenticated'')
    ';
    
    EXECUTE '
      CREATE POLICY "Check-in logs can be inserted by authenticated users" ON check_in_logs
        FOR INSERT WITH CHECK (auth.role() = ''authenticated'')
    ';
    
    -- Create indices
    EXECUTE 'CREATE INDEX idx_check_in_logs_patient_id ON check_in_logs(patient_id)';
    EXECUTE 'CREATE INDEX idx_check_in_logs_created_at ON check_in_logs(created_at DESC)';
  END IF;
END;
$$ LANGUAGE plpgsql; 