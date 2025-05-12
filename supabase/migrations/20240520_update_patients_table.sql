-- Update patients table to support appointment-archive linkage
DO $$ 
BEGIN
    -- Add appointment_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'appointment_id'
    ) THEN
        ALTER TABLE patients ADD COLUMN appointment_id UUID;
    END IF;
    
    -- Add archived_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'archived_at'
    ) THEN
        ALTER TABLE patients ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Add primary_symptom column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'primary_symptom'
    ) THEN
        ALTER TABLE patients ADD COLUMN primary_symptom TEXT;
    END IF;
    
    -- Add additional_symptoms column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'additional_symptoms'
    ) THEN
        ALTER TABLE patients ADD COLUMN additional_symptoms JSONB;
    END IF;
    
    -- Add triage_score column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'triage_score'
    ) THEN
        ALTER TABLE patients ADD COLUMN triage_score TEXT;
    END IF;
    
    -- Add suggested_department column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'suggested_department'
    ) THEN
        ALTER TABLE patients ADD COLUMN suggested_department TEXT;
    END IF;
    
    -- Add estimated_wait_minutes column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'estimated_wait_minutes'
    ) THEN
        ALTER TABLE patients ADD COLUMN estimated_wait_minutes INTEGER;
    END IF;
    
    -- Add potential_diagnoses column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'potential_diagnoses'
    ) THEN
        ALTER TABLE patients ADD COLUMN potential_diagnoses JSONB;
    END IF;
    
    -- Add recommended_actions column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'recommended_actions'
    ) THEN
        ALTER TABLE patients ADD COLUMN recommended_actions JSONB;
    END IF;
    
    -- Add risk_factors column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'risk_factors'
    ) THEN
        ALTER TABLE patients ADD COLUMN risk_factors JSONB;
    END IF;
END $$; 