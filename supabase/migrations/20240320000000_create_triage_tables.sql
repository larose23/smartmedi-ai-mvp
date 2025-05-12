-- Create triage_cases table
CREATE TABLE triage_cases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_name TEXT NOT NULL,
    age INTEGER NOT NULL,
    age_group TEXT NOT NULL CHECK (age_group IN ('pediatric', 'adult', 'geriatric')),
    department TEXT NOT NULL CHECK (department IN ('emergency', 'urgent_care', 'primary_care')),
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'urgent', 'moderate', 'stable')),
    symptoms TEXT NOT NULL,
    wait_time INTEGER NOT NULL DEFAULT 0,
    is_escalated BOOLEAN NOT NULL DEFAULT false,
    seen_by_staff BOOLEAN NOT NULL DEFAULT false,
    staff_notes TEXT,
    override_reason TEXT,
    gold_standard_severity TEXT CHECK (gold_standard_severity IN ('critical', 'urgent', 'moderate', 'stable')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create triage_analytics table
CREATE TABLE triage_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    avg_triage_time DECIMAL NOT NULL DEFAULT 0,
    accuracy_rate DECIMAL NOT NULL DEFAULT 0,
    throughput DECIMAL NOT NULL DEFAULT 0,
    total_cases INTEGER NOT NULL DEFAULT 0,
    critical_cases INTEGER NOT NULL DEFAULT 0,
    urgent_cases INTEGER NOT NULL DEFAULT 0,
    moderate_cases INTEGER NOT NULL DEFAULT 0,
    stable_cases INTEGER NOT NULL DEFAULT 0
);

-- Create triage_audit_logs table
CREATE TABLE triage_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'warning', 'error')),
    case_id UUID REFERENCES triage_cases(id),
    staff_id UUID REFERENCES auth.users(id),
    previous_status TEXT,
    new_status TEXT
);

-- Create indexes
CREATE INDEX idx_triage_cases_severity ON triage_cases(severity);
CREATE INDEX idx_triage_cases_department ON triage_cases(department);
CREATE INDEX idx_triage_cases_seen_by_staff ON triage_cases(seen_by_staff);
CREATE INDEX idx_triage_audit_logs_case_id ON triage_audit_logs(case_id);
CREATE INDEX idx_triage_audit_logs_timestamp ON triage_audit_logs(timestamp);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for triage_cases
CREATE TRIGGER update_triage_cases_updated_at
    BEFORE UPDATE ON triage_cases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 