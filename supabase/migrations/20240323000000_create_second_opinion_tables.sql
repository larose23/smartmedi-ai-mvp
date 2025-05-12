-- Create specialists table
CREATE TABLE specialists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  availability JSONB DEFAULT '{"weekdays": [9, 10, 11, 14, 15, 16], "weekends": [10, 11, 14, 15]}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create second opinion requests table
CREATE TABLE second_opinion_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  case_id UUID REFERENCES triage_cases(id) ON DELETE CASCADE,
  requesting_staff_id UUID NOT NULL,
  specialist_id UUID REFERENCES specialists(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  reason TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create consultations table
CREATE TABLE consultations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  request_id UUID REFERENCES second_opinion_requests(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create consultation feedback table
CREATE TABLE consultation_feedback (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
  specialist_id UUID REFERENCES specialists(id),
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('diagnosis', 'treatment', 'both')),
  feedback TEXT NOT NULL,
  recommendations TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_specialists_specialty ON specialists(specialty);
CREATE INDEX idx_second_opinion_requests_case_id ON second_opinion_requests(case_id);
CREATE INDEX idx_second_opinion_requests_status ON second_opinion_requests(status);
CREATE INDEX idx_consultations_request_id ON consultations(request_id);
CREATE INDEX idx_consultations_scheduled_time ON consultations(scheduled_time);
CREATE INDEX idx_consultation_feedback_consultation_id ON consultation_feedback(consultation_id);

-- Create functions and triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_specialists_updated_at
  BEFORE UPDATE ON specialists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_second_opinion_requests_updated_at
  BEFORE UPDATE ON second_opinion_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_consultations_updated_at
  BEFORE UPDATE ON consultations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_consultation_feedback_updated_at
  BEFORE UPDATE ON consultation_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at(); 