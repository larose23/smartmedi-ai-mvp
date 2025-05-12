export type TriageScore = 'High' | 'Medium' | 'Low';

export interface CheckIn {
  id: string;
  patient_id: string;
  created_at: string;
  triage_score: TriageScore;
  suggested_department: string;
  estimated_wait_minutes: number;
  potential_diagnoses: string[];
  recommended_actions: string[];
  risk_factors: string[];
  symptoms: {
    pain_level: number;
    pain_location: string;
    pain_characteristics: string[];
    impact_on_activities: string[];
    medical_history: string[];
    current_symptoms: string[];
  };
}

export interface TriageResponse {
  check_in: CheckIn;
  message: string;
}

export interface MLInferenceResult {
  potential_diagnoses: string[];
  estimated_wait_minutes: number;
  suggested_department: string;
  risk_factors: string[];
  recommended_actions: string[];
} 