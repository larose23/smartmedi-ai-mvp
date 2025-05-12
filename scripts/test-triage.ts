import { applyEnhancedTriageRules } from '../lib/enhancedTriageRules';
import { analyzeSymptomsByTransformer } from '../lib/transformerModel';
import { calculateRiskStratification } from '../lib/bayesianNetwork';
import { TriageRequest, TriageResponse } from '../types/triage';
import { applyLearningAdjustments } from '../lib/reinforcementLearning';

// Helper function to calculate estimated wait time based on triage score
function calculateEstimatedWaitTime(triageScore: string): number {
  switch (triageScore) {
    case 'Critical':
      return 0; // Immediate
    case 'High':
      return 15; // 15 minutes
    case 'Medium':
      return 45; // 45 minutes 
    case 'Low':
      return 90; // 90 minutes
    case 'Non-Urgent':
      return 120; // 2 hours
    default:
      return 60; // Default 1 hour
  }
}

// Helper function to generate potential diagnoses
function generatePotentialDiagnoses(
  request: TriageRequest, 
  symptomAnalysis: any
): string[] {
  const diagnoses: string[] = [];
  const symptoms = request.symptoms || [];
  const medicalHistory = request.medicalHistory || [];
  
  // Simple diagnosis generation for testing
  if (symptoms.includes('chest pain')) {
    diagnoses.push('Possible Angina');
    diagnoses.push('Myocardial Infarction');
  }
  
  if (symptoms.includes('shortness of breath')) {
    diagnoses.push('Asthma Exacerbation');
    diagnoses.push('Pneumonia');
  }
  
  if (symptoms.includes('headache')) {
    diagnoses.push('Migraine');
    diagnoses.push('Tension Headache');
  }
  
  // If no diagnoses found, add a generic one
  if (diagnoses.length === 0) {
    diagnoses.push('Undetermined - Further Assessment Required');
  }
  
  return diagnoses;
}

// Helper function to generate recommended actions
function generateRecommendedActions(
  triageScore: string, 
  request: TriageRequest,
  riskAnalysis: any
): string[] {
  const actions: string[] = [];
  const symptoms = request.symptoms || [];
  
  // Simple action generation for testing
  if (triageScore === 'Critical' || triageScore === 'High') {
    actions.push('Immediate Clinical Assessment');
    actions.push('Vital Signs Monitoring');
  }
  
  if (symptoms.includes('chest pain')) {
    actions.push('ECG');
    actions.push('Cardiac Enzymes');
  }
  
  if (symptoms.includes('shortness of breath')) {
    actions.push('Oxygen Saturation Monitoring');
    actions.push('Consider Chest X-ray');
  }
  
  if (symptoms.includes('fever')) {
    actions.push('Temperature Monitoring');
  }
  
  return [...new Set(actions)]; // Remove duplicates
}

// Test cases to verify triage system
const testCases: TriageRequest[] = [
  // Test case 1: Critical case - chest pain
  {
    symptoms: ['chest pain', 'shortness of breath'],
    medicalHistory: ['hypertension', 'diabetes'],
    age: 65,
    vitalSigns: {
      heartRate: 110,
      respiratoryRate: 24,
      temperature: 37.2,
      oxygenSaturation: 94,
      systolicBP: 160,
      diastolicBP: 95
    }
  },
  
  // Test case 2: Pediatric case - high fever
  {
    symptoms: ['fever', 'cough', 'runny nose'],
    medicalHistory: ['asthma'],
    age: 4,
    vitalSigns: {
      heartRate: 120,
      respiratoryRate: 28,
      temperature: 39.5,
      oxygenSaturation: 97
    }
  },
  
  // Test case 3: Geriatric case - fall
  {
    symptoms: ['fell', 'hip pain', 'dizziness'],
    medicalHistory: ['osteoporosis', 'hypertension', 'atrial fibrillation'],
    age: 82,
    vitalSigns: {
      heartRate: 85,
      respiratoryRate: 18,
      temperature: 36.8,
      oxygenSaturation: 95,
      systolicBP: 110,
      diastolicBP: 70
    }
  },
  
  // Test case 4: Low priority case
  {
    symptoms: ['mild sore throat', 'mild cough'],
    medicalHistory: [],
    age: 28,
    vitalSigns: {
      heartRate: 72,
      respiratoryRate: 16,
      temperature: 37.0,
      oxygenSaturation: 99
    }
  }
];

