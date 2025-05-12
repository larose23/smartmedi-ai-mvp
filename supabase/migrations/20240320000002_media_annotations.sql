-- Create media_annotations table
CREATE TABLE IF NOT EXISTS media_annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    media_id UUID NOT NULL REFERENCES clinical_media(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('point', 'line', 'polygon', 'rectangle', 'circle')),
    coordinates JSONB NOT NULL,
    label TEXT,
    color TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_media_annotations_media_id ON media_annotations(media_id);
CREATE INDEX IF NOT EXISTS idx_media_annotations_type ON media_annotations(type);

-- Add RLS policies
ALTER TABLE media_annotations ENABLE ROW LEVEL SECURITY;

-- Annotation access policies
CREATE POLICY "Users can view their patients' media annotations"
    ON media_annotations
    FOR SELECT
    USING (
        media_id IN (
            SELECT id FROM clinical_media
            WHERE patient_id IN (
                SELECT id FROM patients
                WHERE provider_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can add annotations to their patients' media"
    ON media_annotations
    FOR INSERT
    WITH CHECK (
        media_id IN (
            SELECT id FROM clinical_media
            WHERE patient_id IN (
                SELECT id FROM patients
                WHERE provider_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update their patients' media annotations"
    ON media_annotations
    FOR UPDATE
    USING (
        media_id IN (
            SELECT id FROM clinical_media
            WHERE patient_id IN (
                SELECT id FROM patients
                WHERE provider_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete their patients' media annotations"
    ON media_annotations
    FOR DELETE
    USING (
        media_id IN (
            SELECT id FROM clinical_media
            WHERE patient_id IN (
                SELECT id FROM patients
                WHERE provider_id = auth.uid()
            )
        )
    );

-- Create trigger for updating updated_at timestamp
CREATE TRIGGER update_media_annotations_updated_at
    BEFORE UPDATE ON media_annotations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 