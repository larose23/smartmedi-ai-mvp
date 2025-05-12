-- Create treatment_outcomes table
CREATE TABLE IF NOT EXISTS treatment_outcomes (
    patient_id UUID REFERENCES patients(id),
    treatment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    treatment_name TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    outcome DECIMAL(3,2) NOT NULL CHECK (outcome >= 0 AND outcome <= 1),
    side_effects TEXT[] DEFAULT '{}',
    follow_up_data JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comparative_studies table
CREATE TABLE IF NOT EXISTS comparative_studies (
    study_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    treatment_a UUID REFERENCES treatment_outcomes(treatment_id),
    treatment_b UUID REFERENCES treatment_outcomes(treatment_id),
    metrics JSONB NOT NULL DEFAULT '{
        "effectiveness": 0,
        "cost": 0,
        "side_effects": 0,
        "patient_satisfaction": 0
    }',
    patient_count INTEGER NOT NULL CHECK (patient_count > 0),
    duration INTEGER NOT NULL CHECK (duration > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create predictive_models table
CREATE TABLE IF NOT EXISTS predictive_models (
    model_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    accuracy DECIMAL(3,2) NOT NULL CHECK (accuracy >= 0 AND accuracy <= 1),
    features TEXT[] NOT NULL,
    predictions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_treatment_outcomes_patient_id ON treatment_outcomes(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_outcomes_treatment_name ON treatment_outcomes(treatment_name);
CREATE INDEX IF NOT EXISTS idx_comparative_studies_treatments ON comparative_studies(treatment_a, treatment_b);
CREATE INDEX IF NOT EXISTS idx_predictive_models_accuracy ON predictive_models(accuracy);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_treatment_outcomes_updated_at
    BEFORE UPDATE ON treatment_outcomes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comparative_studies_updated_at
    BEFORE UPDATE ON comparative_studies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_predictive_models_updated_at
    BEFORE UPDATE ON predictive_models
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE treatment_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comparative_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictive_models ENABLE ROW LEVEL SECURITY;

-- Treatment outcomes policies
CREATE POLICY "Users can view their own treatment outcomes"
    ON treatment_outcomes FOR SELECT
    USING (auth.uid() = patient_id);

CREATE POLICY "Users can insert their own treatment outcomes"
    ON treatment_outcomes FOR INSERT
    WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Users can update their own treatment outcomes"
    ON treatment_outcomes FOR UPDATE
    USING (auth.uid() = patient_id);

CREATE POLICY "Users can delete their own treatment outcomes"
    ON treatment_outcomes FOR DELETE
    USING (auth.uid() = patient_id);

-- Comparative studies policies
CREATE POLICY "Users can view comparative studies"
    ON comparative_studies FOR SELECT
    USING (true);

CREATE POLICY "Only admins can insert comparative studies"
    ON comparative_studies FOR INSERT
    WITH CHECK (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

CREATE POLICY "Only admins can update comparative studies"
    ON comparative_studies FOR UPDATE
    USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

CREATE POLICY "Only admins can delete comparative studies"
    ON comparative_studies FOR DELETE
    USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

-- Predictive models policies
CREATE POLICY "Users can view predictive models"
    ON predictive_models FOR SELECT
    USING (true);

CREATE POLICY "Only admins can insert predictive models"
    ON predictive_models FOR INSERT
    WITH CHECK (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

CREATE POLICY "Only admins can update predictive models"
    ON predictive_models FOR UPDATE
    USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

CREATE POLICY "Only admins can delete predictive models"
    ON predictive_models FOR DELETE
    USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin')); 