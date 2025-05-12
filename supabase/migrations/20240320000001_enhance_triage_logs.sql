-- Add new columns to triage_logs
ALTER TABLE triage_logs
ADD COLUMN status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'seen', 'transferred', 'completed')),
ADD COLUMN assigned_to UUID REFERENCES auth.users(id),
ADD COLUMN priority_override BOOLEAN DEFAULT false,
ADD COLUMN override_reason TEXT,
ADD COLUMN override_by UUID REFERENCES auth.users(id),
ADD COLUMN override_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN bed_assignment TEXT,
ADD COLUMN department_assignment TEXT,
ADD COLUMN last_updated_by UUID REFERENCES auth.users(id),
ADD COLUMN last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN notification_sent BOOLEAN DEFAULT false,
ADD COLUMN escalation_level INTEGER DEFAULT 0,
ADD COLUMN wait_time_minutes INTEGER,
ADD COLUMN processing_time_minutes INTEGER;

-- Create index for status and assigned_to
CREATE INDEX IF NOT EXISTS idx_triage_logs_status ON triage_logs(status);
CREATE INDEX IF NOT EXISTS idx_triage_logs_assigned_to ON triage_logs(assigned_to);

-- Create view for queue analytics
CREATE OR REPLACE VIEW triage_queue_analytics AS
SELECT
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as total_cases,
    AVG(wait_time_minutes) as avg_wait_time,
    AVG(processing_time_minutes) as avg_processing_time,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_cases,
    COUNT(CASE WHEN priority_override = true THEN 1 END) as override_cases,
    COUNT(CASE WHEN escalation_level > 0 THEN 1 END) as escalated_cases
FROM triage_logs
GROUP BY DATE_TRUNC('hour', created_at);

-- Create view for clinician performance
CREATE OR REPLACE VIEW clinician_performance AS
SELECT
    assigned_to,
    COUNT(*) as total_cases,
    AVG(processing_time_minutes) as avg_processing_time,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_cases,
    COUNT(CASE WHEN priority_override = true THEN 1 END) as override_cases
FROM triage_logs
WHERE assigned_to IS NOT NULL
GROUP BY assigned_to;

-- Add RLS policies for new columns
CREATE POLICY "Users can update their assigned cases"
    ON triage_logs
    FOR UPDATE
    TO authenticated
    USING (assigned_to = auth.uid())
    WITH CHECK (assigned_to = auth.uid());

CREATE POLICY "Users can view queue analytics"
    ON triage_queue_analytics
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can view clinician performance"
    ON clinician_performance
    FOR SELECT
    TO authenticated
    USING (true); 