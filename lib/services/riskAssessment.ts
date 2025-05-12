import { hipaaAuditLogger, PHICategory } from '../security/hipaa/audit';
import { MedicalHistory } from './medicalHistory';

export interface RiskFactor {
  id: string;
  name: string;
  category: 'medical' | 'social' | 'environmental' | 'genetic';
  severity: 'low' | 'medium' | 'high';
  confidence: number; // 0-1
  evidence: {
    source: string;
    strength: 'weak' | 'moderate' | 'strong';
    description: string;
  }[];
  impact: {
    mortality?: number; // 0-1
    morbidity?: number; // 0-1
    qualityOfLife?: number; // 0-1
  };
}

export interface RiskAssessment {
  patientId: string;
  timestamp: Date;
  overallRisk: 'low' | 'medium' | 'high';
  confidence: number; // 0-1
  riskFactors: RiskFactor[];
  priority: number; // 1-5, where 1 is highest priority
  recommendations: {
    action: string;
    urgency: 'low' | 'medium' | 'high';
    rationale: string;
  }[];
}

export class RiskAssessmentService {
  private static instance: RiskAssessmentService;

  private constructor() {}

  public static getInstance(): RiskAssessmentService {
    if (!RiskAssessmentService.instance) {
      RiskAssessmentService.instance = new RiskAssessmentService();
    }
    return RiskAssessmentService.instance;
  }

