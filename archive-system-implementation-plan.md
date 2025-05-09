# SmartMedi Archive System Implementation Plan

## Overview

This plan outlines a complete rebuild of the patient archiving system to create a robust, reliable solution that properly links check-ins, appointments, and archived patient records.

## 1. Database Schema

### Table: `patients` (Archive)

```sql
-- Ensure patients table has all required columns
ALTER TABLE patients ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT uuid_generate_v4();
ALTER TABLE patients ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS date_of_birth TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS contact TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE patients ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS primary_symptom TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS additional_symptoms JSONB;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS triage_score TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS suggested_department TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS estimated_wait_minutes INTEGER;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS potential_diagnoses TEXT[];
ALTER TABLE patients ADD COLUMN IF NOT EXISTS recommended_actions TEXT[];
ALTER TABLE patients ADD COLUMN IF NOT EXISTS risk_factors TEXT[];
```

### Add Status Column to Check-ins Table

```sql
-- Add status column to check_ins table if not exists
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS status TEXT;
```

## 2. Database Functions

### Archive Check-in Function

```sql
CREATE OR REPLACE FUNCTION archive_check_in(
  p_check_in_id UUID,
  p_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_check_in RECORD;
  v_success BOOLEAN := FALSE;
BEGIN
  -- Start transaction
  BEGIN
    -- First, check if the check-in exists
    SELECT * INTO v_check_in 
    FROM check_ins 
    WHERE id = p_check_in_id;
    
    IF v_check_in IS NULL THEN
      RAISE EXCEPTION 'Check-in with ID % not found', p_check_in_id;
    END IF;
    
    -- Update the check-in status to 'archived'
    UPDATE check_ins 
    SET status = 'archived' 
    WHERE id = p_check_in_id;
    
    -- Create or update the patient record in the patients table
    -- Using UPSERT to handle cases where the patient might already exist
    INSERT INTO patients (
      id,
      first_name,
      last_name,
      date_of_birth,
      gender,
      contact,
      phone_number,
      name,
      created_at,
      appointment_id,
      archived_at,
      primary_symptom,
      additional_symptoms,
      triage_score,
      suggested_department,
      estimated_wait_minutes,
      potential_diagnoses,
      recommended_actions,
      risk_factors
    ) VALUES (
      v_check_in.id,
      COALESCE(SPLIT_PART(v_check_in.full_name, ' ', 1), 'Unknown'),
      CASE 
        WHEN v_check_in.full_name IS NULL OR POSITION(' ' IN v_check_in.full_name) = 0 THEN 'Patient'
        ELSE SUBSTRING(v_check_in.full_name FROM POSITION(' ' IN v_check_in.full_name) + 1)
      END,
      COALESCE(v_check_in.date_of_birth, NULL),
      COALESCE(v_check_in.gender, 'Not Specified'),
      COALESCE(v_check_in.contact_info, NULL),
      COALESCE(v_check_in.contact_info, NULL),
      COALESCE(v_check_in.full_name, 'Unknown Patient'),
      COALESCE(v_check_in.created_at, CURRENT_TIMESTAMP),
      p_appointment_id,
      CURRENT_TIMESTAMP,
      COALESCE(v_check_in.primary_symptom, NULL),
      COALESCE(v_check_in.additional_symptoms, NULL),
      COALESCE(v_check_in.triage_score, NULL),
      COALESCE(v_check_in.department, 'General'),
      COALESCE(v_check_in.estimated_wait_minutes, NULL),
      COALESCE(v_check_in.potential_diagnoses, NULL),
      COALESCE(v_check_in.recommended_actions, NULL),
      COALESCE(v_check_in.risk_factors, NULL)
    ) ON CONFLICT (id) DO UPDATE SET
      appointment_id = EXCLUDED.appointment_id,
      archived_at = EXCLUDED.archived_at,
      primary_symptom = COALESCE(EXCLUDED.primary_symptom, patients.primary_symptom),
      additional_symptoms = COALESCE(EXCLUDED.additional_symptoms, patients.additional_symptoms),
      triage_score = COALESCE(EXCLUDED.triage_score, patients.triage_score),
      suggested_department = COALESCE(EXCLUDED.suggested_department, patients.suggested_department),
      estimated_wait_minutes = COALESCE(EXCLUDED.estimated_wait_minutes, patients.estimated_wait_minutes),
      potential_diagnoses = COALESCE(EXCLUDED.potential_diagnoses, patients.potential_diagnoses),
      recommended_actions = COALESCE(EXCLUDED.recommended_actions, patients.recommended_actions),
      risk_factors = COALESCE(EXCLUDED.risk_factors, patients.risk_factors);
      
    v_success := TRUE;
    
    -- Commit the transaction
    RETURN v_success;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error in archive_check_in transaction: %', SQLERRM;
      RETURN FALSE;
  END;
END;
$$ LANGUAGE plpgsql;
```

