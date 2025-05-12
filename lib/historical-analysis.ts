import { CheckIn } from '@/types/triage';

interface HistoricalStats {
  totalPatients: number;
  averageWaitTime: number;
  departmentDistribution: Record<string, number>;
  commonDiagnoses: Array<{ diagnosis: string; count: number }>;
  peakHours: Array<{ hour: number; count: number }>;
  riskFactorDistribution: Record<string, number>;
}

interface TimeRange {
  start: Date;
  end: Date;
}

export class HistoricalAnalyzer {
  private checkIns: CheckIn[];

  constructor(checkIns: CheckIn[]) {
    this.checkIns = checkIns;
  }

  analyzeTimeRange(range: TimeRange): HistoricalStats {
    const filteredCheckIns = this.checkIns.filter(checkIn => {
      if (!checkIn.check_in_time && !checkIn.created_at) return false;
      const checkInTime = new Date(checkIn.check_in_time || checkIn.created_at || '');
      return checkInTime >= range.start && checkInTime <= range.end;
    });

    return {
      totalPatients: filteredCheckIns.length,
      averageWaitTime: this.calculateAverageWaitTime(filteredCheckIns),
      departmentDistribution: this.analyzeDepartmentDistribution(filteredCheckIns),
      commonDiagnoses: this.findCommonDiagnoses(filteredCheckIns),
      peakHours: this.analyzePeakHours(filteredCheckIns),
      riskFactorDistribution: this.analyzeRiskFactors(filteredCheckIns)
    };
  }

  private calculateAverageWaitTime(checkIns: CheckIn[]): number {
    if (checkIns.length === 0) return 0;
    const totalWaitTime = checkIns.reduce((sum, checkIn) => sum + (checkIn.estimated_wait_minutes || 0), 0);
    return Math.round(totalWaitTime / checkIns.length);
  }

  private analyzeDepartmentDistribution(checkIns: CheckIn[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    checkIns.forEach(checkIn => {
      const department = checkIn.suggested_department || checkIn.department || 'General';
      if (department) {
        distribution[department] = (distribution[department] || 0) + 1;
      }
    });
    return distribution;
  }

  private findCommonDiagnoses(checkIns: CheckIn[]): Array<{ diagnosis: string; count: number }> {
    const diagnosisCount: Record<string, number> = {};
    checkIns.forEach(checkIn => {
      if (checkIn.potential_diagnoses) {
        checkIn.potential_diagnoses.forEach(diagnosis => {
          diagnosisCount[diagnosis] = (diagnosisCount[diagnosis] || 0) + 1;
        });
      }
    });

    return Object.entries(diagnosisCount)
      .map(([diagnosis, count]) => ({ diagnosis, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private analyzePeakHours(checkIns: CheckIn[]): Array<{ hour: number; count: number }> {
    const hourlyCount: Record<number, number> = {};
    checkIns.forEach(checkIn => {
      if (checkIn.check_in_time || checkIn.created_at) {
        const checkInDate = checkIn.check_in_time || checkIn.created_at || '';
        const hour = new Date(checkInDate).getHours();
        hourlyCount[hour] = (hourlyCount[hour] || 0) + 1;
      }
    });

    return Object.entries(hourlyCount)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count);
  }

  private analyzeRiskFactors(checkIns: CheckIn[]): Record<string, number> {
    const riskFactorCount: Record<string, number> = {};
    checkIns.forEach(checkIn => {
      if (checkIn.risk_factors) {
        checkIn.risk_factors.forEach(factor => {
          riskFactorCount[factor] = (riskFactorCount[factor] || 0) + 1;
        });
      }
    });
    return riskFactorCount;
  }

  findSimilarCases(currentCase: CheckIn, limit: number = 5): CheckIn[] {
    return this.checkIns
      .filter(checkIn => checkIn.id !== currentCase.id)
      .map(checkIn => ({
        checkIn,
        similarity: this.calculateSimilarity(currentCase, checkIn)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => item.checkIn);
  }

  private calculateSimilarity(case1: CheckIn, case2: CheckIn): number {
    let similarity = 0;
    
    // Compare primary symptoms
    if (case1.primary_symptom === case2.primary_symptom) similarity += 0.3;
    
    // Compare additional symptoms
    const symptoms1 = Array.isArray(case1.additional_symptoms) 
      ? case1.additional_symptoms 
      : (case1.additional_symptoms ? case1.additional_symptoms.split(',') : []);
    const symptoms2 = Array.isArray(case2.additional_symptoms) 
      ? case2.additional_symptoms 
      : (case2.additional_symptoms ? case2.additional_symptoms.split(',') : []);
    
    const commonSymptoms = symptoms1.filter(s => symptoms2.includes(s));
    similarity += (commonSymptoms.length / Math.max(symptoms1.length, symptoms2.length || 1)) * 0.2;
    
    // Compare pain levels (closer values are more similar)
    const painDiff = Math.abs((case1.symptoms?.pain_level || 0) - (case2.symptoms?.pain_level || 0));
    similarity += (1 - painDiff / 10) * 0.2;
    
    // Compare risk factors
    if (case1.risk_factors && case2.risk_factors) {
      const commonRiskFactors = case1.risk_factors.filter(f => case2.risk_factors?.includes(f));
      const maxLength = Math.max(case1.risk_factors.length || 0, case2.risk_factors.length || 0);
      if (maxLength > 0) {
        similarity += (commonRiskFactors.length / maxLength) * 0.3;
      }
    }
    
    return similarity;
  }
} 