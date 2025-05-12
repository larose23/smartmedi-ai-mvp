import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { analyzeSymptoms } from '@/lib/triage';
import { analyzeDiagnosis } from '@/lib/diagnostic-system';

export async function POST(request: Request) {
  try {
    // Parse the request body
    const formData = await request.json();

    // Extract symptoms data for triage analysis
    const painCharacteristicsArray = Object.entries(formData.painCharacteristics || {})
      .filter(([_, value]) => value === true)
      .map(([key]) => key);

    const impactOnActivitiesArray = Object.entries(formData.impactOnActivities || {})
      .filter(([_, value]) => value === true)
      .map(([key]) => key);

    const medicalHistoryArray = Object.entries(formData.medicalHistory || {})
      .filter(([_, value]) => value === true)
      .map(([key]) => key);

    const currentSymptomsArray = Object.entries(formData.currentSymptoms || {})
      .filter(([_, value]) => value === true)
      .map(([key]) => key);

    // Prepare symptoms data for AI analysis
    const symptomsData = {
      pain_level: parseInt(formData.painLevel) || 0,
      pain_location: formData.painLocation || '',
      pain_characteristics: painCharacteristicsArray,
      impact_on_activities: impactOnActivitiesArray,
      medical_history: medicalHistoryArray,
      current_symptoms: currentSymptomsArray,
    };

    // Determine primary symptom from current symptoms
    const primarySymptom = currentSymptomsArray.length > 0 
      ? currentSymptomsArray[0] 
      : formData.painLocation 
        ? `Pain in ${formData.painLocation}` 
        : 'Unspecified symptoms';

    // Call AI triage function with symptoms data
    const triageResult = await analyzeSymptoms(symptomsData);
    console.log('Triage result:', triageResult);

    // Get diagnostic analysis if AI triage succeeded
    let diagnosisResult = null;
    try {
      if (triageResult) {
        diagnosisResult = await analyzeDiagnosis({
          symptoms: symptomsData,
          patient_age: calculateAge(formData.dateOfBirth),
          patient_gender: formData.gender,
          triage_score: triageResult.triage_score,
        });
        console.log('Diagnosis result:', diagnosisResult);
      }
    } catch (diagnosisError) {
      console.error('Error in diagnosis:', diagnosisError);
    }

    // Create a patient record in check_ins table
    const patientId = uuidv4();
    const { data, error } = await supabase
      .from('check_ins')
      .insert({
        id: patientId,
        full_name: formData.patientName,
        date_of_birth: formData.dateOfBirth,
        gender: formData.gender,
        contact_info: formData.contactInfo,
        primary_symptom: primarySymptom,
        additional_symptoms: currentSymptomsArray,
        triage_score: triageResult?.triage_score || 'Medium',
        department: triageResult?.suggested_department || 'General',
        estimated_wait_minutes: triageResult?.estimated_wait_minutes || 30,
        symptoms: symptomsData,
        potential_diagnoses: diagnosisResult?.potential_diagnoses || triageResult?.potential_diagnoses || [],
        recommended_actions: diagnosisResult?.recommended_actions || triageResult?.recommended_actions || [],
        risk_factors: diagnosisResult?.risk_factors || triageResult?.risk_factors || [],
        status: 'pending',
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error saving check-in:', error);
      return NextResponse.json(
        { error: 'Failed to save check-in' },
        { status: 500 }
      );
    }

    console.log('Patient check-in saved with ID:', patientId);

    // Return a success response
    return NextResponse.json({
      message: 'Check-in completed successfully!',
      patient: {
        id: patientId,
        name: formData.patientName,
        gender: formData.gender,
        dob: formData.dateOfBirth,
      }
    });
  } catch (error) {
    console.error('Error processing check-in:', error);
    return NextResponse.json(
      { error: 'An error occurred during check-in' },
      { status: 500 }
    );
  }
}

// Helper function to calculate age from date of birth
function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();
  
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
} 