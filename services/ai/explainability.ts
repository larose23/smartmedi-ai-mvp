import { TriageDecision, RiskAssessment, MedicalSymptom } from '@/types/medical';

interface DecisionPath {
  steps: DecisionStep[];
  confidence: number;
  explanation: string;
}

interface DecisionStep {
  component: string;
  input: any;
  output: any;
  confidence: number;
  weight: number;
}

export class ExplainabilityService {
  async generateDecisionPath(
    symptoms: MedicalSymptom[],
    riskAssessment: RiskAssessment,
    triageDecision: TriageDecision
  ): Promise<DecisionPath> {
    try {
      const steps = await this.analyzeDecisionSteps(
        symptoms,
        riskAssessment,
        triageDecision
      );

      const confidence = this.calculateOverallConfidence(steps);
      const explanation = this.generateExplanation(steps, triageDecision);

      return {
        steps,
        confidence,
        explanation
      };
    } catch (error) {
      console.error('Error generating decision path:', error);
      throw new Error('Failed to generate decision path');
    }
  }

  private async analyzeDecisionSteps(
    symptoms: MedicalSymptom[],
    riskAssessment: RiskAssessment,
    triageDecision: TriageDecision
  ): Promise<DecisionStep[]> {
    const steps: DecisionStep[] = [];

    // Analyze symptom processing
    steps.push({
      component: 'Symptom Analysis',
      input: symptoms,
      output: this.aggregateSymptoms(symptoms),
      confidence: this.calculateSymptomConfidence(symptoms),
      weight: 0.4
    });

    // Analyze risk assessment
    steps.push({
      component: 'Risk Assessment',
      input: riskAssessment.factors,
      output: riskAssessment.overallRisk,
      confidence: riskAssessment.confidence,
      weight: 0.3
    });

    // Analyze triage decision
    steps.push({
      component: 'Triage Decision',
      input: {
        symptoms: this.aggregateSymptoms(symptoms),
        risk: riskAssessment.overallRisk
      },
      output: triageDecision.acuity,
      confidence: triageDecision.confidence,
      weight: 0.3
    });

    return steps;
  }

  private aggregateSymptoms(symptoms: MedicalSymptom[]): Record<string, number> {
    const severityWeights = {
      mild: 0.3,
      moderate: 0.6,
      severe: 0.9
    };

    return symptoms.reduce((acc, symptom) => {
      acc[symptom.name] = severityWeights[symptom.severity] * symptom.confidence;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateSymptomConfidence(symptoms: MedicalSymptom[]): number {
    if (symptoms.length === 0) return 0;
    
    const totalConfidence = symptoms.reduce(
      (sum, symptom) => sum + symptom.confidence,
      0
    );
    
    return totalConfidence / symptoms.length;
  }

  private calculateOverallConfidence(steps: DecisionStep[]): number {
    const weightedSum = steps.reduce(
      (sum, step) => sum + step.confidence * step.weight,
      0
    );
    
    const totalWeight = steps.reduce((sum, step) => sum + step.weight, 0);
    
    return weightedSum / totalWeight;
  }

  private generateExplanation(steps: DecisionStep[], triageDecision: TriageDecision): string {
    const symptomStep = steps.find(s => s.component === 'Symptom Analysis');
    const riskStep = steps.find(s => s.component === 'Risk Assessment');
    
    const keySymptoms = Object.entries(symptomStep?.output || {})
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([name]) => name)
      .join(', ');

    const riskLevel = riskStep?.output < 0.3 ? 'low' : riskStep?.output < 0.6 ? 'moderate' : 'high';
    
    return `Triage decision (Acuity ${triageDecision.acuity}) was based on:
    - Primary symptoms: ${keySymptoms}
    - Overall risk level: ${riskLevel}
    - Decision confidence: ${(triageDecision.confidence * 100).toFixed(1)}%`;
  }

  async getDecisionMetrics(decisionPath: DecisionPath): Promise<{
    confidence: number;
    reliability: number;
    transparency: number;
  }> {
    return {
      confidence: decisionPath.confidence,
      reliability: this.calculateReliability(decisionPath),
      transparency: this.calculateTransparency(decisionPath)
    };
  }

  private calculateReliability(decisionPath: DecisionPath): number {
    // Reliability is based on the consistency of confidence scores across steps
    const confidences = decisionPath.steps.map(step => step.confidence);
    const mean = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const variance = confidences.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / confidences.length;
    
    return 1 - Math.min(variance * 4, 1); // Convert variance to reliability score
  }

  private calculateTransparency(decisionPath: DecisionPath): number {
    // Transparency is based on the completeness of the explanation
    const explanationLength = decisionPath.explanation.length;
    const stepCount = decisionPath.steps.length;
    
    // Normalize based on expected explanation length (rough estimate)
    const expectedLength = stepCount * 100;
    return Math.min(explanationLength / expectedLength, 1);
  }
} 