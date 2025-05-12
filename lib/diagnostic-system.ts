import { CheckIn } from '@/types/triage';
import { MEDICAL_KNOWLEDGE, findConditionsBySymptoms, getUrgencyLevel } from './medical-knowledge';
import { MLModel } from './ml-integration';

export interface DiagnosticResult {
  primary_diagnosis: string;
  differential_diagnoses: string[];
  severity: 'Mild' | 'Moderate' | 'Severe' | 'Critical';
  recommended_department: string;
  urgency: 'Immediate' | 'Urgent' | 'Routine';
  recommended_actions: string[];
  risk_factors: string[];
  symptoms_analysis: {
    primary_symptom: string;
    additional_symptoms: string[];
    pain_level: string;
    pain_location: string;
    impact_on_activities: string;
  };
  ml_enhancement?: {
    confidence: number;
    risk_score: number;
    additional_tests: string[];
  };
}

type SymptomCategory = 'cardiac' | 'respiratory' | 'neurological' | 'gastrointestinal' | 'musculoskeletal';

interface SymptomPattern {
  symptoms: string[];
  diagnoses: string[];
  department: string;
  urgency: 'Immediate' | 'Urgent' | 'Routine';
}

const SYMPTOM_PATTERNS: Record<SymptomCategory, SymptomPattern> = {
  cardiac: {
    symptoms: ['chest pain', 'shortness of breath', 'palpitations', 'dizziness'],
    diagnoses: ['Acute Coronary Syndrome', 'Myocardial Infarction', 'Angina', 'Arrhythmia'],
    department: 'Cardiology',
    urgency: 'Immediate'
  },
  respiratory: {
    symptoms: ['difficulty breathing', 'cough', 'wheezing', 'chest tightness'],
    diagnoses: ['Asthma', 'Pneumonia', 'COPD Exacerbation', 'Pulmonary Embolism'],
    department: 'Pulmonology',
    urgency: 'Urgent'
  },
  neurological: {
    symptoms: ['headache', 'dizziness', 'numbness', 'weakness', 'confusion'],
    diagnoses: ['Migraine', 'Stroke', 'TIA', 'Meningitis'],
    department: 'Neurology',
    urgency: 'Immediate'
  },
  gastrointestinal: {
    symptoms: ['abdominal pain', 'nausea', 'vomiting', 'diarrhea'],
    diagnoses: ['Gastroenteritis', 'Appendicitis', 'Gastritis', 'Peptic Ulcer'],
    department: 'Gastroenterology',
    urgency: 'Urgent'
  },
  musculoskeletal: {
    symptoms: ['joint pain', 'back pain', 'muscle pain', 'swelling'],
    diagnoses: ['Arthritis', 'Sprain', 'Strain', 'Fracture'],
    department: 'Orthopedics',
    urgency: 'Routine'
  }
};

const RISK_FACTORS: Record<SymptomCategory, string[]> = {
  cardiac: ['Hypertension', 'Diabetes', 'Smoking', 'Family History of Heart Disease', 'High Cholesterol'],
  respiratory: ['Smoking', 'Asthma', 'COPD', 'Recent Travel', 'Immunocompromised'],
  neurological: ['Hypertension', 'Diabetes', 'Previous Stroke', 'Migraine History'],
  gastrointestinal: ['Recent Food Intake', 'Alcohol Use', 'NSAID Use', 'Previous GI Issues'],
  musculoskeletal: ['Recent Trauma', 'Repetitive Motion', 'Obesity', 'Osteoporosis']
};

