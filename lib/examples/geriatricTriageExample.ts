import type { TriageRequest, TriageRuleResult } from '@/types/triage';
import { applyCombinedTriageRules } from '../combinedTriageRules';

/**
 * Example demonstrating the use of geriatric triage rules
 * with different elderly patient cases
 */

// Case 1: 78-year-old with fall on anticoagulation
const fallWithAnticoagulation: TriageRequest = {
  age: 78,
  dateOfBirth: '1946-05-15',
  symptoms: ['fall', 'hit head', 'small laceration', 'dizziness'],
  vitals: {
    temperature: 36.7,
    heartRate: 82,
    respiratoryRate: 18,
    oxygenSaturation: 96,
    systolicBP: 145,
    diastolicBP: 88
  },
  medicalHistory: ['atrial fibrillation', 'hypertension', 'on warfarin']
};

// Case 2: 70-year-old with acute confusion
const acuteConfusion: TriageRequest = {
  age: 70,
  dateOfBirth: '1954-03-20',
  symptoms: ['confusion', 'disoriented', 'sudden onset', 'agitated'],
  vitals: {
    temperature: 37.9,
    heartRate: 92,
    respiratoryRate: 20,
    oxygenSaturation: 97,
    systolicBP: 158,
    diastolicBP: 90
  },
  medicalHistory: ['hypertension', 'diabetes', 'chronic kidney disease']
};

// Case 3: 85-year-old with atypical chest pain
const atypicalChestPain: TriageRequest = {
  age: 85,
  dateOfBirth: '1939-04-05',
  symptoms: ['fatigue', 'weakness', 'mild shortness of breath', 'dizziness'],
  vitals: {
    temperature: 36.9,
    heartRate: 88,
    respiratoryRate: 22,
    oxygenSaturation: 95,
    systolicBP: 136,
    diastolicBP: 82
  },
  medicalHistory: ['coronary artery disease', 'previous MI', 'hypertension', 'hyperlipidemia']
};

// Case 4: 68-year-old with medication adverse effects
const medicationAdverseEffects: TriageRequest = {
  age: 68,
  dateOfBirth: '1956-01-12',
  symptoms: ['dizziness', 'unsteady gait', 'nausea', 'falls', 'started new medication yesterday'],
  vitals: {
    temperature: 36.7,
    heartRate: 72,
    respiratoryRate: 18,
    oxygenSaturation: 97,
    systolicBP: 118,
    diastolicBP: 74
  },
  medicalHistory: ['hypertension', 'osteoarthritis', 'depression', 'insomnia']
};

// Case 5: 82-year-old with acute stroke symptoms
const acuteStrokeSymptoms: TriageRequest = {
  age: 82,
  dateOfBirth: '1942-08-30',
  symptoms: ['sudden left-sided weakness', 'facial droop', 'slurred speech', 'difficulty walking'],
  vitals: {
    temperature: 36.8,
    heartRate: 90,
    respiratoryRate: 20,
    oxygenSaturation: 96,
    systolicBP: 178,
    diastolicBP: 92
  },
  medicalHistory: ['hypertension', 'atrial fibrillation', 'previous TIA']
};

// Function to run examples and log results
export function runGeriatricTriageExamples(): void {
  const cases = [
    { name: "78-year-old with fall on anticoagulation", data: fallWithAnticoagulation },
    { name: "70-year-old with acute confusion", data: acuteConfusion },
    { name: "85-year-old with atypical chest pain", data: atypicalChestPain },
    { name: "68-year-old with medication adverse effects", data: medicationAdverseEffects },
    { name: "82-year-old with acute stroke symptoms", data: acuteStrokeSymptoms }
  ];

  console.log("GERIATRIC TRIAGE EXAMPLES");
  console.log("=========================\n");

  cases.forEach(patientCase => {
    console.log(`CASE: ${patientCase.name}`);
    console.log("-".repeat(patientCase.name.length + 6));
    
    const result = applyCombinedTriageRules(patientCase.data);
    
    console.log(`Triage Score: ${result.triageScore}`);
    console.log(`Priority Level: ${result.priorityLevel}`);
    console.log(`Departments: ${result.suggestedDepartments.map(d => `${d.name} (${d.type})`).join(', ')}`);
    console.log("Explanations:");
    result.explainability.forEach((exp, i) => {
      console.log(`  ${i+1}. ${exp}`);
    });
    console.log("\n");
  });
}

// Uncomment to run the examples:
// runGeriatricTriageExamples(); 