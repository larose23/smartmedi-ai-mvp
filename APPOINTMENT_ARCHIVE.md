# Appointment–Archive Linkage Implementation

This document outlines the fixed implementation of the Appointment–Archive Linkage feature for the SmartMedi AI MVP project.

## Overview

This feature enhances the appointment booking system to ensure that when a patient books an appointment:
1. Their complete record is immediately moved from the check_ins table to the patients archive
2. The archive record is linked to the appointment that was created
3. All medical and triage information is preserved in the archive

## Implementation Details

### 1. Optimized Archive Process

The archive process now uses Supabase's efficient **delete-and-return pattern**:
```js
const { data: checkInData, error: deleteError } = await supabase
  .from('check_ins')
  .delete()
  .eq('id', patientId)
  .select('*')
  .single();
```

This approach:
- Retrieves the complete patient record and removes it from `check_ins` in a single atomic operation
- Eliminates the possibility of data loss between separate fetch and delete operations
- Immediately removes the patient from the dashboard without requiring a refresh

### 2. Enhanced Archive API (`/api/archive-patient`)

The API endpoint now:
- Uses the delete-and-return pattern for better reliability
- Preserves all fields from the original check-in record
- Sets `appointment_id` to link to the appointment that triggered the archive
- Sets `archived_at` timestamp to track when archiving occurred
- Gracefully handles patients who are already archived

### 3. Database Schema

The patients archive table includes the following fields:
- `appointment_id` (UUID): Links to the appointment that caused archiving
- `archived_at` (TIMESTAMPTZ): Records when the patient was archived
- All original check_in fields to preserve medical information:
  - `primary_symptom`
  - `additional_symptoms`
  - `triage_score`
  - `suggested_department`
  - `estimated_wait_minutes`
  - `potential_diagnoses`
  - `recommended_actions`
  - `risk_factors`

### 4. Archive UI Enhancements

The patient archive page (`/patients-archive`) now:
- Displays `archived_at` timestamp in MM/DD/YYYY, HH:MM format
- Includes appointment details when available
- Sorts patients by archive date (most recent first)
- Provides direct links to view patient details

### 5. Better Error Handling

The implementation now:
- Detects and properly handles patients who may already be archived
- Logs detailed diagnostic information in case of failures
- Shows appropriate feedback to users when operations succeed or fail

## Testing

A comprehensive test suite verifies:
1. Patients are correctly archived using the delete-and-return pattern
2. All fields are properly preserved during archiving
3. Appointment linkage works correctly
4. Multiple attempts to archive the same patient are handled gracefully

Run the tests with:
```
npm test __tests__/archive-linkage-fix.test.js
```

## Verification Process

To verify the implementation:

1. Start the application:
   ```
   npm run migrate   # Apply schema updates if needed
   npm run dev       # Start the application
   ```

2. Create a new patient check-in via the check-in form
3. Note the patient appears on the dashboard
4. Schedule an appointment for the patient
5. Verify:
   - The patient immediately disappears from the dashboard
   - A success toast appears with a link to view in the archive
   - The patient appears in the patients archive with appropriate timestamps
   - All patient information is preserved
   - The archive shows the linked appointment details 