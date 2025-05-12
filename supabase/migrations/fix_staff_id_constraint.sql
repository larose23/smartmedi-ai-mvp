-- First check if staff table exists, if not create it with minimal fields
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY,
  name TEXT
);

-- Then ensure we have our default staff member
INSERT INTO staff (id, name)
VALUES ('11111111-1111-1111-1111-111111111111', 'Auto Assign') 
ON CONFLICT (id) DO NOTHING;

-- Make staff_id nullable in appointments table
ALTER TABLE IF EXISTS appointments 
ALTER COLUMN staff_id DROP NOT NULL; 