// Triage API Request
export interface TriageRequest {
  patientId?: string;
  fullName?: string;
  dateOfBirth?: string; // ISO date string
  age?: number; // Derived or provided
  gender?: 'Male' | 'Female' | 'Other' | 'Unknown';
  contactInfo?: string;
  symptoms: string[];
  onset?: string; // ISO date string
  onsetTime?: string; // For enhanced rules
  painScore?: number;
  flags?: string[]; // e.g., ['airway_compromise', 'shock']
  mechanisms?: string[]; // e.g., ['fall', 'motor_vehicle_collision']
  checkInTime?: string;
  systemLoad?: number; // 0-1 scale
  medicalHistory?: string[];
  medications?: string[];
  allergies?: string[];
  vitalSigns?: {
    temperature?: number;
    heartRate?: number;
    bloodPressure?: string;
    systolicBP?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    gcs?: number;
    [key: string]: any;
  };
  vitals?: {
    temperature?: number;
    heartRate?: number;
    bloodPressure?: string;
    systolicBP?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    gcs?: number;
    [key: string]: any;
  };
  labResults?: {
    wbc?: number;
    lactate?: number;
    creatinine?: number;
    baselineCreatinine?: number;
    [key: string]: any;
  };
  language?: string;
  insuranceCardImageUrl?: string;
  idCardImageUrl?: string;
}

// Triage API Response Types
export type TriageScore = 'Critical' | 'High' | 'Medium' | 'Low' | 'Non-Urgent';

export type PotentialDiagnosis = string;
export type RecommendedAction = string;
export type RiskFactor = string;

export interface DeteriorationProbability {
  timeFrame: string;
  probability: number;
}

export interface SuggestedDepartment {
  name: string;
  type: 'primary' | 'secondary';
}

export interface ExplainabilityData {
  keyFactors: string[];
  modelVersion: string;
  reasoningChain: string[];
  // New fields for transformer model
  symptomSeverity?: {[symptom: string]: number};
  symptomRelations?: {[category: string]: string[]};
  needsMoreInfo?: boolean;
  suggestedFollowUpQuestions?: string[];
}

export interface TriageResponse {
  triageScore: TriageScore;
  priorityLevel: number; // 1-5
  confidenceScore: number; // 0-100
  suggestedDepartments: SuggestedDepartment[];
  estimatedWaitMinutes: number;
  potentialDiagnoses: PotentialDiagnosis[];
  recommendedActions: RecommendedAction[];
  riskFactors: RiskFactor[];
  deteriorationProbability: DeteriorationProbability[];
  explainabilityData: ExplainabilityData;
}

export interface CheckIn {
  id: string;
  patient_id?: string;
  full_name: string;
  date_of_birth: string;
  contact_information: string;
  contact_info?: string; // For backward compatibility
  primary_symptom: string;
  additional_symptoms: string | string[];
  triage_score?: TriageScore;
  department?: string;
  suggested_department?: string;
  estimated_wait_minutes?: number;
  potential_diagnoses?: string[];
  recommended_actions?: string[];
  risk_factors?: string[];
  symptoms: {
    pain_level: number;
    pain_location: string;
    impact_on_activities: string | string[];
    medical_history: string | string[];
    current_symptoms: string | string[];
    pain_characteristics?: string[];
  };
  age?: number;
  gender?: string;
  weight?: number;
  height?: number;
  timestamp?: string;
  created_at?: string;
  check_in_time?: string;
  status: 'pending' | 'in_progress' | 'completed';
  staff_notes?: string;
}

export interface MLInferenceResult {
  potential_diagnoses: string[];
  estimated_wait_minutes: number;
  suggested_department: string;
  risk_factors: string[];
  recommended_actions: string[];
}

export interface TriageCase {
  id: string;
  patientName: string;
  age: number;
  ageGroup: 'pediatric' | 'adult' | 'geriatric';
  department: 'emergency' | 'urgent_care' | 'primary_care';
  severity: 'critical' | 'urgent' | 'moderate' | 'stable';
  symptoms: string;
  waitTime: number;
  isEscalated: boolean;
  seenByStaff: boolean;
  createdAt: string;
  updatedAt: string;
  staffNotes?: string;
  overrideReason?: string;
  goldStandardSeverity?: 'critical' | 'urgent' | 'moderate' | 'stable';
}

export interface TriageAnalytics {
  id: string;
  timestamp: string;
  avgTriageTime: number;
  accuracyRate: number;
  throughput: number;
  totalCases: number;
  criticalCases: number;
  urgentCases: number;
  moderateCases: number;
  stableCases: number;
}

export interface TriageAuditLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  status: 'success' | 'warning' | 'error';
  caseId?: string;
  staffId?: string;
  previousStatus?: string;
  newStatus?: string;
} 