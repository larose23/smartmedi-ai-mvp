-- Create patients table if it doesn't exist
CREATE TABLE IF NOT EXISTS patients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create staff table if it doesn't exist
CREATE TABLE IF NOT EXISTS staff (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create appointments table if it doesn't exist
CREATE TABLE IF NOT EXISTS appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES patients(id) NOT NULL,
    staff_id UUID REFERENCES staff(id) NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    department TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Insert some sample data if tables are empty
DO $$
BEGIN
    -- Insert sample patients if none exist
    IF NOT EXISTS (SELECT 1 FROM patients LIMIT 1) THEN
        INSERT INTO patients (name) VALUES
        ('John Doe'),
        ('Jane Smith'),
        ('Robert Johnson');
    END IF;

    -- Insert sample staff if none exist
    IF NOT EXISTS (SELECT 1 FROM staff LIMIT 1) THEN
        INSERT INTO staff (name, role, department) VALUES
        ('Dr. Sarah Wilson', 'Doctor', 'Cardiology'),
        ('Dr. Michael Brown', 'Doctor', 'Neurology'),
        ('Dr. Emily Davis', 'Doctor', 'Pediatrics'),
        ('Dr. James Miller', 'Doctor', 'Emergency');
    END IF;

    -- Insert sample appointments if none exist
    IF NOT EXISTS (SELECT 1 FROM appointments LIMIT 1) THEN
        INSERT INTO appointments (patient_id, staff_id, date, time, status, department, notes)
        SELECT 
            p.id,
            s.id,
            CURRENT_DATE,
            '09:00:00',
            'scheduled',
            s.department,
            'Initial consultation'
        FROM patients p
        CROSS JOIN staff s
        LIMIT 1;
    END IF;
END $$; 