export async function analyzeDiagnosis(checkIn: CheckIn, mlModel?: MLModel): Promise<DiagnosticResult> {
  try {
    // Handle missing/invalid check-in data with defaults
    if (!checkIn) {
      console.error('Invalid check-in data: Missing check-in object');
      return createDefaultDiagnosticResult();
    }

    // Ensure checkIn has all required properties initialized to avoid errors
    checkIn = {
      ...checkIn,
      primary_symptom: checkIn.primary_symptom || 'Not specified',
      additional_symptoms: Array.isArray(checkIn.additional_symptoms) 
        ? checkIn.additional_symptoms 
        : typeof checkIn.additional_symptoms === 'string'
          ? [checkIn.additional_symptoms]
          : [],
      symptoms: checkIn.symptoms || {
        pain_level: 0,
        pain_location: '',
        impact_on_activities: '',
        medical_history: '',
        current_symptoms: ''
      }
    };

    // Validate pain level with default if invalid
    const painLevel = typeof checkIn.symptoms.pain_level === 'number' && 
      !isNaN(checkIn.symptoms.pain_level) && 
      checkIn.symptoms.pain_level >= 0 && 
      checkIn.symptoms.pain_level <= 10 
        ? checkIn.symptoms.pain_level 
        : 0;

    // Process additional symptoms safely
    const processedAdditionalSymptoms = Array.isArray(checkIn.additional_symptoms)
      ? checkIn.additional_symptoms
      : typeof checkIn.additional_symptoms === 'string'
        ? checkIn.additional_symptoms.split(',').map(s => s.trim())
        : [];

    // Combine current symptoms into an array safely
    const currentSymptoms = typeof checkIn.symptoms.current_symptoms === 'string'
      ? checkIn.symptoms.current_symptoms.split(',').map(s => s.trim())
      : Array.isArray(checkIn.symptoms.current_symptoms)
        ? checkIn.symptoms.current_symptoms
        : [];

    // Get all symptoms for analysis
    const allSymptoms = [
      checkIn.primary_symptom,
      ...processedAdditionalSymptoms,
      ...currentSymptoms
    ].filter(Boolean); // Filter out empty strings

    // Find potential conditions based on symptoms
    const potentialConditions = findConditionsBySymptoms(allSymptoms);
    
    // Get urgency level
    const urgency = getUrgencyLevel(allSymptoms);

    // Format impact on activities safely
    let impactOnActivities: string;
    if (typeof checkIn.symptoms.impact_on_activities === 'string') {
      impactOnActivities = checkIn.symptoms.impact_on_activities;
    } else if (Array.isArray(checkIn.symptoms.impact_on_activities)) {
      impactOnActivities = checkIn.symptoms.impact_on_activities.join(', ');
    } else {
      impactOnActivities = 'Not specified';
    }

    // Initialize result
    const result: DiagnosticResult = {
      primary_diagnosis: '',
      differential_diagnoses: [],
      severity: 'Mild',
      recommended_department: checkIn.department || 'General Medicine',
      urgency,
      recommended_actions: [],
      risk_factors: [],
      symptoms_analysis: {
        primary_symptom: checkIn.primary_symptom,
        additional_symptoms: processedAdditionalSymptoms,
        pain_level: getPainDescription(painLevel),
        pain_location: checkIn.symptoms.pain_location || 'Not specified',
        impact_on_activities: impactOnActivities
      }
    };

    // Set severity based on pain level and urgency
    if (painLevel >= 8 || urgency === 'Immediate') {
      result.severity = 'Critical';
    } else if (painLevel >= 5 || urgency === 'Urgent') {
      result.severity = 'Severe';
    } else if (painLevel >= 3) {
      result.severity = 'Moderate';
    }

    // Process potential conditions
    if (potentialConditions.length > 0) {
      const primaryCondition = MEDICAL_KNOWLEDGE[potentialConditions[0]];
      if (primaryCondition) {
        result.primary_diagnosis = primaryCondition.name;
        result.recommended_department = primaryCondition.department;
        result.differential_diagnoses = potentialConditions.slice(1).map(condition => 
          MEDICAL_KNOWLEDGE[condition] ? MEDICAL_KNOWLEDGE[condition].name : condition
        );
        result.recommended_actions = primaryCondition.diagnosticTests;
        result.risk_factors = primaryCondition.riskFactors;
      }
    }

    // If no primary diagnosis found but we have symptoms, generate a general one
    if (!result.primary_diagnosis && allSymptoms.length > 0) {
      const highPrioritySymptoms = ['chest pain', 'shortness of breath', 'severe headache', 'severe abdominal pain'];
      const hasHighPrioritySymptom = allSymptoms.some(symptom => 
        highPrioritySymptoms.some(priority => String(symptom).toLowerCase().includes(priority))
      );
      
      if (hasHighPrioritySymptom) {
        result.primary_diagnosis = 'Acute Symptom Requiring Evaluation';
        result.recommended_actions = ['Immediate medical assessment', 'Vital signs monitoring'];
      } else {
        result.primary_diagnosis = 'Symptom Assessment Required';
        result.recommended_actions = ['Medical evaluation', 'Symptom monitoring'];
      }
    }

    // Default risk factors if none assigned
    if (result.risk_factors.length === 0) {
      const medicalHistory = checkIn.symptoms.medical_history || '';
      if (medicalHistory) {
        const historyItems = typeof medicalHistory === 'string' 
          ? medicalHistory.split(',').map(item => item.trim()) 
          : [];
        
        result.risk_factors = historyItems.length > 0 ? historyItems : ['No specific risk factors identified'];
      } else {
        result.risk_factors = ['No medical history provided'];
      }
    }

    // Add ML enhancement if available
    if (mlModel) {
      try {
        const mlPrediction = await mlModel.predict(checkIn);
        result.ml_enhancement = {
          confidence: mlPrediction.confidence,
          risk_score: mlPrediction.risk_score,
          additional_tests: mlPrediction.recommended_tests
        };

        // Enhance diagnosis with ML results if confidence is high
        if (mlPrediction.confidence > 0.8) {
          result.primary_diagnosis = mlPrediction.diagnosis;
          result.recommended_actions = [...result.recommended_actions, ...mlPrediction.recommended_tests];
        }
      } catch (error) {
        console.error('ML prediction error:', error);
      }
    }

    return result;
  } catch (error) {
    console.error('Error in analyzeDiagnosis:', error);
    return createDefaultDiagnosticResult();
  }
}

function createDefaultDiagnosticResult(): DiagnosticResult {
  return {
    primary_diagnosis: 'Analysis pending',
    differential_diagnoses: [],
    severity: 'Moderate',
    recommended_department: 'General Medicine',
    urgency: 'Routine',
    recommended_actions: ['Consult with physician'],
    risk_factors: ['Unknown'],
    symptoms_analysis: {
      primary_symptom: 'Not specified',
      additional_symptoms: [],
      pain_level: 'Not specified',
      pain_location: 'Not specified',
      impact_on_activities: 'Not specified'
    }
  };
}

function getPainDescription(level: number): string {
  if (level >= 9) return 'Severe, unbearable pain';
  if (level >= 7) return 'Very severe pain';
  if (level >= 5) return 'Moderate to severe pain';
  if (level >= 3) return 'Moderate pain';
  if (level >= 1) return 'Mild pain';
  return 'No pain';
} 