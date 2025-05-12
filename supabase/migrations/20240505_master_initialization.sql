-- Master initialization script to set up all required database objects
DO $$ 
BEGIN
  -- Ensure patients table exists first
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'patients'
  ) THEN
    CREATE TABLE patients (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT,
      first_name TEXT,
      last_name TEXT,
      date_of_birth DATE,
      gender TEXT,
      email TEXT,
      phone TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Enable RLS
    ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
    
    -- Create policy
    CREATE POLICY "Patients are viewable by authenticated users" ON patients
      FOR SELECT USING (auth.role() = 'authenticated');
    
    CREATE POLICY "Patients can be inserted by authenticated users" ON patients
      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    
    CREATE POLICY "Patients can be updated by authenticated users" ON patients
      FOR UPDATE USING (auth.role() = 'authenticated');
    
    -- Create indices
    CREATE INDEX idx_patients_name ON patients(name);
    CREATE INDEX idx_patients_email ON patients(email);
  END IF;

  -- Check if the stored functions exist and create them if not
  IF NOT EXISTS (
    SELECT FROM pg_proc 
    WHERE proname = 'create_check_ins_table_if_not_exists'
  ) THEN
    -- Call the function creation SQL here - it will create it if it doesn't exist
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
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_proc 
    WHERE proname = 'create_check_in_logs_table_if_not_exists'
  ) THEN
    -- Create check_in_logs function
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
  END IF;
  
  -- Execute the functions to ensure tables exist
  PERFORM create_check_ins_table_if_not_exists();
  PERFORM create_check_in_logs_table_if_not_exists();

END $$; 