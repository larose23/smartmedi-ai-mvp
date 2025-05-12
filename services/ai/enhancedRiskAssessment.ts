import { VitalSigns, RiskFactor, Comorbidity } from '@/types/medical';

interface VitalSignsHistory {
  timestamp: Date;
  vitals: VitalSigns;
}

interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable';
  rate: number;
  significance: number;
}

interface RiskScore {
  score: number;
  level: 'low' | 'moderate' | 'high';
  factors: string[];
  confidence: number;
}

export class EnhancedRiskAssessmentService {
  private readonly NEWS2_THRESHOLDS = {
    respiratoryRate: [
      { range: [0, 8], score: 3 },
      { range: [9, 11], score: 1 },
      { range: [12, 20], score: 0 },
      { range: [21, 24], score: 2 },
      { range: [25, Infinity], score: 3 }
    ],
    oxygenSaturation: [
      { range: [0, 91], score: 3 },
      { range: [92, 93], score: 2 },
      { range: [94, 95], score: 1 },
      { range: [96, 100], score: 0 }
    ],
    systolicBP: [
      { range: [0, 90], score: 3 },
      { range: [91, 100], score: 2 },
      { range: [101, 110], score: 1 },
      { range: [111, 219], score: 0 },
      { range: [220, Infinity], score: 3 }
    ],
    pulse: [
      { range: [0, 40], score: 3 },
      { range: [41, 50], score: 1 },
      { range: [51, 90], score: 0 },
      { range: [91, 110], score: 1 },
      { range: [111, 130], score: 2 },
      { range: [131, Infinity], score: 3 }
    ],
    temperature: [
      { range: [0, 35], score: 3 },
      { range: [35.1, 36], score: 1 },
      { range: [36.1, 38], score: 0 },
      { range: [38.1, 39], score: 1 },
      { range: [39.1, Infinity], score: 2 }
    ]
  };

  async assessRisk(
    currentVitals: VitalSigns,
    vitalHistory: VitalSignsHistory[],
    riskFactors: RiskFactor[],
    comorbidities: Comorbidity[]
  ): Promise<{
    overallRisk: number;
    news2Score: number;
    trendAnalysis: Record<string, TrendAnalysis>;
    riskFactors: string[];
    confidence: number;
  }> {
    try {
      // Calculate NEWS2 score
      const news2Score = this.calculateNEWS2Score(currentVitals);

      // Analyze vital signs trends
      const trendAnalysis = this.analyzeVitalTrends(vitalHistory);

      // Calculate demographic and comorbidity risk
      const comorbidityRisk = this.calculateComorbidityRisk(comorbidities);
      const demographicRisk = this.calculateDemographicRisk(riskFactors);

      // Combine all risk factors
      const overallRisk = this.combineRiskFactors(
        news2Score,
        trendAnalysis,
        comorbidityRisk,
        demographicRisk
      );

      return {
        overallRisk,
        news2Score,
        trendAnalysis,
        riskFactors: this.identifyKeyRiskFactors(
          news2Score,
          trendAnalysis,
          comorbidities,
          riskFactors
        ),
        confidence: this.calculateConfidence(news2Score, trendAnalysis)
      };
    } catch (error) {
      console.error('Error in enhanced risk assessment:', error);
      throw new Error('Failed to assess risk');
    }
  }

  private calculateNEWS2Score(vitals: VitalSigns): number {
    let score = 0;

    // Respiratory rate
    score += this.getScoreForVital(
      vitals.respiratoryRate,
      this.NEWS2_THRESHOLDS.respiratoryRate
    );

    // Oxygen saturation
    score += this.getScoreForVital(
      vitals.oxygenSaturation,
      this.NEWS2_THRESHOLDS.oxygenSaturation
    );

    // Systolic blood pressure
    score += this.getScoreForVital(
      vitals.bloodPressure.systolic,
      this.NEWS2_THRESHOLDS.systolicBP
    );

    // Pulse
    score += this.getScoreForVital(
      vitals.heartRate,
      this.NEWS2_THRESHOLDS.pulse
    );

    // Temperature
    score += this.getScoreForVital(
      vitals.temperature,
      this.NEWS2_THRESHOLDS.temperature
    );

    return score;
  }

  private getScoreForVital(
    value: number,
    thresholds: Array<{ range: [number, number]; score: number }>
  ): number {
    for (const threshold of thresholds) {
      const [min, max] = threshold.range;
      if (value >= min && value <= max) {
        return threshold.score;
      }
    }
    return 0;
  }

  private analyzeVitalTrends(
    history: VitalSignsHistory[]
  ): Record<string, TrendAnalysis> {
    const trends: Record<string, TrendAnalysis> = {};
    const vitalTypes = ['heartRate', 'bloodPressure', 'respiratoryRate', 'oxygenSaturation', 'temperature'];

    for (const vitalType of vitalTypes) {
      const values = history.map(h => ({
        value: this.getVitalValue(h.vitals, vitalType),
        timestamp: h.timestamp.getTime()
      }));

      if (values.length >= 2) {
        trends[vitalType] = this.calculateTrend(values);
      }
    }

    return trends;
  }

