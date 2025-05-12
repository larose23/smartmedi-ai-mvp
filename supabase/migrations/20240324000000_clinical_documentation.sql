-- Create note templates table
CREATE TABLE note_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    specialty VARCHAR(50) NOT NULL,
    sections JSONB NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create clinical notes table
CREATE TABLE clinical_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id),
    encounter_id UUID NOT NULL REFERENCES encounters(id),
    provider_id UUID NOT NULL REFERENCES providers(id),
    template_id UUID NOT NULL REFERENCES note_templates(id),
    content JSONB NOT NULL,
    status VARCHAR(10) NOT NULL CHECK (status IN ('draft', 'final', 'amended')),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create voice recordings table
CREATE TABLE voice_recordings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    note_id UUID NOT NULL REFERENCES clinical_notes(id),
    section_title VARCHAR(100) NOT NULL,
    audio_data BYTEA NOT NULL,
    transcription TEXT,
    status VARCHAR(10) NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_note_templates_specialty ON note_templates(specialty);
CREATE INDEX idx_clinical_notes_patient ON clinical_notes(patient_id);
CREATE INDEX idx_clinical_notes_encounter ON clinical_notes(encounter_id);
CREATE INDEX idx_clinical_notes_provider ON clinical_notes(provider_id);
CREATE INDEX idx_clinical_notes_template ON clinical_notes(template_id);
CREATE INDEX idx_clinical_notes_status ON clinical_notes(status);
CREATE INDEX idx_voice_recordings_note ON voice_recordings(note_id);
CREATE INDEX idx_voice_recordings_status ON voice_recordings(status);

-- Create RLS policies
ALTER TABLE note_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_recordings ENABLE ROW LEVEL SECURITY;

-- Note templates policies
CREATE POLICY "Allow read access to authenticated users" ON note_templates
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow insert access to admin users" ON note_templates
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

CREATE POLICY "Allow update access to admin users" ON note_templates
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

-- Clinical notes policies
CREATE POLICY "Allow read access to authorized users" ON clinical_notes
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
                    AND provider_id = clinical_notes.provider_id
                )
            )
        )
    );

CREATE POLICY "Allow insert access to authorized users" ON clinical_notes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND (
                role = 'admin'
                OR role = 'provider'
            )
        )
    );

CREATE POLICY "Allow update access to authorized users" ON clinical_notes
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
                    AND provider_id = clinical_notes.provider_id
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
                    AND provider_id = clinical_notes.provider_id
                )
            )
        )
    );

-- Voice recordings policies
CREATE POLICY "Allow read access to authorized users" ON voice_recordings
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
                    AND EXISTS (
                        SELECT 1 FROM clinical_notes
                        WHERE clinical_notes.id = voice_recordings.note_id
                        AND clinical_notes.provider_id = auth.uid()
                    )
                )
            )
        )
    );

CREATE POLICY "Allow insert access to authorized users" ON voice_recordings
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND (
                role = 'admin'
                OR role = 'provider'
            )
        )
    );

-- Create triggers for updated_at
CREATE TRIGGER update_note_templates_updated_at
    BEFORE UPDATE ON note_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinical_notes_updated_at
    BEFORE UPDATE ON clinical_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voice_recordings_updated_at
    BEFORE UPDATE ON voice_recordings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 