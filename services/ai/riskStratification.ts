import jsbayes from 'jsbayes';
import { VitalSigns, Comorbidity, RiskFactor, RiskAssessment } from '@/types/medical';

export class RiskStratificationService {
  private graph: any;

  constructor() {
    this.initializeBayesianNetwork();
  }

  private initializeBayesianNetwork() {
    this.graph = jsbayes.graph({
      // Vital signs nodes
      temperature: jsbayes.beta(1, 1),
      heartRate: jsbayes.beta(1, 1),
      bloodPressure: jsbayes.beta(1, 1),
      respiratoryRate: jsbayes.beta(1, 1),
      oxygenSaturation: jsbayes.beta(1, 1),

      // Comorbidity impact
      comorbidityRisk: jsbayes.beta(1, 1),

      // Overall risk
      overallRisk: jsbayes.beta(1, 1)
    });
  }

  async assessRisk(
    vitals: VitalSigns,
    comorbidities: Comorbidity[],
    riskFactors: RiskFactor[]
  ): Promise<RiskAssessment> {
    try {
      // Normalize vital signs to 0-1 range
      const normalizedVitals = this.normalizeVitals(vitals);
      
      // Calculate comorbidity impact
      const comorbidityImpact = this.calculateComorbidityImpact(comorbidities);
      
      // Update Bayesian network with observations
      this.updateNetwork(normalizedVitals, comorbidityImpact, riskFactors);
      
      // Sample from the network
      const samples = this.sampleNetwork(1000);
      
      // Calculate overall risk and confidence
      const riskAssessment = this.calculateRiskAssessment(samples, riskFactors);
      
      return riskAssessment;
    } catch (error) {
      console.error('Error in risk stratification:', error);
      throw new Error('Failed to assess risk');
    }
  }

  private normalizeVitals(vitals: VitalSigns): Record<string, number> {
    return {
      temperature: this.normalizeValue(vitals.temperature, 35, 42),
      heartRate: this.normalizeValue(vitals.heartRate, 40, 200),
      bloodPressure: this.normalizeValue(
        (vitals.bloodPressure.systolic + vitals.bloodPressure.diastolic) / 2,
        60,
        200
      ),
      respiratoryRate: this.normalizeValue(vitals.respiratoryRate, 8, 40),
      oxygenSaturation: this.normalizeValue(vitals.oxygenSaturation, 70, 100)
    };
  }

  private normalizeValue(value: number, min: number, max: number): number {
    return (value - min) / (max - min);
  }

  private calculateComorbidityImpact(comorbidities: Comorbidity[]): number {
    const severityWeights = {
      mild: 0.3,
      moderate: 0.6,
      severe: 0.9
    };

    return comorbidities.reduce((impact, comorbidity) => {
      return impact + severityWeights[comorbidity.severity];
    }, 0) / Math.max(comorbidities.length, 1);
  }

  private updateNetwork(
    normalizedVitals: Record<string, number>,
    comorbidityImpact: number,
    riskFactors: RiskFactor[]
  ) {
    this.graph.observe({
      temperature: normalizedVitals.temperature,
      heartRate: normalizedVitals.heartRate,
      bloodPressure: normalizedVitals.bloodPressure,
      respiratoryRate: normalizedVitals.respiratoryRate,
      oxygenSaturation: normalizedVitals.oxygenSaturation,
      comorbidityRisk: comorbidityImpact
    });
  }

  private sampleNetwork(sampleCount: number) {
    const samples = [];
    for (let i = 0; i < sampleCount; i++) {
      samples.push(this.graph.sample());
    }
    return samples;
  }

  private calculateRiskAssessment(
    samples: any[],
    riskFactors: RiskFactor[]
  ): RiskAssessment {
    const overallRisk = samples.reduce((sum, sample) => sum + sample.overallRisk, 0) / samples.length;
    
    const confidence = this.calculateConfidence(samples);
    
    const explanation = this.generateExplanation(overallRisk, riskFactors);

    return {
      overallRisk,
      factors: riskFactors,
      confidence,
      timestamp: new Date(),
      explanation
    };
  }

  private calculateConfidence(samples: any[]): number {
    const variance = samples.reduce((sum, sample) => {
      const diff = sample.overallRisk - (samples.reduce((a, b) => a + b.overallRisk, 0) / samples.length);
      return sum + diff * diff;
    }, 0) / samples.length;
    
    return 1 - Math.min(variance * 4, 1); // Convert variance to confidence score
  }

  private generateExplanation(risk: number, factors: RiskFactor[]): string {
    const riskLevel = risk < 0.3 ? 'low' : risk < 0.6 ? 'moderate' : 'high';
    const topFactors = factors
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map(f => f.name)
      .join(', ');

    return `Risk assessment indicates ${riskLevel} risk level. Primary contributing factors: ${topFactors}`;
  }
} 