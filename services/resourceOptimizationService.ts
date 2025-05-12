import { createClient } from '@supabase/supabase-js';
import { TriageCase } from '../types/triage';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface FlowMetrics {
  department: string;
  currentLoad: number;
  averageWaitTime: number;
  throughput: number;
  bottleneckScore: number;
}

interface SurgePrediction {
  department: string;
  predictedLoad: number;
  confidence: number;
  timeWindow: string;
  factors: string[];
}

interface ResourceRecommendation {
  department: string;
  currentStaffing: number;
  recommendedStaffing: number;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
}

class ResourceOptimizationService {
  // Get patient flow metrics for all departments
  async getFlowMetrics(): Promise<FlowMetrics[]> {
    try {
      const { data: cases, error } = await supabase
        .from('triage_cases')
        .select('*')
        .eq('status', 'active');

      if (error) throw error;

      const departmentMetrics = new Map<string, FlowMetrics>();

      // Calculate metrics for each department
      cases.forEach((case_: TriageCase) => {
        const dept = case_.department;
        if (!departmentMetrics.has(dept)) {
          departmentMetrics.set(dept, {
            department: dept,
            currentLoad: 0,
            averageWaitTime: 0,
            throughput: 0,
            bottleneckScore: 0,
          });
        }

        const metrics = departmentMetrics.get(dept)!;
        metrics.currentLoad++;
        metrics.averageWaitTime += case_.wait_time || 0;
      });

      // Calculate final metrics
      return Array.from(departmentMetrics.values()).map(metrics => ({
        ...metrics,
        averageWaitTime: metrics.averageWaitTime / metrics.currentLoad,
        throughput: this.calculateThroughput(metrics.currentLoad, metrics.averageWaitTime),
        bottleneckScore: this.calculateBottleneckScore(metrics),
      }));
    } catch (error) {
      console.error('Error calculating flow metrics:', error);
      throw error;
    }
  }

  // Predict potential surges
  async predictSurges(): Promise<SurgePrediction[]> {
    try {
      const { data: historicalCases, error } = await supabase
        .from('triage_cases')
        .select('*')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const predictions: SurgePrediction[] = [];
      const departments = new Set(historicalCases.map(c => c.department));

      for (const dept of departments) {
        const deptCases = historicalCases.filter(c => c.department === dept);
        const prediction = this.analyzeSurgePatterns(dept, deptCases);
        predictions.push(prediction);
      }

      return predictions;
    } catch (error) {
      console.error('Error predicting surges:', error);
      throw error;
    }
  }

  // Generate resource allocation recommendations
  async getResourceRecommendations(): Promise<ResourceRecommendation[]> {
    try {
      const flowMetrics = await this.getFlowMetrics();
      const surgePredictions = await this.predictSurges();

      return flowMetrics.map(metrics => {
        const surgePrediction = surgePredictions.find(p => p.department === metrics.department);
        return this.generateRecommendation(metrics, surgePrediction);
      });
    } catch (error) {
      console.error('Error generating resource recommendations:', error);
      throw error;
    }
  }

  // Private helper methods
  private calculateThroughput(load: number, waitTime: number): number {
    return load / (waitTime || 1); // Cases per minute
  }

  private calculateBottleneckScore(metrics: FlowMetrics): number {
    const loadFactor = metrics.currentLoad / 100; // Assuming 100 is max capacity
    const waitFactor = metrics.averageWaitTime / 30; // Assuming 30 minutes is threshold
    return (loadFactor + waitFactor) / 2;
  }

  private analyzeSurgePatterns(department: string, cases: TriageCase[]): SurgePrediction {
    const hourlyLoads = new Array(24).fill(0);
    const factors: string[] = [];

    // Calculate hourly loads
    cases.forEach(case_ => {
      const hour = new Date(case_.created_at).getHours();
      hourlyLoads[hour]++;
    });

    // Find peak hours
    const peakHours = hourlyLoads
      .map((load, hour) => ({ hour, load }))
      .sort((a, b) => b.load - a.load)
      .slice(0, 3);

    // Calculate prediction
    const currentHour = new Date().getHours();
    const predictedLoad = hourlyLoads[currentHour] * 1.2; // 20% increase

    // Identify factors
    if (predictedLoad > 10) factors.push('High historical load');
    if (peakHours.some(p => p.hour === currentHour)) factors.push('Peak hour pattern');
    if (cases.some(c => c.severity === 'critical')) factors.push('Critical cases present');

    return {
      department,
      predictedLoad,
      confidence: 0.8,
      timeWindow: 'next 2 hours',
      factors,
    };
  }

  private generateRecommendation(
    metrics: FlowMetrics,
    surgePrediction?: SurgePrediction
  ): ResourceRecommendation {
    const currentStaffing = Math.ceil(metrics.currentLoad / 5); // Assuming 5 cases per staff
    let recommendedStaffing = currentStaffing;
    let priority: 'high' | 'medium' | 'low' = 'low';
    let reasoning = '';

    if (metrics.bottleneckScore > 0.7) {
      recommendedStaffing += 2;
      priority = 'high';
      reasoning = 'High bottleneck score indicates resource constraints';
    } else if (surgePrediction && surgePrediction.predictedLoad > metrics.currentLoad * 1.5) {
      recommendedStaffing += 1;
      priority = 'medium';
      reasoning = 'Predicted surge in patient load';
    }

    return {
      department: metrics.department,
      currentStaffing,
      recommendedStaffing,
      priority,
      reasoning,
    };
  }
}

export const resourceOptimizationService = new ResourceOptimizationService(); 