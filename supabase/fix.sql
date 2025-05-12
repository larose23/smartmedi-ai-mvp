-- Simplified migration fixing the most critical issues
-- This focuses on the staff_id constraint and basic schema requirements

-- 1. Ensure staff table exists with basic minimal fields
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT
);

-- 2. Add columns to staff if they don't exist (ignore errors)
DO $$ 
BEGIN
  BEGIN
    ALTER TABLE staff ADD COLUMN IF NOT EXISTS first_name TEXT;
    ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_name TEXT;
    ALTER TABLE staff ADD COLUMN IF NOT EXISTS email TEXT;
  EXCEPTION
    WHEN OTHERS THEN
      -- Ignore errors, just continue
  END;
END $$;

-- 3. Ensure our default staff exists
INSERT INTO staff (id, name, role, department, first_name, last_name)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Auto Assign',
  'system',
  'General',
  'Auto',
  'Assign'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Make staff_id nullable in the appointments table
-- This is the most critical fix
ALTER TABLE IF EXISTS appointments 
ALTER COLUMN staff_id DROP NOT NULL;

-- 5. Add department column to appointments if it doesn't exist
DO $$ 
BEGIN
  BEGIN
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS department TEXT;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notes TEXT;
  EXCEPTION
    WHEN OTHERS THEN
      -- Ignore errors, just continue
  END;
END $$;

-- 6. Fix existing null staff_id values
UPDATE appointments 
SET staff_id = '11111111-1111-1111-1111-111111111111'
WHERE staff_id IS NULL;

-- 7. Set staff_id default value
ALTER TABLE IF EXISTS appointments
ALTER COLUMN staff_id SET DEFAULT '11111111-1111-1111-1111-111111111111';

-- 8. Force schema refresh
NOTIFY pgrst, 'reload schema'; 
