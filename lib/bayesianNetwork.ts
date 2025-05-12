import type { TriageRequest } from '@/types/triage';

// Bayesian network for medical risk stratification
// This implementation uses a simplified approach that can be replaced with
// a more sophisticated Bayesian network in production

type RiskFactorNode = {
  id: string;
  name: string;
  baseRisk: number;
  relatedConditions: string[];
  riskModifiers: { [condition: string]: number };
};

type RiskStratificationResult = {
  overallRisk: number;
  identifiedRiskFactors: Array<{
    factor: string;
    probability: number;
  }>;
  deteriorationProbability: Array<{
    timeFrame: string;
    probability: number;
  }>;
  confidenceScore: number;
  reasoningChain: string[];
};

// Define common risk factors as Bayesian nodes
const riskFactorNodes: RiskFactorNode[] = [
  {
    id: 'cardiac',
    name: 'Cardiac Complications',
    baseRisk: 0.05,
    relatedConditions: ['heart disease', 'hypertension', 'diabetes', 'high cholesterol'],
    riskModifiers: {
      'chest pain': 0.4,
      'shortness of breath': 0.25,
      'dizziness': 0.15,
      'fatigue': 0.1,
      'hypertension': 0.2,
      'diabetes': 0.15,
      'age>65': 0.2,
      'smoking': 0.15
    }
  },
  {
    id: 'respiratory',
    name: 'Respiratory Failure',
    baseRisk: 0.03,
    relatedConditions: ['asthma', 'copd', 'pneumonia', 'bronchitis'],
    riskModifiers: {
      'shortness of breath': 0.35,
      'rapid breathing': 0.3,
      'cough': 0.15,
      'chest pain': 0.15,
      'fever': 0.2,
      'asthma': 0.25,
      'copd': 0.3,
      'age>75': 0.15,
      'smoking': 0.2
    }
  },
  {
    id: 'sepsis',
    name: 'Septic Shock',
    baseRisk: 0.02,
    relatedConditions: ['infection', 'pneumonia', 'urinary tract infection'],
    riskModifiers: {
      'fever': 0.25,
      'rapid heart rate': 0.3,
      'confusion': 0.2,
      'low blood pressure': 0.35,
      'immunocompromised': 0.3,
      'diabetes': 0.15,
      'age>75': 0.2
    }
  },
  {
    id: 'stroke',
    name: 'Stroke',
    baseRisk: 0.03,
    relatedConditions: ['hypertension', 'atrial fibrillation', 'heart disease', 'diabetes'],
    riskModifiers: {
      'sudden confusion': 0.4,
      'difficulty speaking': 0.35,
      'numbness': 0.3,
      'severe headache': 0.25,
      'dizziness': 0.15,
      'hypertension': 0.25,
      'atrial fibrillation': 0.3,
      'age>65': 0.15,
      'diabetes': 0.1
    }
  },
  {
    id: 'diabetic',
    name: 'Diabetic Emergency',
    baseRisk: 0.04,
    relatedConditions: ['diabetes'],
    riskModifiers: {
      'excessive thirst': 0.25,
      'frequent urination': 0.2,
      'confusion': 0.15,
      'rapid breathing': 0.15,
      'fruity breath': 0.4,
      'diabetes': 0.5,
      'nausea': 0.1,
      'fatigue': 0.1
    }
  }
];

/**
 * Calculates risk stratification using Bayesian network approach
 * In production, this would use a more sophisticated Bayesian network implementation
 */