  private getVitalValue(vitals: VitalSigns, type: string): number {
    switch (type) {
      case 'bloodPressure':
        return (vitals.bloodPressure.systolic + vitals.bloodPressure.diastolic) / 2;
      default:
        return vitals[type as keyof VitalSigns] as number;
    }
  }

  private calculateTrend(
    values: Array<{ value: number; timestamp: number }>
  ): TrendAnalysis {
    const n = values.length;
    const xMean = values.reduce((sum, v) => sum + v.timestamp, 0) / n;
    const yMean = values.reduce((sum, v) => sum + v.value, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (const point of values) {
      const xDiff = point.timestamp - xMean;
      const yDiff = point.value - yMean;
      numerator += xDiff * yDiff;
      denominator += xDiff * xDiff;
    }

    const slope = numerator / denominator;
    const rate = slope * (1000 * 60 * 60); // Convert to per hour

    return {
      direction: rate > 0.1 ? 'increasing' : rate < -0.1 ? 'decreasing' : 'stable',
      rate: Math.abs(rate),
      significance: this.calculateSignificance(values, slope)
    };
  }

  private calculateSignificance(
    values: Array<{ value: number; timestamp: number }>,
    slope: number
  ): number {
    const n = values.length;
    const xMean = values.reduce((sum, v) => sum + v.timestamp, 0) / n;
    const yMean = values.reduce((sum, v) => sum + v.value, 0) / n;

    let sumSquaredErrors = 0;
    for (const point of values) {
      const predicted = slope * (point.timestamp - xMean) + yMean;
      sumSquaredErrors += Math.pow(point.value - predicted, 2);
    }

    const standardError = Math.sqrt(sumSquaredErrors / (n - 2));
    return 1 - Math.min(standardError / yMean, 1);
  }

  private calculateComorbidityRisk(comorbidities: Comorbidity[]): number {
    const severityWeights = {
      mild: 0.3,
      moderate: 0.6,
      severe: 0.9
    };

    return comorbidities.reduce((risk, comorbidity) => {
      return risk + (severityWeights[comorbidity.severity] * (comorbidity.isActive ? 1 : 0.5));
    }, 0) / Math.max(comorbidities.length, 1);
  }

  private calculateDemographicRisk(riskFactors: RiskFactor[]): number {
    return riskFactors.reduce((risk, factor) => {
      return risk + factor.weight;
    }, 0) / Math.max(riskFactors.length, 1);
  }

  private combineRiskFactors(
    news2Score: number,
    trendAnalysis: Record<string, TrendAnalysis>,
    comorbidityRisk: number,
    demographicRisk: number
  ): number {
    // Normalize NEWS2 score (0-20 range)
    const normalizedNews2 = news2Score / 20;

    // Calculate trend risk
    const trendRisk = Object.values(trendAnalysis).reduce((risk, trend) => {
      return risk + (trend.significance * (trend.direction === 'increasing' ? 1 : 0.5));
    }, 0) / Object.keys(trendAnalysis).length;

    // Weighted combination
    return (
      normalizedNews2 * 0.4 +
      trendRisk * 0.3 +
      comorbidityRisk * 0.2 +
      demographicRisk * 0.1
    );
  }

  private identifyKeyRiskFactors(
    news2Score: number,
    trendAnalysis: Record<string, TrendAnalysis>,
    comorbidities: Comorbidity[],
    riskFactors: RiskFactor[]
  ): string[] {
    const factors: string[] = [];

    // Add NEWS2 score if significant
    if (news2Score >= 7) {
      factors.push(`High NEWS2 score: ${news2Score}`);
    }

    // Add significant trends
    Object.entries(trendAnalysis).forEach(([vital, trend]) => {
      if (trend.significance > 0.7 && trend.direction === 'increasing') {
        factors.push(`Increasing ${vital} trend`);
      }
    });

    // Add severe comorbidities
    comorbidities
      .filter(c => c.severity === 'severe' && c.isActive)
      .forEach(c => factors.push(`Active severe condition: ${c.name}`));

    // Add high-weight risk factors
    riskFactors
      .filter(f => f.weight > 0.7)
      .forEach(f => factors.push(`High-risk factor: ${f.name}`));

    return factors;
  }

  private calculateConfidence(
    news2Score: number,
    trendAnalysis: Record<string, TrendAnalysis>
  ): number {
    const trendConfidence = Object.values(trendAnalysis).reduce(
      (sum, trend) => sum + trend.significance,
      0
    ) / Object.keys(trendAnalysis).length;

    // Higher confidence for more extreme NEWS2 scores
    const news2Confidence = 1 - Math.abs(news2Score - 10) / 10;

    return (trendConfidence + news2Confidence) / 2;
  }
} 