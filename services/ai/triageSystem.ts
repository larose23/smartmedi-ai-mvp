import { MedicalLLMService } from './medicalLLM';
import { RiskStratificationService } from './riskStratification';
import { ReinforcementLearningService } from './reinforcementLearning';
import { ExplainabilityService } from './explainability';
import { ClinicalGuidelinesService } from './clinicalGuidelines';
import { EnhancedRiskAssessmentService } from './enhancedRiskAssessment';
import {
  MedicalSymptom,
  VitalSigns,
  Comorbidity,
  RiskFactor,
  TriageDecision,
  RiskAssessment
} from '@/types/medical';

export class TriageSystem {
  private medicalLLM: MedicalLLMService;
  private riskStratification: RiskStratificationService;
  private reinforcementLearning: ReinforcementLearningService;
  private explainability: ExplainabilityService;
  private clinicalGuidelines: ClinicalGuidelinesService;
  private enhancedRiskAssessment: EnhancedRiskAssessmentService;

  constructor(openAIApiKey: string) {
    this.medicalLLM = new MedicalLLMService(openAIApiKey);
    this.riskStratification = new RiskStratificationService();
    this.reinforcementLearning = new ReinforcementLearningService();
    this.explainability = new ExplainabilityService();
    this.clinicalGuidelines = new ClinicalGuidelinesService();
    this.enhancedRiskAssessment = new EnhancedRiskAssessmentService();
  }

  async processTriageCase(
    patientDescription: string,
    vitals: VitalSigns,
    vitalHistory: Array<{ timestamp: Date; vitals: VitalSigns }>,
    comorbidities: Comorbidity[],
    riskFactors: RiskFactor[]
  ): Promise<{
    triageDecision: TriageDecision;
    riskAssessment: RiskAssessment;
    decisionPath: any;
    metrics: {
      confidence: number;
      reliability: number;
      transparency: number;
    };
    clinicalValidation: {
      isValid: boolean;
      warnings: string[];
      recommendations: string[];
      evidence: string[];
    };
  }> {
    try {
      // 1. Parse symptoms using LLM
      const { symptoms, confidence: symptomConfidence } = await this.medicalLLM.parseSymptoms(
        patientDescription
      );

      // 2. Enhanced risk assessment with temporal analysis
      const enhancedRisk = await this.enhancedRiskAssessment.assessRisk(
        vitals,
        vitalHistory,
        riskFactors,
        comorbidities
      );

      // 3. Make triage decision
      const triageDecision = await this.makeTriageDecision(
        symptoms,
        enhancedRisk,
        vitals
      );

      // 4. Validate against clinical guidelines
      const clinicalValidation = await this.clinicalGuidelines.validateTriageDecision(
        vitals,
        symptoms,
        triageDecision
      );

      // 5. Generate decision path and explanation
      const decisionPath = await this.explainability.generateDecisionPath(
        symptoms,
        enhancedRisk,
        triageDecision
      );

      // 6. Get decision metrics
      const metrics = await this.explainability.getDecisionMetrics(decisionPath);

      return {
        triageDecision,
        riskAssessment: {
          overallRisk: enhancedRisk.overallRisk,
          factors: riskFactors,
          confidence: enhancedRisk.confidence,
          timestamp: new Date(),
          explanation: this.generateRiskExplanation(enhancedRisk)
        },
        decisionPath,
        metrics,
        clinicalValidation
      };
    } catch (error) {
      console.error('Error in triage system:', error);
      throw new Error('Failed to process triage case');
    }
  }

  private async makeTriageDecision(
    symptoms: MedicalSymptom[],
    enhancedRisk: {
      overallRisk: number;
      news2Score: number;
      trendAnalysis: Record<string, any>;
      riskFactors: string[];
      confidence: number;
    },
    vitals: VitalSigns
  ): Promise<TriageDecision> {
    // Calculate acuity based on symptoms, risk, and vitals
    const acuity = this.calculateAcuity(symptoms, enhancedRisk, vitals);
    
    // Calculate confidence based on multiple factors
    const confidence = this.calculateDecisionConfidence(
      symptoms,
      enhancedRisk,
      vitals
    );

    return {
      acuity,
      confidence,
      explanation: this.generateTriageExplanation(acuity, symptoms, enhancedRisk),
      recommendedActions: this.getRecommendedActions(acuity, enhancedRisk),
      riskFactors: enhancedRisk.riskFactors.map(factor => ({
        id: factor,
        name: factor,
        weight: 1,
        category: 'medical',
        description: factor
      })),
      timestamp: new Date()
    };
  }

  private calculateAcuity(
    symptoms: MedicalSymptom[],
    enhancedRisk: {
      overallRisk: number;
      news2Score: number;
      trendAnalysis: Record<string, any>;
      riskFactors: string[];
      confidence: number;
    },
    vitals: VitalSigns
  ): 1 | 2 | 3 | 4 | 5 {
    // Calculate base acuity from symptoms
    const symptomSeverity = symptoms.reduce((max, symptom) => {
      const severity = symptom.severity === 'severe' ? 1 :
                      symptom.severity === 'moderate' ? 2 : 3;
      return Math.min(max, severity);
    }, 5);

    // Adjust based on NEWS2 score
    const news2Adjustment = enhancedRisk.news2Score >= 7 ? -1 :
                           enhancedRisk.news2Score >= 5 ? 0 : 1;

    // Adjust based on risk assessment
    const riskAdjustment = enhancedRisk.overallRisk < 0.3 ? 1 :
                          enhancedRisk.overallRisk < 0.6 ? 0 : -1;

    // Adjust based on vital signs trends
    const trendAdjustment = this.calculateTrendAdjustment(enhancedRisk.trendAnalysis);

    // Calculate final acuity (1-5, where 1 is most urgent)
    const finalAcuity = Math.max(1, Math.min(5, 
      symptomSeverity + news2Adjustment + riskAdjustment + trendAdjustment
    ));
    
    return finalAcuity as 1 | 2 | 3 | 4 | 5;
  }