### Archive Trigger Function

```sql
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
```

## 3. API Implementation

### Simplified Archive API (app/api/archive-patient/route.ts)

```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { patientId, appointmentId } = await request.json();
    
    if (!patientId) {
      return NextResponse.json({ success: false, error: 'Patient ID is required' }, { status: 400 });
    }
    
    // Initialize Supabase client
    const supabase = createRouteHandlerClient({ cookies });

    // Use the transaction function to archive
    const { data: functionResult, error: functionError } = await supabase
      .rpc('archive_check_in', {
        p_check_in_id: patientId,
        p_appointment_id: appointmentId
      });

    if (functionError) {
      console.error('[Archive API] Transaction function error:', functionError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to archive patient',
        details: functionError
      }, { status: 500 });
    }
    
    // Verify the patient was archived correctly
    const { data: verifyData, error: verifyError } = await supabase
      .from('patients')
      .select('id, first_name, last_name')
      .eq('id', patientId)
      .single();
      
    if (verifyError) {
      console.error('[Archive API] Error verifying archive:', verifyError);
      return NextResponse.json({ 
        success: false, 
        error: 'Archive verification failed',
        details: verifyError
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Patient archived successfully',
      patient: verifyData
    });
    
  } catch (error) {
    console.error('[Archive API] Uncaught error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error
    }, { status: 500 });
  }
}
```

### Migration Runner API (app/api/run-migrations/route.ts)

Keep the existing implementation but simplify it to focus on running just the archive-related migrations.

## 4. Frontend Components

### Archive Fix Button Component (app/components/ArchiveFixButton.tsx)

Keep the existing component but ensure it's properly calling the run-migrations API.

### Archive Page (app/patients-archive/page.tsx)

Simplify the existing archive page to focus on core functionality:
- Display archived patients
- Show appointments linked to archived patients
- Provide diagnostic information for troubleshooting

## 5. Implementation Steps

1. **Backup Current Data**
   - Take a snapshot of the database before making changes

2. **Schema Update**
   - Run the schema migration to ensure all required columns exist

3. **Function Deployment**
   - Deploy the database functions for archiving

4. **API Implementation**
   - Update the archive-patient API with the simplified version
   - Test the API with sample data

5. **Fix Existing Data**
   - Run a one-time script to fix existing data:
     - Mark all completed check-ins as archived
     - Ensure all patients have proper archive timestamps
     - Link patients to their appointments

6. **Frontend Updates**
   - Update the archive page to use the new system
   - Test the archive fix button

7. **Testing**
   - Verify archiving works from appointment creation
   - Test direct archiving from check-ins
   - Validate existing archived patients display correctly

## 6. Rollout Plan

1. Deploy database schema changes first
2. Deploy database functions
3. Deploy API and frontend changes
4. Run data migration
5. Test end-to-end workflow
6. Monitor for any issues and address promptly 