export function calculateRiskStratification(
  request: TriageRequest
): RiskStratificationResult {
  const symptoms = request.symptoms || [];
  const medicalHistory = request.medicalHistory || [];
  const vitalSigns = request.vitalSigns || {};
  const age = request.age || 0;
  
  // Initialize result
  const result: RiskStratificationResult = {
    overallRisk: 0,
    identifiedRiskFactors: [],
    deteriorationProbability: [
      { timeFrame: '1 hour', probability: 0 },
      { timeFrame: '4 hours', probability: 0 },
      { timeFrame: '24 hours', probability: 0 }
    ],
    confidenceScore: 0,
    reasoningChain: []
  };
  
  // Process each risk factor node
  riskFactorNodes.forEach(node => {
    let nodeProbability = node.baseRisk;
    const relevantEvidence: string[] = [];
    
    // Calculate conditional probabilities based on symptoms
    symptoms.forEach(symptom => {
      const lowerSymptom = symptom.toLowerCase();
      
      // Check each risk modifier
      Object.keys(node.riskModifiers).forEach(condition => {
        if (lowerSymptom.includes(condition.toLowerCase())) {
          nodeProbability += node.baseRisk * node.riskModifiers[condition];
          relevantEvidence.push(`Symptom: ${symptom}`);
        }
      });
    });
    
    // Calculate conditional probabilities based on medical history
    medicalHistory.forEach(condition => {
      const lowerCondition = condition.toLowerCase();
      
      // Check if this condition is relevant to the node
      if (node.relatedConditions.some(rc => lowerCondition.includes(rc.toLowerCase()))) {
        nodeProbability += node.baseRisk * 0.3; // Generic boost for related condition
        relevantEvidence.push(`History: ${condition}`);
      }
      
      // Check each risk modifier
      Object.keys(node.riskModifiers).forEach(modifier => {
        if (lowerCondition.includes(modifier.toLowerCase())) {
          nodeProbability += node.baseRisk * node.riskModifiers[modifier];
          relevantEvidence.push(`History: ${condition}`);
        }
      });
    });
    
    // Age-based risk factors
    if (age > 75 && node.riskModifiers['age>75']) {
      nodeProbability += node.baseRisk * node.riskModifiers['age>75'];
      relevantEvidence.push(`Age > 75`);
    } else if (age > 65 && node.riskModifiers['age>65']) {
      nodeProbability += node.baseRisk * node.riskModifiers['age>65'];
      relevantEvidence.push(`Age > 65`);
    }
    
    // Vital sign based risk factors
    if (vitalSigns.heartRate && vitalSigns.heartRate > 100 && node.riskModifiers['rapid heart rate']) {
      nodeProbability += node.baseRisk * node.riskModifiers['rapid heart rate'];
      relevantEvidence.push(`Elevated Heart Rate: ${vitalSigns.heartRate}`);
    }
    
    if (vitalSigns.respiratoryRate && vitalSigns.respiratoryRate > 20 && node.riskModifiers['rapid breathing']) {
      nodeProbability += node.baseRisk * node.riskModifiers['rapid breathing'];
      relevantEvidence.push(`Elevated Respiratory Rate: ${vitalSigns.respiratoryRate}`);
    }
    
    if (vitalSigns.systolicBP && vitalSigns.systolicBP < 90 && node.riskModifiers['low blood pressure']) {
      nodeProbability += node.baseRisk * node.riskModifiers['low blood pressure'];
      relevantEvidence.push(`Low Blood Pressure: ${vitalSigns.systolicBP}/${vitalSigns.diastolicBP}`);
    }
    
    // Cap probability at 0.95
    nodeProbability = Math.min(nodeProbability, 0.95);
    
    // Only include significant risk factors
    if (nodeProbability > 0.1) {
      result.identifiedRiskFactors.push({
        factor: node.name,
        probability: parseFloat(nodeProbability.toFixed(2))
      });
      
      // Add reasoning chain if there's evidence
      if (relevantEvidence.length > 0) {
        result.reasoningChain.push(
          `${node.name} risk (${(nodeProbability * 100).toFixed(0)}%) based on: ${relevantEvidence.join(', ')}`
        );
      }
    }
  });
  
  // Calculate overall risk (weighted average of top 3 risks)
  const sortedRisks = [...result.identifiedRiskFactors].sort((a, b) => b.probability - a.probability);
  const topRisks = sortedRisks.slice(0, 3);
  
  if (topRisks.length > 0) {
    const riskSum = topRisks.reduce((sum, risk) => sum + risk.probability, 0);
    result.overallRisk = parseFloat((riskSum / topRisks.length).toFixed(2));
  }
  
  // Calculate deterioration probability
  result.deteriorationProbability = [
    { timeFrame: '1 hour', probability: parseFloat((result.overallRisk * 0.5).toFixed(2)) },
    { timeFrame: '4 hours', probability: parseFloat((result.overallRisk * 0.7).toFixed(2)) },
    { timeFrame: '24 hours', probability: parseFloat((result.overallRisk * 0.9).toFixed(2)) }
  ];
  
  // Calculate confidence score based on available evidence
  const evidenceCount = result.reasoningChain.length;
  result.confidenceScore = Math.min(90, 50 + (evidenceCount * 10));
  
  return result;
} 