  private calculateTrendAdjustment(trendAnalysis: Record<string, any>): number {
    let adjustment = 0;
    
    Object.entries(trendAnalysis).forEach(([vital, trend]) => {
      if (trend.direction === 'increasing' && trend.significance > 0.7) {
        adjustment -= 1;
      }
    });

    return adjustment;
  }

  private calculateDecisionConfidence(
    symptoms: MedicalSymptom[],
    enhancedRisk: {
      overallRisk: number;
      news2Score: number;
      trendAnalysis: Record<string, any>;
      riskFactors: string[];
      confidence: number;
    },
    vitals: VitalSigns
  ): number {
    const symptomConfidence = symptoms.length > 0 ?
      symptoms.reduce((sum, s) => sum + s.confidence, 0) / symptoms.length : 0.5;

    const riskConfidence = enhancedRisk.confidence;
    const vitalConfidence = this.calculateVitalConfidence(vitals);

    return (symptomConfidence * 0.4 + riskConfidence * 0.4 + vitalConfidence * 0.2);
  }

  private calculateVitalConfidence(vitals: VitalSigns): number {
    const vitalChecks = [
      vitals.heartRate >= 40 && vitals.heartRate <= 150,
      vitals.bloodPressure.systolic >= 90 && vitals.bloodPressure.systolic <= 180,
      vitals.respiratoryRate >= 8 && vitals.respiratoryRate <= 30,
      vitals.oxygenSaturation >= 90,
      vitals.temperature >= 35 && vitals.temperature <= 39
    ];

    return vitalChecks.filter(check => check).length / vitalChecks.length;
  }

  private generateTriageExplanation(
    acuity: number,
    symptoms: MedicalSymptom[],
    enhancedRisk: {
      overallRisk: number;
      news2Score: number;
      trendAnalysis: Record<string, any>;
      riskFactors: string[];
      confidence: number;
    }
  ): string {
    const urgency = acuity === 1 ? 'immediate' :
                   acuity === 2 ? 'urgent' :
                   acuity === 3 ? 'semi-urgent' :
                   acuity === 4 ? 'non-urgent' : 'routine';

    const primarySymptoms = symptoms
      .filter(s => s.severity === 'severe')
      .map(s => s.name)
      .join(', ');

    const significantTrends = Object.entries(enhancedRisk.trendAnalysis)
      .filter(([_, trend]) => trend.significance > 0.7 && trend.direction === 'increasing')
      .map(([vital, _]) => vital)
      .join(', ');

    return `Patient requires ${urgency} care based on:
    - Primary symptoms: ${primarySymptoms || 'none severe'}
    - NEWS2 score: ${enhancedRisk.news2Score}
    - Risk level: ${enhancedRisk.overallRisk < 0.3 ? 'low' : 
                   enhancedRisk.overallRisk < 0.6 ? 'moderate' : 'high'}
    ${significantTrends ? `- Concerning trends: ${significantTrends}` : ''}`;
  }

  private generateRiskExplanation(enhancedRisk: {
    overallRisk: number;
    news2Score: number;
    trendAnalysis: Record<string, any>;
    riskFactors: string[];
    confidence: number;
  }): string {
    const significantTrends = Object.entries(enhancedRisk.trendAnalysis)
      .filter(([_, trend]) => trend.significance > 0.7)
      .map(([vital, trend]) => `${vital} (${trend.direction})`)
      .join(', ');

    return `Risk assessment based on:
    - NEWS2 score: ${enhancedRisk.news2Score}
    - Key risk factors: ${enhancedRisk.riskFactors.join(', ')}
    ${significantTrends ? `- Vital trends: ${significantTrends}` : ''}`;
  }

  private getRecommendedActions(
    acuity: number,
    enhancedRisk: {
      overallRisk: number;
      news2Score: number;
      trendAnalysis: Record<string, any>;
      riskFactors: string[];
      confidence: number;
    }
  ): string[] {
    const baseActions = {
      1: [
        'Immediate medical attention required',
        'Prepare emergency resources',
        'Notify emergency team'
      ],
      2: [
        'Urgent medical attention required',
        'Prepare treatment area',
        'Notify medical team'
      ],
      3: [
        'Semi-urgent care required',
        'Schedule within 1-2 hours',
        'Monitor vital signs'
      ],
      4: [
        'Non-urgent care required',
        'Schedule within 4-6 hours',
        'Regular monitoring'
      ],
      5: [
        'Routine care required',
        'Schedule at next available slot',
        'Standard monitoring'
      ]
    };

    const actions = [...baseActions[acuity as keyof typeof baseActions]];

    // Add NEWS2 specific actions
    if (enhancedRisk.news2Score >= 7) {
      actions.push('Consider continuous monitoring');
      actions.push('Review NEWS2 score every 30 minutes');
    }

    // Add trend-based actions
    Object.entries(enhancedRisk.trendAnalysis)
      .filter(([_, trend]) => trend.significance > 0.7 && trend.direction === 'increasing')
      .forEach(([vital, _]) => {
        actions.push(`Monitor ${vital} trends closely`);
      });

    return actions;
  }

  async recordClinicianOverride(
    originalDecision: TriageDecision,
    overrideDecision: TriageDecision,
    clinicianId: string,
    reason: string
  ): Promise<void> {
    await this.reinforcementLearning.recordOverride({
      originalDecision,
      overrideDecision,
      timestamp: new Date(),
      clinicianId,
      reason
    });
  }

  getModelPerformance(): any {
    return this.reinforcementLearning.getModelState();
  }
} 