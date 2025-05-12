export interface MedicalSymptom {
  id: string;
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  confidence: number;
  onset: Date;
  duration?: string;
  notes?: string;
}

export interface VitalSigns {
  temperature: number;
  heartRate: number;
  bloodPressure: {
    systolic: number;
    diastolic: number;
  };
  respiratoryRate: number;
  oxygenSaturation: number;
  timestamp: Date;
}

export interface Comorbidity {
  id: string;
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  diagnosisDate: Date;
  isActive: boolean;
  medications?: string[];
}

export interface RiskFactor {
  id: string;
  name: string;
  weight: number;
  category: 'demographic' | 'medical' | 'lifestyle' | 'environmental';
  description: string;
}

export interface RiskAssessment {
  overallRisk: number;
  factors: RiskFactor[];
  confidence: number;
  timestamp: Date;
  explanation: string;
}

export interface TriageDecision {
  acuity: 1 | 2 | 3 | 4 | 5; // 1 being most urgent
  confidence: number;
  explanation: string;
  recommendedActions: string[];
  riskFactors: RiskFactor[];
  timestamp: Date;
} 