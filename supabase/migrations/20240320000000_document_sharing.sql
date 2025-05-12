-- Create document_shares table
CREATE TABLE IF NOT EXISTS document_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES clinical_notes(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    access_token UUID NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('pending', 'accessed', 'expired')),
    CONSTRAINT valid_email CHECK (recipient_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create electronic_signatures table
CREATE TABLE IF NOT EXISTS electronic_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES clinical_notes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    signature_data TEXT NOT NULL,
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_document_shares_access_token ON document_shares(access_token);
CREATE INDEX IF NOT EXISTS idx_document_shares_document_id ON document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_electronic_signatures_document_id ON electronic_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_electronic_signatures_user_id ON electronic_signatures(user_id);

-- Add RLS policies
ALTER TABLE document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE electronic_signatures ENABLE ROW LEVEL SECURITY;

-- Document shares policies
CREATE POLICY "Users can view their own shared documents"
    ON document_shares
    FOR SELECT
    USING (
        document_id IN (
            SELECT id FROM clinical_notes
            WHERE provider_id = auth.uid()
        )
    );

CREATE POLICY "Users can create document shares"
    ON document_shares
    FOR INSERT
    WITH CHECK (
        document_id IN (
            SELECT id FROM clinical_notes
            WHERE provider_id = auth.uid()
        )
    );

-- Electronic signatures policies
CREATE POLICY "Users can view their own signatures"
    ON electronic_signatures
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create signatures"
    ON electronic_signatures
    FOR INSERT
    WITH CHECK (user_id = auth.uid()); 