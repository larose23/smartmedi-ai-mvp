import { VitalSigns, MedicalSymptom, TriageDecision } from '@/types/medical';

interface ClinicalRule {
  id: string;
  name: string;
  conditions: RuleCondition[];
  actions: string[];
  priority: number;
  source: string;
  lastUpdated: Date;
}

interface RuleCondition {
  type: 'vital' | 'symptom' | 'composite';
  field: string;
  operator: 'gt' | 'lt' | 'eq' | 'between' | 'contains';
  value: any;
  threshold?: number;
}

export class ClinicalGuidelinesService {
  private rules: ClinicalRule[] = [];

  constructor() {
    this.initializeGuidelines();
  }

  private initializeGuidelines() {
    // NEWS2 (National Early Warning Score 2) based rules
    this.rules.push({
      id: 'NEWS2_HR',
      name: 'Heart Rate Assessment',
      conditions: [
        {
          type: 'vital',
          field: 'heartRate',
          operator: 'between',
          value: [51, 90],
          threshold: 0
        }
      ],
      actions: ['Monitor heart rate', 'Document baseline'],
      priority: 1,
      source: 'NEWS2 Guidelines',
      lastUpdated: new Date('2023-01-01')
    });

    // Add more clinical rules...
  }

  async validateTriageDecision(
    vitals: VitalSigns,
    symptoms: MedicalSymptom[],
    decision: TriageDecision
  ): Promise<{
    isValid: boolean;
    warnings: string[];
    recommendations: string[];
    evidence: string[];
  }> {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    const evidence: string[] = [];

    // Validate against clinical rules
    for (const rule of this.rules) {
      const validation = this.validateRule(rule, vitals, symptoms);
      if (!validation.isValid) {
        warnings.push(validation.warning);
        recommendations.push(...validation.recommendations);
        evidence.push(validation.evidence);
      }
    }

    // Validate acuity level
    const acuityValidation = this.validateAcuityLevel(decision.acuity, vitals, symptoms);
    if (!acuityValidation.isValid) {
      warnings.push(acuityValidation.warning);
      recommendations.push(...acuityValidation.recommendations);
    }

    return {
      isValid: warnings.length === 0,
      warnings,
      recommendations,
      evidence
    };
  }

  private validateRule(
    rule: ClinicalRule,
    vitals: VitalSigns,
    symptoms: MedicalSymptom[]
  ): {
    isValid: boolean;
    warning: string;
    recommendations: string[];
    evidence: string;
  } {
    const conditions = rule.conditions.map(condition => 
      this.evaluateCondition(condition, vitals, symptoms)
    );

    const isValid = conditions.every(c => c.isValid);
    const failedConditions = conditions.filter(c => !c.isValid);

    return {
      isValid,
      warning: isValid ? '' : `Rule ${rule.name} validation failed`,
      recommendations: isValid ? [] : rule.actions,
      evidence: isValid ? '' : `Based on ${rule.source} (Updated: ${rule.lastUpdated.toISOString()})`
    };
  }

  private evaluateCondition(
    condition: RuleCondition,
    vitals: VitalSigns,
    symptoms: MedicalSymptom[]
  ): { isValid: boolean; value: any } {
    switch (condition.type) {
      case 'vital':
        return this.evaluateVitalCondition(condition, vitals);
      case 'symptom':
        return this.evaluateSymptomCondition(condition, symptoms);
      case 'composite':
        return this.evaluateCompositeCondition(condition, vitals, symptoms);
      default:
        return { isValid: true, value: null };
    }
  }

  private evaluateVitalCondition(
    condition: RuleCondition,
    vitals: VitalSigns
  ): { isValid: boolean; value: any } {
    const value = vitals[condition.field as keyof VitalSigns];
    
    switch (condition.operator) {
      case 'gt':
        return { isValid: value > condition.value, value };
      case 'lt':
        return { isValid: value < condition.value, value };
      case 'eq':
        return { isValid: value === condition.value, value };
      case 'between':
        const [min, max] = condition.value;
        return { isValid: value >= min && value <= max, value };
      default:
        return { isValid: true, value };
    }
  }

  private evaluateSymptomCondition(
    condition: RuleCondition,
    symptoms: MedicalSymptom[]
  ): { isValid: boolean; value: any } {
    const matchingSymptoms = symptoms.filter(s => s.name === condition.field);
    
    switch (condition.operator) {
      case 'contains':
        return { isValid: matchingSymptoms.length > 0, value: matchingSymptoms };
      default:
        return { isValid: true, value: matchingSymptoms };
    }
  }

  private evaluateCompositeCondition(
    condition: RuleCondition,
    vitals: VitalSigns,
    symptoms: MedicalSymptom[]
  ): { isValid: boolean; value: any } {
    // Implement composite condition evaluation logic
    return { isValid: true, value: null };
  }

  private validateAcuityLevel(
    acuity: number,
    vitals: VitalSigns,
    symptoms: MedicalSymptom[]
  ): {
    isValid: boolean;
    warning: string;
    recommendations: string[];
  } {
    const criticalVitals = this.checkCriticalVitals(vitals);
    const severeSymptoms = symptoms.filter(s => s.severity === 'severe');

    if (acuity > 3 && (criticalVitals || severeSymptoms.length > 0)) {
      return {
        isValid: false,
        warning: 'Acuity level may be too low for patient condition',
        recommendations: [
          'Reassess patient condition',
          'Consider upgrading acuity level',
          'Review vital signs trends'
        ]
      };
    }

    return {
      isValid: true,
      warning: '',
      recommendations: []
    };
  }

  private checkCriticalVitals(vitals: VitalSigns): boolean {
    return (
      vitals.heartRate > 150 ||
      vitals.heartRate < 40 ||
      vitals.bloodPressure.systolic > 180 ||
      vitals.bloodPressure.systolic < 90 ||
      vitals.respiratoryRate > 30 ||
      vitals.respiratoryRate < 8 ||
      vitals.oxygenSaturation < 90 ||
      vitals.temperature > 39 ||
      vitals.temperature < 35
    );
  }
} 