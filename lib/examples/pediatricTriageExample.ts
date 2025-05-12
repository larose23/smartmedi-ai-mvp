import type { TriageRequest, TriageRuleResult } from '@/types/triage';
import { applyCombinedTriageRules } from '../combinedTriageRules';

/**
 * Example demonstrating the use of pediatric triage rules
 * with different pediatric patient cases
 */

// Case 1: 2-month-old infant with fever
const infantWithFever: TriageRequest = {
  age: 0.17, // 2 months in years
  dateOfBirth: '2023-12-01', // Assuming current date is February 2024
  symptoms: ['fever', 'fussy', 'poor feeding'],
  vitals: {
    temperature: 38.5,
    heartRate: 160,
    respiratoryRate: 45,
    oxygenSaturation: 97,
    systolicBP: 85,
    diastolicBP: 55
  },
  medicalHistory: []
};

// Case 2: 5-year-old with asthma exacerbation
const asthmaChild: TriageRequest = {
  age: 5,
  dateOfBirth: '2019-02-10',
  symptoms: ['wheezing', 'cough', 'shortness of breath'],
  vitals: {
    temperature: 37.2,
    heartRate: 110,
    respiratoryRate: 32,
    oxygenSaturation: 94,
    systolicBP: 100,
    diastolicBP: 65
  },
  medicalHistory: ['asthma', 'allergic rhinitis']
};

// Case 3: 10-year-old with suspected appendicitis
const appendicitisChild: TriageRequest = {
  age: 10,
  dateOfBirth: '2014-02-15',
  symptoms: ['abdominal pain', 'right lower quadrant pain', 'fever', 'nausea', 'vomiting'],
  vitals: {
    temperature: 38.2,
    heartRate: 105,
    respiratoryRate: 22,
    oxygenSaturation: 98,
    systolicBP: 110,
    diastolicBP: 70
  },
  medicalHistory: []
};

// Case 4: 15-year-old with type 1 diabetes and possible DKA
const diabeticTeenWithDKA: TriageRequest = {
  age: 15,
  dateOfBirth: '2009-02-12',
  symptoms: ['vomiting', 'abdominal pain', 'excessive thirst', 'frequent urination', 'fatigue'],
  vitals: {
    temperature: 37.0,
    heartRate: 115,
    respiratoryRate: 24,
    oxygenSaturation: 98,
    systolicBP: 105,
    diastolicBP: 65,
    glucose: 320
  },
  medicalHistory: ['type 1 diabetes']
};

// Case 5: 3-year-old with febrile seizure
const febrileSeizureChild: TriageRequest = {
  age: 3,
  dateOfBirth: '2021-02-20',
  symptoms: ['seizure', 'fever', 'post-ictal', 'drowsy'],
  vitals: {
    temperature: 39.2,
    heartRate: 130,
    respiratoryRate: 28,
    oxygenSaturation: 96,
    systolicBP: 95,
    diastolicBP: 60
  },
  medicalHistory: []
};

// Function to run examples and log results
export function runPediatricTriageExamples(): void {
  const cases = [
    { name: "2-month-old with fever", data: infantWithFever },
    { name: "5-year-old with asthma exacerbation", data: asthmaChild },
    { name: "10-year-old with suspected appendicitis", data: appendicitisChild },
    { name: "15-year-old with type 1 diabetes and possible DKA", data: diabeticTeenWithDKA },
    { name: "3-year-old with febrile seizure", data: febrileSeizureChild }
  ];

  console.log("PEDIATRIC TRIAGE EXAMPLES");
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
// runPediatricTriageExamples(); 