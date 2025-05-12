-- Create HL7 messages table
CREATE TABLE hl7_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_type VARCHAR(3) NOT NULL,
    trigger_event VARCHAR(3) NOT NULL,
    version VARCHAR(10) NOT NULL,
    raw_message TEXT NOT NULL,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    error_message TEXT
);

-- Create FHIR resources table
CREATE TABLE fhir_resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100) NOT NULL,
    version_id VARCHAR(50),
    resource_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(resource_type, resource_id)
);

-- Create integration logs table
CREATE TABLE integration_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    integration_type VARCHAR(50) NOT NULL,
    direction VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL,
    payload JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create encryption functions
CREATE OR REPLACE FUNCTION encrypt_data(data_to_encrypt TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    encrypted_data TEXT;
BEGIN
    -- Use pgcrypto for encryption
    encrypted_data := encode(
        pgp_sym_encrypt(
            data_to_encrypt,
            current_setting('app.settings.encryption_key')
        ),
        'base64'
    );
    RETURN encrypted_data;
END;
$$;

CREATE OR REPLACE FUNCTION decrypt_data(encrypted_data TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    decrypted_data TEXT;
BEGIN
    -- Use pgcrypto for decryption
    decrypted_data := pgp_sym_decrypt(
        decode(encrypted_data, 'base64'),
        current_setting('app.settings.encryption_key')
    );
    RETURN decrypted_data;
END;
$$;

-- Create RLS policies
ALTER TABLE hl7_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE fhir_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

-- HL7 messages policies
CREATE POLICY "Allow read access to authenticated users" ON hl7_messages
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow insert access to authenticated users" ON hl7_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow update access to authenticated users" ON hl7_messages
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- FHIR resources policies
CREATE POLICY "Allow read access to authenticated users" ON fhir_resources
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow insert access to authenticated users" ON fhir_resources
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow update access to authenticated users" ON fhir_resources
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Integration logs policies
CREATE POLICY "Allow read access to authenticated users" ON integration_logs
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow insert access to authenticated users" ON integration_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_hl7_messages_type ON hl7_messages(message_type);
CREATE INDEX idx_hl7_messages_processed ON hl7_messages(processed);
CREATE INDEX idx_fhir_resources_type_id ON fhir_resources(resource_type, resource_id);
CREATE INDEX idx_integration_logs_type ON integration_logs(integration_type);
CREATE INDEX idx_integration_logs_created_at ON integration_logs(created_at);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for fhir_resources
CREATE TRIGGER update_fhir_resources_updated_at
    BEFORE UPDATE ON fhir_resources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 