-- Create triage_logs table
CREATE TABLE IF NOT EXISTS triage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_description TEXT NOT NULL,
    vitals JSONB NOT NULL,
    vital_history JSONB NOT NULL,
    comorbidities JSONB NOT NULL,
    risk_factors JSONB NOT NULL,
    triage_decision JSONB NOT NULL,
    risk_assessment JSONB NOT NULL,
    clinical_validation JSONB NOT NULL,
    decision_metrics JSONB NOT NULL,
    decision_path JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_triage_logs_created_at ON triage_logs(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_triage_logs_updated_at
    BEFORE UPDATE ON triage_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies
ALTER TABLE triage_logs ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read their own logs
CREATE POLICY "Users can read their own triage logs"
    ON triage_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = auth.uid());

-- Policy for authenticated users to insert logs
CREATE POLICY "Users can insert triage logs"
    ON triage_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy for authenticated users to update their own logs
CREATE POLICY "Users can update their own triage logs"
    ON triage_logs
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = auth.uid())
    WITH CHECK (auth.uid() = auth.uid()); 