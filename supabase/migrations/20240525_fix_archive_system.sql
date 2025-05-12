-- Complete fix for patient archive system
-- This migration addresses all missing columns needed for the archive to work properly

-- First, check if the execute_sql function exists and create it if not
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_proc WHERE proname = 'execute_sql'
  ) THEN
    CREATE OR REPLACE FUNCTION public.execute_sql(sql_query text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql_query;
    END;
    $$;
    
    RAISE NOTICE 'Created execute_sql function';
  END IF;
END $$;

-- Add all missing columns to the patients table
DO $$ 
BEGIN
    -- Add archived_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'archived_at'
    ) THEN
        ALTER TABLE patients ADD COLUMN archived_at TIMESTAMPTZ;
        RAISE NOTICE 'Added archived_at column to patients table';
    END IF;
    
    -- Add appointment_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients'
        AND column_name = 'appointment_id'
    ) THEN
        ALTER TABLE patients ADD COLUMN appointment_id UUID;
        RAISE NOTICE 'Added appointment_id column to patients table';
    END IF;
    
    -- Add additional_symptoms column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'additional_symptoms'
    ) THEN
        ALTER TABLE patients ADD COLUMN additional_symptoms JSONB;
        RAISE NOTICE 'Added additional_symptoms column to patients table';
    END IF;
    
    -- Add primary_symptom column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'primary_symptom'
    ) THEN
        ALTER TABLE patients ADD COLUMN primary_symptom TEXT;
        RAISE NOTICE 'Added primary_symptom column to patients table';
    END IF;
    
    -- Add triage_score column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'triage_score'
    ) THEN
        ALTER TABLE patients ADD COLUMN triage_score TEXT;
        RAISE NOTICE 'Added triage_score column to patients table';
    END IF;
    
    -- Add suggested_department column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'suggested_department'
    ) THEN
        ALTER TABLE patients ADD COLUMN suggested_department TEXT;
        RAISE NOTICE 'Added suggested_department column to patients table';
    END IF;
    
    -- Add estimated_wait_minutes column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'estimated_wait_minutes'
    ) THEN
        ALTER TABLE patients ADD COLUMN estimated_wait_minutes INTEGER;
        RAISE NOTICE 'Added estimated_wait_minutes column to patients table';
    END IF;
    
    -- Add potential_diagnoses column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'potential_diagnoses'
    ) THEN
        ALTER TABLE patients ADD COLUMN potential_diagnoses TEXT[];
        RAISE NOTICE 'Added potential_diagnoses column to patients table';
    END IF;
    
    -- Add recommended_actions column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'recommended_actions'
    ) THEN
        ALTER TABLE patients ADD COLUMN recommended_actions TEXT[];
        RAISE NOTICE 'Added recommended_actions column to patients table';
    END IF;
    
    -- Add risk_factors column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'risk_factors'
    ) THEN
        ALTER TABLE patients ADD COLUMN risk_factors TEXT[];
        RAISE NOTICE 'Added risk_factors column to patients table';
    END IF;
    
    -- Add phone_number column if it doesn't exist (needed by some archive code)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'phone_number'
    ) THEN
        ALTER TABLE patients ADD COLUMN phone_number TEXT;
        RAISE NOTICE 'Added phone_number column to patients table';
    END IF;
    
    -- Add contact column if it doesn't exist (needed by some archive code)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'contact'
    ) THEN
        ALTER TABLE patients ADD COLUMN contact TEXT;
        RAISE NOTICE 'Added contact column to patients table';
    END IF;
END $$;

-- Create or replace the archive_check_in function
CREATE OR REPLACE FUNCTION archive_check_in(
  p_check_in_id UUID,
  p_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_check_in RECORD;
  v_success BOOLEAN := FALSE;
BEGIN
  -- Start transaction
  BEGIN
    -- First, check if the check-in exists
    SELECT * INTO v_check_in 
    FROM check_ins 
    WHERE id = p_check_in_id;
    
    IF v_check_in IS NULL THEN
      RAISE EXCEPTION 'Check-in with ID % not found', p_check_in_id;
    END IF;
    
    -- Update the check-in status to 'archived'
    UPDATE check_ins 
    SET status = 'archived' 
    WHERE id = p_check_in_id;
    
    -- Create or update the patient record in the patients table
    -- Using UPSERT to handle cases where the patient might already exist
    INSERT INTO patients (
      id,
      first_name,
      last_name,
      date_of_birth,
      gender,
      contact,
      phone_number,
      name,
      created_at,
      appointment_id,
      archived_at,
      primary_symptom,
      additional_symptoms,
      triage_score,
      suggested_department,
      estimated_wait_minutes,
      potential_diagnoses,
      recommended_actions,
      risk_factors
    ) VALUES (
      v_check_in.id,
      COALESCE(SPLIT_PART(v_check_in.full_name, ' ', 1), 'Unknown'),
      CASE 
        WHEN v_check_in.full_name IS NULL OR POSITION(' ' IN v_check_in.full_name) = 0 THEN 'Patient'
        ELSE SUBSTRING(v_check_in.full_name FROM POSITION(' ' IN v_check_in.full_name) + 1)
      END,
      COALESCE(v_check_in.date_of_birth, 'Not Available'),
      COALESCE(v_check_in.gender, 'Not Specified'),
      COALESCE(v_check_in.contact_info, 'Not Available'),
      COALESCE(v_check_in.contact_info, 'Not Available'),
      COALESCE(v_check_in.full_name, 'Unknown Patient'),
      COALESCE(v_check_in.created_at, CURRENT_TIMESTAMP),
      p_appointment_id,
      CURRENT_TIMESTAMP,
      v_check_in.primary_symptom,
      v_check_in.additional_symptoms,
      v_check_in.triage_score,
      v_check_in.suggested_department,
      v_check_in.estimated_wait_minutes,
      v_check_in.potential_diagnoses,
      v_check_in.recommended_actions,
      v_check_in.risk_factors
    )
    ON CONFLICT (id) DO UPDATE SET
      appointment_id = EXCLUDED.appointment_id,
      archived_at = EXCLUDED.archived_at;
    
    v_success := TRUE;
    RETURN v_success;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log the error and return false
    RAISE NOTICE 'Error in archive_check_in: %', SQLERRM;
    RETURN FALSE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Add status column to check_ins table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'check_ins' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE check_ins ADD COLUMN status TEXT DEFAULT 'active';
        RAISE NOTICE 'Added status column to check_ins table';
    END IF;
END $$;

-- Mark all completed check-ins as archived
UPDATE check_ins 
SET status = 'archived' 
WHERE status IS NULL OR status = 'completed';

-- Try to migrate existing patients from check_ins who already have appointments
DO $$
DECLARE
    check_in_row RECORD;
    appointment_row RECORD;
BEGIN
    FOR check_in_row IN 
        SELECT c.id, c.* 
        FROM check_ins c
        JOIN appointments a ON a.patient_id = c.id
        WHERE c.status IS NULL OR c.status <> 'archived'
    LOOP
        -- Get the appointment for this check-in
        SELECT * INTO appointment_row 
        FROM appointments
        WHERE patient_id = check_in_row.id
        LIMIT 1;
        
        -- Archive the check-in
        PERFORM archive_check_in(check_in_row.id, appointment_row.id);
        
        RAISE NOTICE 'Archived check-in % with appointment %', 
          check_in_row.id, appointment_row.id;
    END LOOP;
END $$; 