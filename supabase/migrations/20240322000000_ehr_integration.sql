-- Create terminology tables
CREATE TABLE terminology_sets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    system VARCHAR(10) NOT NULL,
    code VARCHAR(50) NOT NULL,
    display TEXT NOT NULL,
    version VARCHAR(10) NOT NULL,
    status VARCHAR(10) NOT NULL,
    properties JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(system, code, version)
);

CREATE TABLE code_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_system VARCHAR(10) NOT NULL,
    source_code VARCHAR(50) NOT NULL,
    target_system VARCHAR(10) NOT NULL,
    target_code VARCHAR(50) NOT NULL,
    description TEXT,
    confidence DECIMAL(3,2) NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_system, source_code, target_system, target_code)
);

-- Create sync configuration tables
CREATE TABLE sync_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_system VARCHAR(50) NOT NULL,
    target_system VARCHAR(50) NOT NULL,
    resource_types TEXT[] NOT NULL,
    sync_interval INTEGER NOT NULL,
    last_sync TIMESTAMPTZ,
    status VARCHAR(10) NOT NULL,
    mapping_rules JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sync_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_id UUID NOT NULL REFERENCES sync_configs(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(10) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_count INTEGER NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create documentation exchange tables
CREATE TABLE document_exchanges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_system VARCHAR(50) NOT NULL,
    target_system VARCHAR(50) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    document_id VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL,
    metadata JSONB,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_system, target_system, document_id)
);

CREATE TABLE document_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES document_exchanges(id),
    version_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(document_id, version_number)
);

-- Create indexes
CREATE INDEX idx_terminology_sets_system_code ON terminology_sets(system, code);
CREATE INDEX idx_terminology_sets_display ON terminology_sets USING gin(to_tsvector('english', display));
CREATE INDEX idx_code_mappings_source ON code_mappings(source_system, source_code);
CREATE INDEX idx_code_mappings_target ON code_mappings(target_system, target_code);
CREATE INDEX idx_sync_configs_status ON sync_configs(status);
CREATE INDEX idx_sync_logs_config ON sync_logs(config_id);
CREATE INDEX idx_document_exchanges_status ON document_exchanges(status);
CREATE INDEX idx_document_versions_document ON document_versions(document_id);

-- Create RLS policies
ALTER TABLE terminology_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- Terminology sets policies
CREATE POLICY "Allow read access to authenticated users" ON terminology_sets
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow insert access to authenticated users" ON terminology_sets
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow update access to authenticated users" ON terminology_sets
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Code mappings policies
CREATE POLICY "Allow read access to authenticated users" ON code_mappings
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow insert access to authenticated users" ON code_mappings
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow update access to authenticated users" ON code_mappings
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Sync configs policies
CREATE POLICY "Allow read access to authenticated users" ON sync_configs
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow insert access to authenticated users" ON sync_configs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow update access to authenticated users" ON sync_configs
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Sync logs policies
CREATE POLICY "Allow read access to authenticated users" ON sync_logs
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow insert access to authenticated users" ON sync_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Document exchanges policies
CREATE POLICY "Allow read access to authenticated users" ON document_exchanges
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow insert access to authenticated users" ON document_exchanges
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow update access to authenticated users" ON document_exchanges
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Document versions policies
CREATE POLICY "Allow read access to authenticated users" ON document_versions
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow insert access to authenticated users" ON document_versions
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create triggers for updated_at
CREATE TRIGGER update_terminology_sets_updated_at
    BEFORE UPDATE ON terminology_sets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_configs_updated_at
    BEFORE UPDATE ON sync_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_exchanges_updated_at
    BEFORE UPDATE ON document_exchanges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 