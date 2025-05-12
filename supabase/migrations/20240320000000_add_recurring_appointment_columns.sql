-- Add recurring appointment columns to appointments table
ALTER TABLE appointments
ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN recurrence_pattern TEXT,
ADD COLUMN recurrence_end_date TIMESTAMP WITH TIME ZONE;

-- Add comment to explain the columns
COMMENT ON COLUMN appointments.is_recurring IS 'Indicates if the appointment is part of a recurring series';
COMMENT ON COLUMN appointments.recurrence_pattern IS 'The pattern of recurrence (daily, weekly, monthly)';
COMMENT ON COLUMN appointments.recurrence_end_date IS 'The end date of the recurring series'; 