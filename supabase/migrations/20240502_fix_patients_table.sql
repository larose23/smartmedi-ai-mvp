-- Fix patients table to make date_of_birth nullable
DO $$ 
BEGIN
    -- Check if 'date_of_birth' column exists and make it nullable
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'date_of_birth'
    ) THEN
        ALTER TABLE patients ALTER COLUMN date_of_birth DROP NOT NULL;
    END IF;
    
    -- Check if 'gender' column exists and make it nullable
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'gender'
    ) THEN
        ALTER TABLE patients ALTER COLUMN gender DROP NOT NULL;
    END IF;
    
    -- Check if 'first_name' column exists and make it nullable
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'first_name'
    ) THEN
        ALTER TABLE patients ALTER COLUMN first_name DROP NOT NULL;
    END IF;
    
    -- Check if 'last_name' column exists and make it nullable
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'last_name'
    ) THEN
        ALTER TABLE patients ALTER COLUMN last_name DROP NOT NULL;
    END IF;
    
    -- Add name column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'name'
    ) THEN
        ALTER TABLE patients ADD COLUMN name TEXT;
    END IF;
    
    -- Add date_of_birth if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'date_of_birth'
    ) THEN
        ALTER TABLE patients ADD COLUMN date_of_birth DATE;
    END IF;
    
    -- Add gender if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'gender'
    ) THEN
        ALTER TABLE patients ADD COLUMN gender TEXT;
    END IF;
END $$; 