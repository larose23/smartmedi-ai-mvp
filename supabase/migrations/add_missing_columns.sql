-- Add missing columns to patients table
DO $$ 
BEGIN
    -- Add archived_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'archived_at'
    ) THEN
        ALTER TABLE patients ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added archived_at column to patients table';
    ELSE
        RAISE NOTICE 'archived_at column already exists in patients table';
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
    ELSE
        RAISE NOTICE 'appointment_id column already exists in patients table';
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
    ELSE
        RAISE NOTICE 'additional_symptoms column already exists in patients table';
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
    ELSE
        RAISE NOTICE 'primary_symptom column already exists in patients table';
    END IF;
    
    -- Create the archive_check_in function if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM pg_proc WHERE proname = 'archive_check_in'
    ) THEN
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
              contact,
              phone_number,
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
              COALESCE(v_check_in.date_of_birth, 'Not Available'),
              COALESCE(v_check_in.gender, 'Not Specified'),
              COALESCE(v_check_in.contact_info, 'Not Available'),
              COALESCE(v_check_in.contact_info, 'Not Available'),
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
              contact = EXCLUDED.contact,
              phone_number = EXCLUDED.phone_number,
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
        
        RAISE NOTICE 'Created archive_check_in function';
    ELSE
        RAISE NOTICE 'archive_check_in function already exists';
    END IF;
    
    -- Mark completed check-ins as archived
    UPDATE check_ins 
    SET status = 'archived' 
    WHERE status = 'completed';
    
    RAISE NOTICE 'Marked completed check-ins as archived';
END $$; 