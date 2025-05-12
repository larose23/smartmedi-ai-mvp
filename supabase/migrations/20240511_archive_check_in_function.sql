-- Migration to install the archive_check_in function

-- Function to archive a check-in and create a patient record in a single transaction
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
    INSERT INTO patients (
      id,
      first_name,
      last_name,
      date_of_birth,
      gender,
      phone,
      name,
      created_at,
      appointment_id,
      archived_at
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
      COALESCE(v_check_in.full_name, 'Unknown Patient'),
      COALESCE(v_check_in.created_at, CURRENT_TIMESTAMP),
      p_appointment_id,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      date_of_birth = EXCLUDED.date_of_birth,
      gender = EXCLUDED.gender,
      phone = EXCLUDED.phone,
      name = EXCLUDED.name,
      appointment_id = EXCLUDED.appointment_id,
      archived_at = EXCLUDED.archived_at;
    
    v_success := TRUE;
    
    -- If we got here, the transaction was successful
    RETURN v_success;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error
      RAISE NOTICE 'Error in archive_check_in function: %', SQLERRM;
      RETURN FALSE;
  END;
END;
$$ LANGUAGE plpgsql; 