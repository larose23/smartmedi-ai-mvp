import type { TriageRequest } from '@/types/triage';

// Transformer model symptom analysis
// This implementation uses a simplified approach that can be replaced with
// actual transformer model API calls in production

type SymptomAnalysisResult = {
  symptomSeverity: { [key: string]: number };
  symptomRelations: { [key: string]: string[] };
  confidenceScore: number;
  needsMoreInfo: boolean;
  suggestedFollowUpQuestions?: string[];
};

/**
 * Analyzes symptoms using NLP techniques that mimic transformer model behavior
 * In production, this would call an actual transformer API
 */
export async function analyzeSymptomsByTransformer(
  request: TriageRequest
): Promise<SymptomAnalysisResult> {
  // Extract symptoms from request
  const symptoms = request.symptoms || [];
  const medicalHistory = request.medicalHistory || [];
  const vitalSigns = request.vitalSigns || {};
  
  // Initialize result
  const result: SymptomAnalysisResult = {
    symptomSeverity: {},
    symptomRelations: {},
    confidenceScore: 85,
    needsMoreInfo: false
  };
  
  // Symptom severity analysis
  // In production, this would use actual NLP analysis
  symptoms.forEach(symptom => {
    const lowercaseSymptom = symptom.toLowerCase();
    
    // Critical symptoms
    if (lowercaseSymptom.includes('chest pain') || 
        lowercaseSymptom.includes('shortness of breath') ||
        lowercaseSymptom.includes('difficulty breathing')) {
      result.symptomSeverity[symptom] = 0.9;
    }
    // Serious symptoms
    else if (lowercaseSymptom.includes('fever') || 
             lowercaseSymptom.includes('severe') ||
             lowercaseSymptom.includes('sudden')) {
      result.symptomSeverity[symptom] = 0.7;
    }
    // Moderate symptoms
    else if (lowercaseSymptom.includes('pain') || 
             lowercaseSymptom.includes('vomiting') ||
             lowercaseSymptom.includes('dizziness')) {
      result.symptomSeverity[symptom] = 0.5;
    }
    // Mild symptoms
    else {
      result.symptomSeverity[symptom] = 0.3;
    }
  });
  
  // Symptom relation analysis
  // Identify related symptoms that might indicate specific conditions
  const respiratorySymptoms = symptoms.filter(s => 
    s.toLowerCase().includes('breath') || 
    s.toLowerCase().includes('cough') || 
    s.toLowerCase().includes('chest')
  );
  
  const gastrointestinalSymptoms = symptoms.filter(s => 
    s.toLowerCase().includes('nausea') || 
    s.toLowerCase().includes('vomit') || 
    s.toLowerCase().includes('diarrhea') ||
    s.toLowerCase().includes('stomach') ||
    s.toLowerCase().includes('abdomen')
  );
  
  const neurologicalSymptoms = symptoms.filter(s => 
    s.toLowerCase().includes('headache') || 
    s.toLowerCase().includes('dizz') || 
    s.toLowerCase().includes('numb') ||
    s.toLowerCase().includes('vision') ||
    s.toLowerCase().includes('conscious')
  );
  
  // Add related symptom groups
  if (respiratorySymptoms.length > 0) {
    result.symptomRelations['respiratory'] = respiratorySymptoms;
  }
  
  if (gastrointestinalSymptoms.length > 0) {
    result.symptomRelations['gastrointestinal'] = gastrointestinalSymptoms;
  }
  
  if (neurologicalSymptoms.length > 0) {
    result.symptomRelations['neurological'] = neurologicalSymptoms;
  }
  
  // Determine if we need more information based on symptoms
  const hasVagueSymptoms = symptoms.some(s => 
    s.toLowerCase().includes('not feeling well') ||
    s.toLowerCase().includes('unwell') ||
    s.toLowerCase().includes('feeling bad')
  );
  
  const hasIncompleteInfo = Object.keys(result.symptomSeverity).length < 2 ||
    (Object.keys(result.symptomRelations).length === 0 && symptoms.length > 1);
  
  result.needsMoreInfo = hasVagueSymptoms || hasIncompleteInfo;
  
  // If we need more info, suggest follow-up questions
  if (result.needsMoreInfo) {
    result.suggestedFollowUpQuestions = generateFollowUpQuestions(symptoms, medicalHistory);
    result.confidenceScore = 65; // Lower confidence if we need more information
  }
  
  return result;
}

/**
 * Generates contextual follow-up questions based on provided symptoms
 */
function generateFollowUpQuestions(symptoms: string[], medicalHistory: string[]): string[] {
  const questions: string[] = [];
  
  // Basic symptom clarification questions
  if (symptoms.some(s => s.toLowerCase().includes('pain'))) {
    questions.push('On a scale of 1-10, how would you rate your pain?');
    questions.push('Where exactly is the pain located?');
    questions.push('Is the pain constant or does it come and go?');
  }
  
  if (symptoms.some(s => s.toLowerCase().includes('breath'))) {
    questions.push('When did the breathing difficulty start?');
    questions.push('Does any activity make your breathing worse?');
  }
  
  // Medical history related questions
  if (medicalHistory.some(h => h.toLowerCase().includes('heart'))) {
    questions.push('Have you had similar cardiac symptoms before?');
    questions.push('Are you taking all your prescribed heart medications?');
  }
  
  if (medicalHistory.some(h => h.toLowerCase().includes('diabet'))) {
    questions.push('What was your last blood sugar reading?');
    questions.push('Have you taken your insulin/medication today?');
  }
  
  // General follow-up questions if array is still empty
  if (questions.length === 0) {
    questions.push('When did your symptoms first begin?');
    questions.push('Have you had any treatments or taken any medications for these symptoms?');
    questions.push('Do any activities make your symptoms better or worse?');
  }
  
  return questions;
} 