-- Create HIE connection tables
CREATE TABLE hie_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('FHIR', 'HL7', 'REST')),
    status VARCHAR(10) NOT NULL CHECK (status IN ('active', 'inactive', 'error')),
    credentials JSONB NOT NULL,
    capabilities TEXT[] NOT NULL,
    last_sync TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create consent management tables
CREATE TABLE consent_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    purpose TEXT NOT NULL,
    scope TEXT[] NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(10) NOT NULL CHECK (status IN ('active', 'revoked', 'expired')),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create audit logging table
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    action VARCHAR(10) NOT NULL CHECK (action IN ('view', 'share', 'export', 'consent')),
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create connection health metrics table
CREATE TABLE connection_health_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    connection_id UUID NOT NULL REFERENCES hie_connections(id),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(10) NOT NULL CHECK (status IN ('healthy', 'unhealthy')),
    latency INTEGER NOT NULL,
    error_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_hie_connections_status ON hie_connections(status);
CREATE INDEX idx_consent_records_patient ON consent_records(patient_id);
CREATE INDEX idx_consent_records_org ON consent_records(organization_id);
CREATE INDEX idx_consent_records_status ON consent_records(status);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_patient ON audit_logs(patient_id);
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_health_metrics_connection ON connection_health_metrics(connection_id);
CREATE INDEX idx_health_metrics_timestamp ON connection_health_metrics(timestamp);
CREATE INDEX idx_health_metrics_status ON connection_health_metrics(status);

-- Create RLS policies
ALTER TABLE hie_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_health_metrics ENABLE ROW LEVEL SECURITY;

-- HIE connections policies
CREATE POLICY "Allow read access to authenticated users" ON hie_connections
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow insert access to admin users" ON hie_connections
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

CREATE POLICY "Allow update access to admin users" ON hie_connections
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- Consent records policies
CREATE POLICY "Allow read access to authorized users" ON consent_records
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND (
                role = 'admin'
                OR (
                    role = 'provider'
                    AND organization_id = consent_records.organization_id
                )
            )
        )
    );

CREATE POLICY "Allow insert access to authorized users" ON consent_records
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND (
                role = 'admin'
                OR (
                    role = 'provider'
                    AND organization_id = consent_records.organization_id
                )
            )
        )
    );

CREATE POLICY "Allow update access to authorized users" ON consent_records
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND (
                role = 'admin'
                OR (
                    role = 'provider'
                    AND organization_id = consent_records.organization_id
                )
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND (
                role = 'admin'
                OR (
                    role = 'provider'
                    AND organization_id = consent_records.organization_id
                )
            )
        )
    );

-- Audit logs policies
CREATE POLICY "Allow read access to admin users" ON audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

CREATE POLICY "Allow insert access to authenticated users" ON audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create triggers for updated_at
CREATE TRIGGER update_hie_connections_updated_at
    BEFORE UPDATE ON hie_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consent_records_updated_at
    BEFORE UPDATE ON consent_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policy for health metrics
CREATE POLICY "Allow read access to admin users" ON connection_health_metrics
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

CREATE POLICY "Allow insert access to authenticated users" ON connection_health_metrics
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create function to clean up old health metrics
CREATE OR REPLACE FUNCTION cleanup_old_health_metrics()
RETURNS void AS $$
BEGIN
    DELETE FROM connection_health_metrics
    WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job to clean up old metrics
SELECT cron.schedule(
    'cleanup-health-metrics',
    '0 0 * * *',  -- Run daily at midnight
    'SELECT cleanup_old_health_metrics();'
); 