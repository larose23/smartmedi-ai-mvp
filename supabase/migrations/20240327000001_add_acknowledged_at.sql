-- Add acknowledged_at column to emergency_alerts table
ALTER TABLE public.emergency_alerts
ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP WITH TIME ZONE;

-- Update the acknowledge trigger to set acknowledged_at
CREATE OR REPLACE FUNCTION public.update_acknowledged_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'acknowledged' AND OLD.status = 'active' THEN
        NEW.acknowledged_at = timezone('utc'::text, now());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic acknowledged_at update
CREATE TRIGGER update_acknowledged_at_trigger
    BEFORE UPDATE ON public.emergency_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_acknowledged_at(); 