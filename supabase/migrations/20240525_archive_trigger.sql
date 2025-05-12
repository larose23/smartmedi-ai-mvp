-- Create a trigger function to automatically archive patients when an appointment is created/updated
CREATE OR REPLACE FUNCTION trigger_archive_on_appointment()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed for scheduled/booked appointments with a patient_id
    IF (NEW.status = 'scheduled' OR NEW.status = 'booked' OR NEW.status = 'confirmed') AND NEW.patient_id IS NOT NULL THEN
        -- Try to archive the patient
        PERFORM archive_check_in(NEW.patient_id, NEW.id);
        
        -- Log the archiving attempt
        RAISE NOTICE 'Attempted to archive patient % for appointment %', NEW.patient_id, NEW.id;
    END IF;
    
    -- Always return the NEW record to allow the operation to complete
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on the appointments table
DROP TRIGGER IF EXISTS appointment_archive_trigger ON appointments;

CREATE TRIGGER appointment_archive_trigger
AFTER INSERT OR UPDATE
ON appointments
FOR EACH ROW
EXECUTE FUNCTION trigger_archive_on_appointment();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema'; 