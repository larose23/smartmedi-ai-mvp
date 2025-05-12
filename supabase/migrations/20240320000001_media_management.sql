-- Create clinical_media table
CREATE TABLE IF NOT EXISTS clinical_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('image', 'recording', 'dicom')),
    mime_type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    url TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_clinical_media_patient_id ON clinical_media(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_media_encounter_id ON clinical_media(encounter_id);
CREATE INDEX IF NOT EXISTS idx_clinical_media_type ON clinical_media(type);

-- Add RLS policies
ALTER TABLE clinical_media ENABLE ROW LEVEL SECURITY;

-- Media access policies
CREATE POLICY "Users can view their patients' media"
    ON clinical_media
    FOR SELECT
    USING (
        patient_id IN (
            SELECT id FROM patients
            WHERE provider_id = auth.uid()
        )
    );

CREATE POLICY "Users can upload media for their patients"
    ON clinical_media
    FOR INSERT
    WITH CHECK (
        patient_id IN (
            SELECT id FROM patients
            WHERE provider_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their patients' media"
    ON clinical_media
    FOR UPDATE
    USING (
        patient_id IN (
            SELECT id FROM patients
            WHERE provider_id = auth.uid()
        )
    );

-- Create storage bucket for clinical media
INSERT INTO storage.buckets (id, name, public)
VALUES ('clinical-media', 'clinical-media', false)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
CREATE POLICY "Users can upload media"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'clinical-media' AND
        auth.uid() IN (
            SELECT provider_id FROM patients
            WHERE id::text = (storage.foldername(name))[1]
        )
    );

CREATE POLICY "Users can view their patients' media"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'clinical-media' AND
        auth.uid() IN (
            SELECT provider_id FROM patients
            WHERE id::text = (storage.foldername(name))[1]
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for clinical_media
CREATE TRIGGER update_clinical_media_updated_at
    BEFORE UPDATE ON clinical_media
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 