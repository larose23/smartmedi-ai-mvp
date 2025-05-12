-- Create alert configurations table
CREATE TABLE alert_configs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'slack')),
  recipient TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create alert logs table
CREATE TABLE alert_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  case_id UUID REFERENCES triage_cases(id),
  severity TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  department TEXT NOT NULL,
  symptoms TEXT[] NOT NULL,
  wait_time INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_alert_configs_type ON alert_configs(type);
CREATE INDEX idx_alert_configs_is_active ON alert_configs(is_active);
CREATE INDEX idx_alert_logs_case_id ON alert_logs(case_id);
CREATE INDEX idx_alert_logs_timestamp ON alert_logs(timestamp);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_alert_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_alert_configs_updated_at
  BEFORE UPDATE ON alert_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_alert_configs_updated_at(); 