  async assessPatientRisk(
    patientId: string,
    medicalHistory: MedicalHistory
  ): Promise<RiskAssessment> {
    try {
      const riskFactors = await this.analyzeRiskFactors(medicalHistory);
      const overallRisk = this.calculateOverallRisk(riskFactors);
      const confidence = this.calculateConfidence(riskFactors);
      const priority = this.calculatePriority(riskFactors, overallRisk);
      const recommendations = this.generateRecommendations(riskFactors);

      const assessment: RiskAssessment = {
        patientId,
        timestamp: new Date(),
        overallRisk,
        confidence,
        riskFactors,
        priority,
        recommendations
      };

      await hipaaAuditLogger.logAccess(
        'system',
        'provider',
        PHICategory.PHI,
        'risk_assessment',
        { patientId, overallRisk, priority },
        '127.0.0.1',
        'RiskAssessmentService',
        true
      );

      return assessment;
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'risk_assessment_error',
        { patientId, error: error.message },
        '127.0.0.1',
        'RiskAssessmentService'
      );
      throw error;
    }
  }

  private async analyzeRiskFactors(medicalHistory: MedicalHistory): Promise<RiskFactor[]> {
    const riskFactors: RiskFactor[] = [];

    // Analyze medical conditions
    for (const condition of medicalHistory.conditions) {
      if (condition.status === 'active' || condition.status === 'chronic') {
        riskFactors.push({
          id: `condition-${condition.id}`,
          name: condition.name,
          category: 'medical',
          severity: this.mapConditionSeverity(condition.severity),
          confidence: 0.9, // High confidence for diagnosed conditions
          evidence: [{
            source: 'Medical Record',
            strength: 'strong',
            description: `Diagnosed ${condition.status} condition`
          }],
          impact: {
            morbidity: this.calculateConditionImpact(condition)
          }
        });
      }
    }

    // Analyze medications
    for (const medication of medicalHistory.medications) {
      const interactions = await this.checkMedicationRisks(medication);
      if (interactions.length > 0) {
        riskFactors.push({
          id: `medication-${medication.id}`,
          name: `Medication Risk: ${medication.name}`,
          category: 'medical',
          severity: 'high',
          confidence: 0.8,
          evidence: interactions.map(i => ({
            source: 'Drug Interaction Database',
            strength: 'moderate',
            description: i.description
          })),
          impact: {
            morbidity: 0.7
          }
        });
      }
    }

    // Analyze family history
    for (const pattern of medicalHistory.familyHistory.inheritancePatterns) {
      if (pattern.pattern !== 'unknown') {
        riskFactors.push({
          id: `genetic-${pattern.condition}`,
          name: `Genetic Risk: ${pattern.condition}`,
          category: 'genetic',
          severity: this.mapInheritancePatternSeverity(pattern.pattern),
          confidence: 0.7,
          evidence: [{
            source: 'Family History',
            strength: 'moderate',
            description: `${pattern.pattern} inheritance pattern`
          }],
          impact: {
            morbidity: 0.6
          }
        });
      }
    }

    return riskFactors;
  }

  private calculateOverallRisk(riskFactors: RiskFactor[]): 'low' | 'medium' | 'high' {
    const highRiskCount = riskFactors.filter(f => f.severity === 'high').length;
    const mediumRiskCount = riskFactors.filter(f => f.severity === 'medium').length;

    if (highRiskCount > 0) return 'high';
    if (mediumRiskCount > 1) return 'medium';
    return 'low';
  }

  private calculateConfidence(riskFactors: RiskFactor[]): number {
    if (riskFactors.length === 0) return 0;
    const totalConfidence = riskFactors.reduce((sum, factor) => sum + factor.confidence, 0);
    return totalConfidence / riskFactors.length;
  }

  private calculatePriority(
    riskFactors: RiskFactor[],
    overallRisk: 'low' | 'medium' | 'high'
  ): number {
    const highRiskCount = riskFactors.filter(f => f.severity === 'high').length;
    const mediumRiskCount = riskFactors.filter(f => f.severity === 'medium').length;

    if (overallRisk === 'high' || highRiskCount > 1) return 1;
    if (overallRisk === 'medium' || highRiskCount === 1 || mediumRiskCount > 1) return 2;
    if (mediumRiskCount === 1) return 3;
    return 4;
  }

  private generateRecommendations(riskFactors: RiskFactor[]): {
    action: string;
    urgency: 'low' | 'medium' | 'high';
    rationale: string;
  }[] {
    const recommendations: {
      action: string;
      urgency: 'low' | 'medium' | 'high';
      rationale: string;
    }[] = [];

    // Add recommendations based on risk factors
    for (const factor of riskFactors) {
      if (factor.severity === 'high') {
        recommendations.push({
          action: `Immediate review of ${factor.name}`,
          urgency: 'high',
          rationale: `High severity risk factor with ${(factor.confidence * 100).toFixed(0)}% confidence`
        });
      } else if (factor.severity === 'medium') {
        recommendations.push({
          action: `Schedule follow-up for ${factor.name}`,
          urgency: 'medium',
          rationale: `Medium severity risk factor requiring attention`
        });
      }
    }

    return recommendations;
  }

  private mapConditionSeverity(severity: 'mild' | 'moderate' | 'severe'): 'low' | 'medium' | 'high' {
    switch (severity) {
      case 'severe': return 'high';
      case 'moderate': return 'medium';
      case 'mild': return 'low';
    }
  }

  private mapInheritancePatternSeverity(pattern: string): 'low' | 'medium' | 'high' {
    switch (pattern) {
      case 'autosomal_dominant': return 'high';
      case 'x_linked': return 'high';
      case 'autosomal_recessive': return 'medium';
      case 'mitochondrial': return 'medium';
      default: return 'low';
    }
  }

  private calculateConditionImpact(condition: any): number {
    // Simplified impact calculation
    switch (condition.severity) {
      case 'severe': return 0.8;
      case 'moderate': return 0.5;
      case 'mild': return 0.2;
      default: return 0;
    }
  }

  private async checkMedicationRisks(medication: any): Promise<any[]> {
    try {
      // Check for known high-risk medications
      const highRiskMeds = [
        'warfarin', 'insulin', 'digoxin', 'lithium', 'theophylline'
      ];
      
      if (highRiskMeds.some(med => medication.name.toLowerCase().includes(med))) {
        return [{
          description: `High-risk medication requiring close monitoring`,
          severity: 'high'
        }];
      }

      // Check for medication combinations
      const combinationRisks = [
        {
          med1: 'warfarin',
          med2: 'aspirin',
          description: 'Increased bleeding risk',
          severity: 'high'
        },
        {
          med1: 'ace inhibitor',
          med2: 'nsaid',
          description: 'Increased risk of kidney damage',
          severity: 'high'
        }
      ];

      // TODO: Implement actual drug interaction checking with a drug database
      // This would typically involve:
      // 1. Querying a drug interaction database
      // 2. Checking for contraindications
      // 3. Evaluating severity of interactions
      // 4. Considering patient-specific factors

      return [];
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'medication_risk_check_error',
        { medicationId: medication.id, error: error.message },
        '127.0.0.1',
        'RiskAssessmentService'
      );
      return [];
    }
  }
} 