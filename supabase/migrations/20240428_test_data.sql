-- First, check the table structure
DO $$
BEGIN
    -- Drop existing tables if they exist
    DROP TABLE IF EXISTS emergency_alerts CASCADE;
    DROP TABLE IF EXISTS appointments CASCADE;
    DROP TABLE IF EXISTS patients CASCADE;
    DROP TABLE IF EXISTS staff CASCADE;

    -- Create staff table
    CREATE TABLE staff (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        department TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
    );

    -- Create patients table
    CREATE TABLE patients (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        date_of_birth DATE NOT NULL,
        gender TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        emergency_contact TEXT,
        medical_history TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
    );

    -- Create appointments table
    CREATE TABLE appointments (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        patient_id UUID REFERENCES patients(id) NOT NULL,
        staff_id UUID REFERENCES staff(id) NOT NULL,
        appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
        status TEXT NOT NULL,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
    );

    -- Create emergency_alerts table
    CREATE TABLE emergency_alerts (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        patient_id UUID REFERENCES patients(id) NOT NULL,
        alert_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        status TEXT NOT NULL,
        location TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
    );
END $$;

-- Insert test staff members
INSERT INTO staff (name, role, department, email, phone)
VALUES 
    ('John Smith', 'Doctor', 'Emergency', 'john.smith@hospital.com', '555-0101'),
    ('Sarah Johnson', 'Nurse', 'Emergency', 'sarah.johnson@hospital.com', '555-0102'),
    ('Michael Brown', 'Doctor', 'Cardiology', 'michael.brown@hospital.com', '555-0103'),
    ('Emily Davis', 'Nurse', 'Cardiology', 'emily.davis@hospital.com', '555-0104'),
    ('David Wilson', 'Administrator', 'Administration', 'david.wilson@hospital.com', '555-0105');

-- Insert test patients
INSERT INTO patients (name, date_of_birth, gender, phone, email, address, emergency_contact, medical_history)
VALUES 
    ('Robert Taylor', '1980-05-15', 'Male', '555-0201', 'robert.taylor@email.com', '123 Main St', 'Jane Taylor (555-0202)', 'Hypertension'),
    ('Jennifer Anderson', '1975-08-22', 'Female', '555-0203', 'jennifer.anderson@email.com', '456 Oak Ave', 'Mark Anderson (555-0204)', 'Diabetes'),
    ('James Martinez', '1990-03-10', 'Male', '555-0205', 'james.martinez@email.com', '789 Pine Rd', 'Maria Martinez (555-0206)', 'Asthma'),
    ('Patricia White', '1985-11-30', 'Female', '555-0207', 'patricia.white@email.com', '321 Elm St', 'Thomas White (555-0208)', 'None'),
    ('William Lee', '1972-07-18', 'Male', '555-0209', 'william.lee@email.com', '654 Maple Dr', 'Susan Lee (555-0210)', 'High Cholesterol');

-- Insert test appointments
INSERT INTO appointments (patient_id, staff_id, appointment_date, status, notes)
SELECT 
    p.id,
    s.id,
    NOW() + (random() * interval '30 days'),
    CASE random() * 3
        WHEN 0 THEN 'Scheduled'
        WHEN 1 THEN 'Completed'
        ELSE 'Cancelled'
    END,
    'Regular checkup'
FROM patients p
CROSS JOIN staff s
WHERE s.role = 'Doctor'
LIMIT 10;

-- Insert test emergency alerts
INSERT INTO emergency_alerts (patient_id, alert_type, severity, status, location, notes)
SELECT 
    p.id,
    CASE random() * 3
        WHEN 0 THEN 'Cardiac'
        WHEN 1 THEN 'Respiratory'
        ELSE 'Trauma'
    END,
    CASE random() * 3
        WHEN 0 THEN 'Critical'
        WHEN 1 THEN 'High'
        ELSE 'Medium'
    END,
    CASE random() * 2
        WHEN 0 THEN 'Active'
        ELSE 'Resolved'
    END,
    'Emergency Room',
    'Patient requires immediate attention'
FROM patients p
LIMIT 5;

-- Print success message
DO $$
BEGIN
    RAISE NOTICE 'Test data inserted successfully!';
    RAISE NOTICE 'Staff count: %', (SELECT COUNT(*) FROM staff);
    RAISE NOTICE 'Patients count: %', (SELECT COUNT(*) FROM patients);
    RAISE NOTICE 'Appointments count: %', (SELECT COUNT(*) FROM appointments);
    RAISE NOTICE 'Emergency alerts count: %', (SELECT COUNT(*) FROM emergency_alerts);
END $$; 