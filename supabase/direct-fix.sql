-- Super simplified fix script - direct solution for staff_id constraint

-- 1. Ensure staff table exists
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY, 
  name TEXT NOT NULL
);

-- 2. Ensure default staff exists
INSERT INTO staff (id, name)
VALUES ('11111111-1111-1111-1111-111111111111', 'Auto Assign')
ON CONFLICT (id) DO NOTHING;

-- 3. Make staff_id nullable - this is the critical fix
ALTER TABLE appointments 
ALTER COLUMN staff_id DROP NOT NULL;

-- 4. Set default value
ALTER TABLE appointments
ALTER COLUMN staff_id SET DEFAULT '11111111-1111-1111-1111-111111111111'; 