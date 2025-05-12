// Data-driven triage rule definition (scaffold)

export type Severity = 'emergent' | 'urgent' | 'semi-urgent' | 'non-urgent';
export type EvidenceLevel = 'A' | 'B' | 'C' | 'D' | 'expert';
export type TriageLevel = 1 | 2 | 3 | 4 | 5;

export interface EvidenceSource {
  citation: string;
  url?: string;
}

export interface ClinicalReviewer {
  name: string;
  credentials: string;
  institution?: string;
}

export interface TimeRange {
  min?: number;
  target: number;
  unit: 'minutes' | 'hours' | 'days';
}

export interface RecommendedAction {
  action: string;
  timeframe?: TimeRange;
  priority?: 'stat' | 'urgent' | 'routine';
  specialty?: string;
}

// --- Condition Types ---
export type RuleCondition =
  | SymptomCondition
  | VitalCondition
  | RiskFactorCondition
  | DemographicCondition
  | TemporalCondition;

export interface SymptomCondition {
  type: 'symptom';
  symptomId: string;
  presence: boolean;
  qualifiers?: Record<string, any>;
  modifiers?: Record<string, any>;
  timeframe?: { value: number; unit: 'minutes' | 'hours' | 'days' };
  weight?: number;
}

export interface VitalCondition {
  type: 'vital';
  vitalId: string;
  comparator: '<' | '<=' | '>' | '>=' | '=' | '!=';
  value: number;
  weight?: number;
}

export interface RiskFactorCondition {
  type: 'riskFactor';
  factor: string;
  presence: boolean;
  weight?: number;
}

export interface DemographicCondition {
  type: 'demographic';
  attribute: string;
  comparator: '<' | '<=' | '>' | '>=' | '=' | '!=';
  value: number | string;
  weight?: number;
}

export interface TemporalCondition {
  type: 'temporal';
  attribute: string;
  comparator: '<' | '<=' | '>' | '>=' | '=' | '!=';
  value: number;
  unit: 'minutes' | 'hours' | 'days';
  weight?: number;
}

export interface CompositeCondition {
  type: 'composite';
  operator: 'AND' | 'OR';
  conditions: (RuleCondition | CompositeCondition)[];
  minMatches?: number;
  weight?: number;
}

export interface TriageRuleDefinition {
  // Core Identifiers
  id: string;
  name: string;
  description: string;

  // Clinical Metadata
  clinicalCategory: string[];
  severity: Severity;
  evidenceLevel: EvidenceLevel;
  evidenceSource: EvidenceSource[];

  // Rule Logic
  condition: RuleCondition | CompositeCondition;
  exceptions?: RuleCondition[];

  // Clinical Outcome
  outcome: {
    triageLevel: TriageLevel;
    recommendedActions: RecommendedAction[];
    timeToProvider: TimeRange;
    followUpInstructions?: string;
  };

  // Operational Metadata
  version: string;
  effectiveDate: Date;
  expirationDate?: Date;
  lastReviewDate: Date;
  reviewers: ClinicalReviewer[];
  weight?: number;
  confidenceThreshold?: number;
} 