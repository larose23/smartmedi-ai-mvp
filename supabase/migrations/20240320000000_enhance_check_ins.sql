-- Drop existing check_ins table if it exists
DROP TABLE IF EXISTS check_ins;

-- Create enhanced check_ins table
CREATE TABLE check_ins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  triage_score TEXT NOT NULL CHECK (triage_score IN ('High', 'Medium', 'Low')),
  suggested_department TEXT NOT NULL,
  estimated_wait_minutes INTEGER NOT NULL,
  potential_diagnoses TEXT[] NOT NULL,
  recommended_actions TEXT[] NOT NULL,
  risk_factors TEXT[] NOT NULL,
  symptoms JSONB NOT NULL
);

-- Create index for faster queries
CREATE INDEX idx_check_ins_triage_score ON check_ins(triage_score);
CREATE INDEX idx_check_ins_created_at ON check_ins(created_at);
CREATE INDEX idx_check_ins_patient_id ON check_ins(patient_id);

-- Enable Row Level Security
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow authenticated users to view all check-ins"
  ON check_ins FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for authenticated users to insert check-ins
CREATE POLICY "Allow authenticated users to insert check-ins"
  ON check_ins FOR INSERT
  TO authenticated
  WITH CHECK (true); 