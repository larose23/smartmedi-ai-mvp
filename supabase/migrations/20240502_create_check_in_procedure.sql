-- Create a stored procedure to handle check-ins with flexible schema
CREATE OR REPLACE FUNCTION create_check_in(p_patient_id TEXT, p_symptoms JSONB)
RETURNS VOID AS $$
DECLARE
  column_exists BOOLEAN;
  table_exists BOOLEAN;
BEGIN
  -- First check if the check_ins table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'check_ins'
  ) INTO table_exists;
  
  -- If table doesn't exist, create it with minimal schema
  IF NOT table_exists THEN
    EXECUTE 'CREATE TABLE check_ins (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      patient_id TEXT,
      symptoms JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )';
  END IF;
  
  -- Try multiple methods with explicit column checking
  -- Method 1: Full schema insert (most common)
  BEGIN
    -- Check if all necessary columns exist
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'check_ins' 
      AND column_name = 'patient_id'
    ) INTO column_exists;
    
    IF column_exists THEN
      -- Check for triage_score column
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'check_ins' 
        AND column_name = 'triage_score'
      ) INTO column_exists;
      
      IF column_exists THEN
        -- Full schema insert
        INSERT INTO check_ins (
          patient_id, 
          symptoms, 
          triage_score, 
          suggested_department, 
          estimated_wait_minutes, 
          potential_diagnoses, 
          recommended_actions, 
          risk_factors
        ) VALUES (
          p_patient_id, 
          p_symptoms, 
          'Medium', 
          'General Medicine', 
          30, 
          ARRAY['Evaluation needed'], 
          ARRAY['Consult with doctor'], 
          ARRAY['None reported']
        );
        RETURN;
      ELSE
        -- Simplified insert without triage fields
        INSERT INTO check_ins (patient_id, symptoms) 
        VALUES (p_patient_id, p_symptoms);
        RETURN;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Continue to next attempt
    NULL;
  END;
  
  -- Method 2: Try with minimal data using a generic data JSONB column
  BEGIN
    -- First check if data column exists
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'check_ins' 
      AND column_name = 'data'
    ) INTO column_exists;
    
    IF column_exists THEN
      INSERT INTO check_ins (data) 
      VALUES (jsonb_build_object(
        'patient_id', p_patient_id,
        'symptoms', p_symptoms
      ));
      RETURN;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Continue to next attempt
    NULL;
  END;
  
  -- Method 3: Last resort - create a special log table and insert there
  BEGIN
    -- Check if the log table exists
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'check_in_logs'
    ) INTO table_exists;
    
    -- Create the log table if it doesn't exist
    IF NOT table_exists THEN
      EXECUTE 'CREATE TABLE check_in_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        patient_id TEXT,
        check_in_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )';
    END IF;
    
    -- Insert into the log table
    INSERT INTO check_in_logs (patient_id, check_in_data)
    VALUES (
      p_patient_id,
      jsonb_build_object(
        'patient_id', p_patient_id,
        'symptoms', p_symptoms,
        'created_at', CURRENT_TIMESTAMP
      )
    );
    RETURN;
  EXCEPTION WHEN OTHERS THEN
    -- If this also fails, raise an exception
    RAISE EXCEPTION 'Could not create check-in record using any available method';
  END;
END;
$$ LANGUAGE plpgsql;

-- Create a dedicated direct check-in procedure with minimal requirements
CREATE OR REPLACE FUNCTION direct_check_in(patient_name TEXT, patient_symptoms JSONB)
RETURNS VOID AS $$
DECLARE
  patient_id UUID;
  table_exists BOOLEAN;
BEGIN
  -- Generate a patient ID if needed
  patient_id := gen_random_uuid();
  
  -- First try to insert into patients table if it exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'patients'
  ) INTO table_exists;
  
  IF table_exists THEN
    BEGIN
      -- Try to create a patient record with minimal data
      INSERT INTO patients (id, name) 
      VALUES (patient_id, patient_name);
    EXCEPTION WHEN OTHERS THEN
      -- Ignore patient creation errors
      NULL;
    END;
  END IF;
  
  -- Call the main check-in procedure
  PERFORM create_check_in(patient_id::TEXT, patient_symptoms);
END;
$$ LANGUAGE plpgsql; 