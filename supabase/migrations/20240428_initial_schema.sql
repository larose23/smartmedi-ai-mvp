-- Create patients table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'patients') THEN
        CREATE TABLE patients (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            date_of_birth DATE NOT NULL,
            gender TEXT NOT NULL,
            phone_number TEXT,
            email TEXT,
            address TEXT,
            emergency_contact TEXT,
            medical_history TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
        );
    END IF;
END $$;

-- Create staff table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'staff') THEN
        CREATE TABLE staff (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            role TEXT NOT NULL,
            department TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone_number TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
        );
    END IF;
END $$;

-- Create appointments table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'appointments') THEN
        CREATE TABLE appointments (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            patient_id UUID REFERENCES patients(id) NOT NULL,
            staff_id UUID REFERENCES staff(id),
            appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
            status TEXT NOT NULL,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
        );
    END IF;
END $$;

-- Create emergency_alerts table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'emergency_alerts') THEN
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
    END IF;
END $$;

-- Create check_ins table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'check_ins') THEN
        CREATE TABLE check_ins (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            patient_id TEXT NOT NULL,
            triage_score TEXT DEFAULT 'Medium',
            suggested_department TEXT DEFAULT 'General Medicine',
            estimated_wait_minutes INTEGER DEFAULT 30,
            potential_diagnoses TEXT[] DEFAULT ARRAY['Evaluation needed'],
            recommended_actions TEXT[] DEFAULT ARRAY['Consult with doctor'],
            risk_factors TEXT[] DEFAULT ARRAY['None reported'],
            symptoms JSONB NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
        );
    END IF;
END $$;

-- Create check_in_logs table as a fallback for check-ins with schema mismatches
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'check_in_logs') THEN
        CREATE TABLE check_in_logs (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            patient_id TEXT,
            check_in_data JSONB NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
        );
    END IF;
END $$;

-- Enable RLS and create policies (these can be run multiple times safely)
ALTER TABLE IF EXISTS patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS emergency_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS check_in_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DO $$ 
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Patients are viewable by authenticated users" ON patients;
    DROP POLICY IF EXISTS "Patients can be inserted by authenticated users" ON patients;
    DROP POLICY IF EXISTS "Staff are viewable by authenticated users" ON staff;
    DROP POLICY IF EXISTS "Appointments are viewable by authenticated users" ON appointments;
    DROP POLICY IF EXISTS "Appointments can be inserted by authenticated users" ON appointments;
    DROP POLICY IF EXISTS "Emergency alerts are viewable by authenticated users" ON emergency_alerts;
    DROP POLICY IF EXISTS "Emergency alerts can be inserted by authenticated users" ON emergency_alerts;
    DROP POLICY IF EXISTS "Check-ins are viewable by authenticated users" ON check_ins;
    DROP POLICY IF EXISTS "Check-ins can be inserted by authenticated users" ON check_ins;
    DROP POLICY IF EXISTS "Check-in logs are viewable by authenticated users" ON check_in_logs;
    DROP POLICY IF EXISTS "Check-in logs can be inserted by authenticated users" ON check_in_logs;

    -- Create new policies
    CREATE POLICY "Patients are viewable by authenticated users" ON patients
        FOR SELECT USING (auth.role() = 'authenticated');

    CREATE POLICY "Patients can be inserted by authenticated users" ON patients
        FOR INSERT WITH CHECK (auth.role() = 'authenticated');

    CREATE POLICY "Staff are viewable by authenticated users" ON staff
        FOR SELECT USING (auth.role() = 'authenticated');

    CREATE POLICY "Appointments are viewable by authenticated users" ON appointments
        FOR SELECT USING (auth.role() = 'authenticated');

    CREATE POLICY "Appointments can be inserted by authenticated users" ON appointments
        FOR INSERT WITH CHECK (auth.role() = 'authenticated');

    CREATE POLICY "Emergency alerts are viewable by authenticated users" ON emergency_alerts
        FOR SELECT USING (auth.role() = 'authenticated');

    CREATE POLICY "Emergency alerts can be inserted by authenticated users" ON emergency_alerts
        FOR INSERT WITH CHECK (auth.role() = 'authenticated');
        
    CREATE POLICY "Check-ins are viewable by authenticated users" ON check_ins
        FOR SELECT USING (auth.role() = 'authenticated');

    CREATE POLICY "Check-ins can be inserted by authenticated users" ON check_ins
        FOR INSERT WITH CHECK (auth.role() = 'authenticated');
        
    CREATE POLICY "Check-in logs are viewable by authenticated users" ON check_in_logs
        FOR SELECT USING (auth.role() = 'authenticated');

    CREATE POLICY "Check-in logs can be inserted by authenticated users" ON check_in_logs
        FOR INSERT WITH CHECK (auth.role() = 'authenticated');
END $$; 