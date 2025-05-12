-- Create a function to log check-ins without schema cache issues
CREATE OR REPLACE FUNCTION log_check_in(p_patient_name TEXT, p_form_data JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Ensure table exists
  EXECUTE '
    CREATE TABLE IF NOT EXISTS simple_check_in_logs (
      id SERIAL PRIMARY KEY,
      patient_name TEXT,
      form_data JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  ';
  
  -- Insert the data
  EXECUTE '
    INSERT INTO simple_check_in_logs(patient_name, form_data)
    VALUES ($1, $2)
  ' USING p_patient_name, p_form_data;
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in log_check_in function: %', SQLERRM;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql; 