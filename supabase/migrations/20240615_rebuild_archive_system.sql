-- Complete rebuild of the archive system
-- This migration creates or updates all necessary tables, columns, and functions

-- First, ensure the execute_sql function exists (used by the API)
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
    -- Add status column to check_ins table if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'check_ins' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE check_ins ADD COLUMN status TEXT;
        RAISE NOTICE 'Added status column to check_ins table';
    END IF;

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
      COALESCE(v_check_in.date_of_birth, NULL),
      COALESCE(v_check_in.gender, 'Not Specified'),
      COALESCE(v_check_in.contact_info, NULL),
      COALESCE(v_check_in.contact_info, NULL),
      COALESCE(v_check_in.full_name, 'Unknown Patient'),
      COALESCE(v_check_in.created_at, CURRENT_TIMESTAMP),
      p_appointment_id,
      CURRENT_TIMESTAMP,
      COALESCE(v_check_in.primary_symptom, NULL),
      COALESCE(v_check_in.additional_symptoms, NULL),
      COALESCE(v_check_in.triage_score, NULL),
      COALESCE(v_check_in.department, 'General'),
      COALESCE(v_check_in.estimated_wait_minutes, NULL),
      COALESCE(v_check_in.potential_diagnoses, NULL),
      COALESCE(v_check_in.recommended_actions, NULL),
      COALESCE(v_check_in.risk_factors, NULL)
    ) ON CONFLICT (id) DO UPDATE SET
      appointment_id = EXCLUDED.appointment_id,
      archived_at = EXCLUDED.archived_at,
      primary_symptom = COALESCE(EXCLUDED.primary_symptom, patients.primary_symptom),
      additional_symptoms = COALESCE(EXCLUDED.additional_symptoms, patients.additional_symptoms),
      triage_score = COALESCE(EXCLUDED.triage_score, patients.triage_score),
      suggested_department = COALESCE(EXCLUDED.suggested_department, patients.suggested_department),
      estimated_wait_minutes = COALESCE(EXCLUDED.estimated_wait_minutes, patients.estimated_wait_minutes),
      potential_diagnoses = COALESCE(EXCLUDED.potential_diagnoses, patients.potential_diagnoses),
      recommended_actions = COALESCE(EXCLUDED.recommended_actions, patients.recommended_actions),
      risk_factors = COALESCE(EXCLUDED.risk_factors, patients.risk_factors);
      
    v_success := TRUE;
    
    -- Commit the transaction
    RETURN v_success;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error in archive_check_in transaction: %', SQLERRM;
      RETURN FALSE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger function to automatically archive patients when an appointment is created/updated
CREATE OR REPLACE FUNCTION trigger_archive_on_appointment()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed for scheduled/booked appointments with a patient_id
    IF (NEW.status = 'scheduled' OR NEW.status = 'booked' OR NEW.status = 'confirmed') AND NEW.patient_id IS NOT NULL THEN
        -- Try to archive the patient
        PERFORM archive_check_in(NEW.patient_id, NEW.id);
        
        -- Log the archiving attempt
        RAISE NOTICE 'Attempted to archive patient % for appointment %', NEW.patient_id, NEW.id;
    END IF;
    
    -- Always return the NEW record to allow the operation to complete
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on the appointments table
DROP TRIGGER IF EXISTS appointment_archive_trigger ON appointments;

CREATE TRIGGER appointment_archive_trigger
AFTER INSERT OR UPDATE
ON appointments
FOR EACH ROW
EXECUTE FUNCTION trigger_archive_on_appointment();

-- Run immediate cleanup
-- Mark all completed check-ins as archived
UPDATE check_ins 
SET status = 'archived' 
WHERE status = 'completed' OR status IS NULL;

-- Update any patients without archived_at timestamps
UPDATE patients 
SET archived_at = NOW() 
WHERE archived_at IS NULL;

-- Migrate existing check-ins with appointments that aren't yet archived
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
        -- Get the latest appointment for this check-in
        SELECT * INTO appointment_row 
        FROM appointments
        WHERE patient_id = check_in_row.id
        ORDER BY appointment_date DESC
        LIMIT 1;
        
        -- Archive the check-in
        PERFORM archive_check_in(check_in_row.id, appointment_row.id);
        
        RAISE NOTICE 'Archived check-in % with appointment %', 
          check_in_row.id, appointment_row.id;
    END LOOP;
END $$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema'; 