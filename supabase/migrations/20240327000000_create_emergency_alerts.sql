-- Create emergency_alerts table
CREATE TABLE IF NOT EXISTS public.emergency_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES public.check_ins(id),
    patient_name TEXT NOT NULL,
    department TEXT NOT NULL,
    priority_level TEXT NOT NULL CHECK (priority_level = 'high'),
    symptoms TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    acknowledged_by UUID REFERENCES auth.users(id),
    status TEXT NOT NULL CHECK (status IN ('active', 'acknowledged')),
    CONSTRAINT fk_patient FOREIGN KEY (patient_id) REFERENCES public.check_ins(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_status ON public.emergency_alerts(status);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_created_at ON public.emergency_alerts(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users" ON public.emergency_alerts
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.emergency_alerts
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.emergency_alerts
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create function to automatically create emergency alerts
CREATE OR REPLACE FUNCTION public.create_emergency_alert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.priority_level = 'high' THEN
        INSERT INTO public.emergency_alerts (
            patient_id,
            patient_name,
            department,
            priority_level,
            symptoms,
            status
        ) VALUES (
            NEW.id,
            NEW.full_name,
            NEW.department,
            NEW.priority_level,
            NEW.primary_symptom,
            'active'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic emergency alert creation
CREATE TRIGGER create_emergency_alert_trigger
    AFTER INSERT ON public.check_ins
    FOR EACH ROW
    EXECUTE FUNCTION public.create_emergency_alert(); 