-- Make staff_id optional in appointments table
ALTER TABLE appointments ALTER COLUMN staff_id DROP NOT NULL; 