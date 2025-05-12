import { CheckIn } from '@/types/triage';

interface TriageAnalysis {
  triage_score: 'Low' | 'Medium' | 'High';
  suggested_department: string;
  estimated_wait_minutes: number;
  potential_diagnoses: string[];
  recommended_actions: string[];
  risk_factors: string[];
  symptoms_analysis: {
    primary_symptom: string;
    additional_symptoms: string[];
    pain_level: string;
    pain_location: string;
    impact_on_activities: string;
  };
}

// Helper for safely handling string or array values
const processStrOrArray = (value: string | string[] | undefined): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value.split(',').map(s => s.trim());
};

// Helper for safely checking if a string or string array includes a value
const includesValue = (value: string | string[] | undefined, searchTerm: string): boolean => {
  if (!value) return false;
  if (Array.isArray(value)) return value.some(item => item.toLowerCase().includes(searchTerm.toLowerCase()));
  return value.toLowerCase().includes(searchTerm.toLowerCase());
};

export function analyzeTriage(checkIn: CheckIn): TriageAnalysis {
  // Initialize base analysis
  const analysis: TriageAnalysis = {
    triage_score: 'Low',
    suggested_department: 'General Medicine',
    estimated_wait_minutes: 60,
    potential_diagnoses: [],
    recommended_actions: [],
    risk_factors: [],
    symptoms_analysis: {
      primary_symptom: '',
      additional_symptoms: [],
      pain_level: '',
      pain_location: '',
      impact_on_activities: ''
    }
  };

  // Analyze primary symptom
  analysis.symptoms_analysis.primary_symptom = checkIn.primary_symptom;
  
  // Analyze additional symptoms
  analysis.symptoms_analysis.additional_symptoms = processStrOrArray(checkIn.additional_symptoms);

  // Analyze pain level
  const painLevel = checkIn.symptoms.pain_level;
  analysis.symptoms_analysis.pain_level = `Level ${painLevel}/10 - ${getPainDescription(painLevel)}`;
  if (painLevel >= 8) {
    analysis.triage_score = 'High';
    analysis.estimated_wait_minutes = 15;
    analysis.recommended_actions.push('Immediate pain assessment', 'Pain management protocol');
  } else if (painLevel >= 5) {
    analysis.triage_score = 'Medium';
    analysis.estimated_wait_minutes = 30;
    analysis.recommended_actions.push('Pain assessment', 'Comfort measures');
  }

  // Analyze pain location
  analysis.symptoms_analysis.pain_location = checkIn.symptoms.pain_location;
  if (checkIn.symptoms.pain_location.toLowerCase().includes('chest')) {
    analysis.triage_score = 'High';
    analysis.suggested_department = 'Cardiology';
    analysis.estimated_wait_minutes = 15;
    analysis.potential_diagnoses.push('Cardiac event', 'Pulmonary embolism', 'Pneumothorax');
    analysis.recommended_actions.push('ECG immediately', 'Cardiac enzymes', 'Chest X-ray');
    analysis.risk_factors.push('Potential cardiac event');
  } else if (checkIn.symptoms.pain_location.toLowerCase().includes('head')) {
    analysis.triage_score = 'High';
    analysis.suggested_department = 'Neurology';
    analysis.potential_diagnoses.push('Migraine', 'Tension headache', 'Intracranial pressure');
    analysis.recommended_actions.push('Neurological assessment', 'CT scan if indicated');
  }

  // Analyze impact on activities
  const impact = checkIn.symptoms.impact_on_activities;
  if (typeof impact === 'string') {
    analysis.symptoms_analysis.impact_on_activities = impact;
    if (impact === 'severe') {
      analysis.triage_score = 'High';
      analysis.estimated_wait_minutes = 20;
      analysis.recommended_actions.push('Immediate functional assessment');
    } else if (impact === 'moderate') {
      analysis.triage_score = 'Medium';
      analysis.estimated_wait_minutes = 45;
    }
  } else if (Array.isArray(impact) && impact.length > 0) {
    analysis.symptoms_analysis.impact_on_activities = impact.join(', ');
    if (impact.includes('severe')) {
      analysis.triage_score = 'High';
      analysis.estimated_wait_minutes = 20;
      analysis.recommended_actions.push('Immediate functional assessment');
    } else if (impact.includes('moderate')) {
      analysis.triage_score = 'Medium';
      analysis.estimated_wait_minutes = 45;
    }
  }

  // Analyze medical history
  if (includesValue(checkIn.symptoms.medical_history, 'heart')) {
    analysis.triage_score = 'High';
    analysis.suggested_department = 'Cardiology';
    analysis.estimated_wait_minutes = 15;
    analysis.risk_factors.push('Cardiac history');
  }
  if (includesValue(checkIn.symptoms.medical_history, 'diabetes')) {
    analysis.risk_factors.push('Diabetes mellitus');
    analysis.recommended_actions.push('Blood glucose check');
  }
  if (includesValue(checkIn.symptoms.medical_history, 'hypertension')) {
    analysis.risk_factors.push('Hypertension');
    analysis.recommended_actions.push('Blood pressure monitoring');
  }

  // Analyze current symptoms
  if (includesValue(checkIn.symptoms.current_symptoms, 'difficulty breathing')) {
    analysis.triage_score = 'High';
    analysis.suggested_department = 'Emergency';
    analysis.estimated_wait_minutes = 10;
    analysis.potential_diagnoses.push('Asthma', 'Pneumonia', 'Pulmonary embolism', 'COPD exacerbation');
    analysis.recommended_actions.push('Oxygen assessment', 'Chest X-ray', 'ABG if indicated');
  }
  if (includesValue(checkIn.symptoms.current_symptoms, 'fever')) {
    analysis.potential_diagnoses.push('Infection', 'Viral illness');
    analysis.recommended_actions.push('Temperature monitoring', 'Infection screening');
  }
  if (includesValue(checkIn.symptoms.current_symptoms, 'nausea')) {
    analysis.potential_diagnoses.push('Gastroenteritis', 'Food poisoning', 'Migraine');
    analysis.recommended_actions.push('Hydration assessment', 'Anti-emetics if needed');
  }

  // Add general recommendations based on triage score
  if (analysis.triage_score === 'High') {
    analysis.recommended_actions.push('Vital signs monitoring', 'Continuous observation', 'Emergency protocol');
  } else if (analysis.triage_score === 'Medium') {
    analysis.recommended_actions.push('Regular vital signs check', 'Pain management', 'Comfort measures');
  } else {
    analysis.recommended_actions.push('Routine assessment', 'Comfort measures', 'Regular monitoring');
  }

  return analysis;
}

function getPainDescription(level: number): string {
  if (level >= 9) return 'Severe, unbearable pain';
  if (level >= 7) return 'Very severe pain';
  if (level >= 5) return 'Moderate to severe pain';
  if (level >= 3) return 'Moderate pain';
  if (level >= 1) return 'Mild pain';
  return 'No pain';
} 