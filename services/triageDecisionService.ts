import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type SeverityLevel = 'critical' | 'severe' | 'moderate' | 'mild' | 'low';

export interface TriageDecision {
  id: string;
  case_id: string;
  severity: SeverityLevel;
  confidence: number;
  explanation: string;
  timestamp: string;
  updated_at: string;
}

export interface RecommendedAction {
  id: string;
  decision_id: string;
  action: string;
  priority: number;
  reasoning: string;
  time_sensitivity: 'immediate' | 'urgent' | 'routine';
  required_resources: string[];
  estimated_duration: number;
}

export interface PotentialDiagnosis {
  id: string;
  decision_id: string;
  diagnosis: string;
  probability: number;
  confidence: number;
  icd10_codes: string[];
  references: {
    title: string;
    url: string;
    type: 'clinical_guideline' | 'research_paper' | 'case_study';
  }[];
  symptoms: {
    symptom: string;
    relevance: number;
  }[];
}

export interface DepartmentSuggestion {
  id: string;
  decision_id: string;
  department: string;
  priority: number;
  reasoning: string;
  required_specialists: string[];
  estimated_wait_time: number;
  capacity_status: 'available' | 'limited' | 'full';
}

export class TriageDecisionService {
  private static instance: TriageDecisionService;

  private constructor() {}

  static getInstance(): TriageDecisionService {
    if (!TriageDecisionService.instance) {
      TriageDecisionService.instance = new TriageDecisionService();
    }
    return TriageDecisionService.instance;
  }

  async fetchTriageDecision(caseId: string): Promise<TriageDecision> {
    try {
      const { data, error } = await supabase
        .from('triage_decisions')
        .select('*')
        .eq('case_id', caseId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching triage decision:', error);
      throw error;
    }
  }

  async fetchRecommendedActions(decisionId: string): Promise<RecommendedAction[]> {
    try {
      const { data, error } = await supabase
        .from('recommended_actions')
        .select('*')
        .eq('decision_id', decisionId)
        .order('priority', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching recommended actions:', error);
      throw error;
    }
  }

  async fetchPotentialDiagnoses(decisionId: string): Promise<PotentialDiagnosis[]> {
    try {
      const { data, error } = await supabase
        .from('potential_diagnoses')
        .select('*')
        .eq('decision_id', decisionId)
        .order('probability', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching potential diagnoses:', error);
      throw error;
    }
  }

  async fetchDepartmentSuggestions(decisionId: string): Promise<DepartmentSuggestion[]> {
    try {
      const { data, error } = await supabase
        .from('department_suggestions')
        .select('*')
        .eq('decision_id', decisionId)
        .order('priority', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching department suggestions:', error);
      throw error;
    }
  }

  getSeverityColor(severity: SeverityLevel): string {
    switch (severity) {
      case 'critical':
        return '#d32f2f';
      case 'severe':
        return '#f57c00';
      case 'moderate':
        return '#ffc107';
      case 'mild':
        return '#4caf50';
      case 'low':
        return '#2196f3';
      default:
        return '#757575';
    }
  }

  getTimeSensitivityColor(sensitivity: RecommendedAction['time_sensitivity']): string {
    switch (sensitivity) {
      case 'immediate':
        return '#d32f2f';
      case 'urgent':
        return '#f57c00';
      case 'routine':
        return '#4caf50';
      default:
        return '#757575';
    }
  }

  getCapacityStatusColor(status: DepartmentSuggestion['capacity_status']): string {
    switch (status) {
      case 'available':
        return '#4caf50';
      case 'limited':
        return '#ffc107';
      case 'full':
        return '#d32f2f';
      default:
        return '#757575';
    }
  }
} 