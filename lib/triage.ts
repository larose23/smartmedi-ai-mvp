import { CheckIn } from '@/types/triage';

export function analyzeSymptoms(
  primary_symptom: string,
  additional_symptoms: string | string[],
  patientName: string,
  dateOfBirth: string,
  contactInfo: string,
  symptoms: {
    pain_level: number;
    pain_location: string;
    pain_characteristics: string[];
    impact_on_activities: string[];
    medical_history: string[];
    current_symptoms: string[];
  }
): Omit<CheckIn, 'id' | 'patient_id' | 'check_in_time' | 'staff_notes' | 'status'> {
  // Analyze pain level and characteristics
  const painScore = symptoms.pain_level;
  const hasSeverePain = painScore >= 8;
  const hasModeratePain = painScore >= 5 && painScore < 8;
  
  // Analyze symptoms and medical history
  const hasEmergencySymptoms = symptoms.current_symptoms.some(symptom => 
    ['chest pain', 'difficulty breathing', 'severe bleeding', 'loss of consciousness'].includes(symptom.toLowerCase())
  );
  
  const hasRiskFactors = symptoms.medical_history.some(condition =>
    ['heart disease', 'diabetes', 'high blood pressure', 'asthma'].includes(condition.toLowerCase())
  );

  // Determine priority level
  let triage_score: 'High' | 'Medium' | 'Low';
  if (hasEmergencySymptoms || (hasSeverePain && hasRiskFactors)) {
    triage_score = 'High';
  } else if (hasModeratePain || hasRiskFactors) {
    triage_score = 'Medium';
  } else {
    triage_score = 'Low';
  }

  // Determine suggested department
  let suggested_department: string;
  if (symptoms.pain_location.toLowerCase().includes('chest')) {
    suggested_department = 'Cardiology';
  } else if (symptoms.pain_location.toLowerCase().includes('head')) {
    suggested_department = 'Neurology';
  } else if (symptoms.current_symptoms.some(s => s.toLowerCase().includes('breathing'))) {
    suggested_department = 'Pulmonology';
  } else {
    suggested_department = 'General Medicine';
  }

  // Calculate estimated wait time based on priority
  const estimated_wait_minutes = triage_score === 'High' ? 15 : 
                               triage_score === 'Medium' ? 45 : 90;

  // Generate potential diagnoses based on symptoms
  const potential_diagnoses = symptoms.current_symptoms.map(symptom => {
    switch (symptom.toLowerCase()) {
      case 'chest pain':
        return 'Possible Angina or Heart Attack';
      case 'difficulty breathing':
        return 'Possible Asthma or Respiratory Infection';
      case 'headache':
        return 'Possible Migraine or Tension Headache';
      default:
        return `Possible Condition related to ${symptom}`;
    }
  });

  // Generate recommended actions
  const recommended_actions = [
    ...(triage_score === 'High' ? ['Immediate medical attention required'] : []),
    ...(hasSeverePain ? ['Pain management assessment needed'] : []),
    ...(hasRiskFactors ? ['Monitor vital signs closely'] : []),
    'Complete medical history review',
    'Vital signs check',
    'Initial assessment by triage nurse'
  ];

  // Identify risk factors
  const risk_factors = [
    ...(hasRiskFactors ? ['Pre-existing medical conditions'] : []),
    ...(symptoms.impact_on_activities.length > 0 ? ['Activity limitations'] : []),
    ...(symptoms.pain_characteristics.includes('chronic') ? ['Chronic pain history'] : []),
    ...(symptoms.medical_history.length > 0 ? ['Complex medical history'] : [])
  ];

  // Calculate age based on DOB (simple calculation for now)
  const birthYear = new Date(dateOfBirth).getFullYear();
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;

  return {
    full_name: patientName,
    date_of_birth: dateOfBirth,
    contact_information: contactInfo,
    contact_info: contactInfo,
    primary_symptom,
    additional_symptoms,
    department: suggested_department,
    triage_score,
    suggested_department,
    estimated_wait_minutes,
    potential_diagnoses,
    recommended_actions,
    risk_factors,
    symptoms,
    age,
    gender: '', // Default empty, should be provided by the caller
    weight: 0,  // Default value
    height: 0,  // Default value
    timestamp: new Date().toISOString()
  };
} 