// Run test on each case
async function runTests() {
  console.log('===== TRIAGE SYSTEM TEST =====\n');
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n----- Test Case ${i + 1} -----`);
    console.log('Patient:');
    console.log(`- Age: ${testCase.age}`);
    console.log(`- Symptoms: ${testCase.symptoms.join(', ')}`);
    console.log(`- Medical History: ${testCase.medicalHistory.join(', ') || 'None'}`);
    console.log('- Vital Signs:');
    const vitals = testCase.vitalSigns || {};
    Object.entries(vitals).forEach(([key, value]) => {
      console.log(`  * ${key}: ${value}`);
    });
    
    try {
      // 1. Apply rule-based triage
      console.log('\nApplying rule-based triage...');
      const ruleBasedTriage = applyEnhancedTriageRules(testCase);
      console.log(`- Triage Score: ${ruleBasedTriage.triageScore}`);
      console.log(`- Priority Level: ${ruleBasedTriage.priorityLevel}`);
      console.log(`- Suggested Department: ${ruleBasedTriage.suggestedDepartments[0]?.name || 'None'}`);
      
      // 2. Apply transformer model analysis
      console.log('\nApplying transformer model analysis...');
      const symptomAnalysis = await analyzeSymptomsByTransformer(testCase);
      console.log(`- Confidence Score: ${symptomAnalysis.confidenceScore}%`);
      console.log('- Symptom Severity:');
      Object.entries(symptomAnalysis.symptomSeverity).forEach(([symptom, severity]) => {
        console.log(`  * ${symptom}: ${severity}`);
      });
      console.log(`- Needs More Info: ${symptomAnalysis.needsMoreInfo ? 'Yes' : 'No'}`);
      
      // 3. Apply Bayesian risk analysis
      console.log('\nApplying Bayesian risk analysis...');
      const riskAnalysis = calculateRiskStratification(testCase);
      console.log(`- Overall Risk: ${riskAnalysis.overallRisk}`);
      console.log('- Identified Risk Factors:');
      riskAnalysis.identifiedRiskFactors.forEach(rf => {
        console.log(`  * ${rf.factor}: ${rf.probability * 100}%`);
      });
      console.log('- Deterioration Probability:');
      riskAnalysis.deteriorationProbability.forEach(dp => {
        console.log(`  * ${dp.timeFrame}: ${dp.probability * 100}%`);
      });
      
      // 4. Compose complete triage response
      console.log('\nGenerating comprehensive triage response...');
      let response: TriageResponse = {
        triageScore: ruleBasedTriage.triageScore,
        priorityLevel: ruleBasedTriage.priorityLevel,
        confidenceScore: Math.round(symptomAnalysis.confidenceScore), 
        suggestedDepartments: ruleBasedTriage.suggestedDepartments,
        estimatedWaitMinutes: calculateEstimatedWaitTime(ruleBasedTriage.triageScore),
        potentialDiagnoses: generatePotentialDiagnoses(testCase, symptomAnalysis),
        recommendedActions: generateRecommendedActions(ruleBasedTriage.triageScore, testCase, riskAnalysis),
        riskFactors: riskAnalysis.identifiedRiskFactors.map(rf => rf.factor),
        deteriorationProbability: riskAnalysis.deteriorationProbability,
        explainabilityData: {
          keyFactors: [...ruleBasedTriage.explainability, ...riskAnalysis.reasoningChain],
          modelVersion: 'enhanced-rules-v1.1-with-bayesian-risk',
          reasoningChain: ruleBasedTriage.explainability,
          symptomSeverity: symptomAnalysis.symptomSeverity,
          symptomRelations: symptomAnalysis.symptomRelations,
          needsMoreInfo: symptomAnalysis.needsMoreInfo,
          suggestedFollowUpQuestions: symptomAnalysis.suggestedFollowUpQuestions
        },
      };
      
      // 5. Apply reinforcement learning adjustments
      console.log('\nApplying reinforcement learning adjustments...');
      response = applyLearningAdjustments(response, testCase.symptoms);
      
      // 6. Display final results
      console.log('\nFINAL TRIAGE RESPONSE:');
      console.log(`- Triage Score: ${response.triageScore}`);
      console.log(`- Priority Level: ${response.priorityLevel}`);
      console.log(`- Confidence: ${response.confidenceScore}%`);
      console.log(`- Department: ${response.suggestedDepartments[0]?.name || 'None'}`);
      console.log(`- Estimated Wait: ${response.estimatedWaitMinutes} minutes`);
      console.log(`- Potential Diagnoses: ${response.potentialDiagnoses.join(', ')}`);
      console.log(`- Recommended Actions: ${response.recommendedActions.join(', ')}`);
      console.log(`- Risk Factors: ${response.riskFactors.join(', ')}`);
      
      console.log('\n------------------------\n');
    } catch (error) {
      console.error(`Error processing test case ${i + 1}:`, error);
    }
  }
  
  console.log('===== TEST COMPLETE =====');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests()
    .then(() => {
      console.log('\nAll tests completed.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error during test execution:', error);
      process.exit(1);
    });
}

export default runTests; 