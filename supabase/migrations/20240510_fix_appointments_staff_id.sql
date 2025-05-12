-- Comprehensive fix for appointments table staff_id issue

-- 1. Ensure staff table exists with the correct schema
CREATE TABLE IF NOT EXISTS staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  role TEXT,
  department TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Create default staff member with a fixed ID for consistent reference
INSERT INTO staff (
  id, 
  name, 
  role, 
  department, 
  first_name, 
  last_name,
  email
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Auto Assign',
  'system',
  'General',
  'Auto',
  'Assign',
  'system@smartmedi.ai'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email;

-- 3. Make staff_id nullable in the appointments table
ALTER TABLE IF EXISTS appointments 
ALTER COLUMN staff_id DROP NOT NULL;

-- 4. Check if there are any null staff_id values and set them to the default
UPDATE appointments 
SET staff_id = '11111111-1111-1111-1111-111111111111'
WHERE staff_id IS NULL;

-- 5. Set staff_id default value to our fixed staff ID for all new appointments
ALTER TABLE IF EXISTS appointments
ALTER COLUMN staff_id SET DEFAULT '11111111-1111-1111-1111-111111111111';

-- 6. Refresh tables to ensure schema changes are recognized
NOTIFY pgrst, 'reload schema'; 