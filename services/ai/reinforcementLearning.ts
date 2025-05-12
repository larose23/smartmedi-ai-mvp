import { TriageDecision } from '@/types/medical';

interface ModelState {
  weights: Record<string, number>;
  lastUpdate: Date;
  performance: {
    accuracy: number;
    overrideRate: number;
  };
}

interface ClinicianOverride {
  originalDecision: TriageDecision;
  overrideDecision: TriageDecision;
  timestamp: Date;
  clinicianId: string;
  reason: string;
}

export class ReinforcementLearningService {
  private modelState: ModelState;
  private learningRate: number = 0.01;
  private overrideHistory: ClinicianOverride[] = [];

  constructor(initialWeights: Record<string, number> = {}) {
    this.modelState = {
      weights: initialWeights,
      lastUpdate: new Date(),
      performance: {
        accuracy: 1.0,
        overrideRate: 0.0
      }
    };
  }

  async recordOverride(override: ClinicianOverride): Promise<void> {
    try {
      this.overrideHistory.push(override);
      await this.updateModelWeights(override);
      await this.updatePerformanceMetrics();
    } catch (error) {
      console.error('Error recording override:', error);
      throw new Error('Failed to record clinician override');
    }
  }

  private async updateModelWeights(override: ClinicianOverride): Promise<void> {
    const { originalDecision, overrideDecision } = override;
    
    // Calculate the difference in acuity levels
    const acuityDifference = overrideDecision.acuity - originalDecision.acuity;
    
    // Update weights based on the difference
    Object.keys(this.modelState.weights).forEach(factor => {
      const factorWeight = this.modelState.weights[factor];
      const adjustment = this.calculateWeightAdjustment(
        factorWeight,
        acuityDifference,
        override.originalDecision.confidence
      );
      
      this.modelState.weights[factor] = this.clampWeight(factorWeight + adjustment);
    });

    this.modelState.lastUpdate = new Date();
  }

  private calculateWeightAdjustment(
    currentWeight: number,
    acuityDifference: number,
    originalConfidence: number
  ): number {
    // Adjust weight based on the magnitude and direction of the override
    const direction = Math.sign(acuityDifference);
    const magnitude = Math.abs(acuityDifference);
    
    // Higher confidence in original decision means smaller adjustments
    const confidenceFactor = 1 - originalConfidence;
    
    return direction * magnitude * this.learningRate * confidenceFactor;
  }

  private clampWeight(weight: number): number {
    return Math.max(0, Math.min(1, weight));
  }

  private async updatePerformanceMetrics(): Promise<void> {
    const recentOverrides = this.overrideHistory.slice(-100); // Look at last 100 overrides
    
    if (recentOverrides.length === 0) return;

    const totalCases = recentOverrides.length;
    const overrideCount = recentOverrides.filter(
      o => o.originalDecision.acuity !== o.overrideDecision.acuity
    ).length;

    this.modelState.performance = {
      accuracy: 1 - (overrideCount / totalCases),
      overrideRate: overrideCount / totalCases
    };
  }

  getModelState(): ModelState {
    return { ...this.modelState };
  }

  getOverrideHistory(): ClinicianOverride[] {
    return [...this.overrideHistory];
  }

  async resetModel(initialWeights: Record<string, number> = {}): Promise<void> {
    this.modelState = {
      weights: initialWeights,
      lastUpdate: new Date(),
      performance: {
        accuracy: 1.0,
        overrideRate: 0.0
      }
    };
    this.overrideHistory = [];
  }
} 