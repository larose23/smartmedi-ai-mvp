import { createClient } from '@supabase/supabase-js';
import { NotificationService } from './notificationService';
import { ReinforcementLearningService } from './reinforcementLearningService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface ClinicianFeedback {
  patientId: string;
  appointmentId: string;
  triageScore: number;
  department: string;
  type: 'positive' | 'negative' | 'neutral';
  outcome: 'resolved' | 'referred' | 'follow_up' | 'admitted' | 'other';
  notes: string;
  accuracy: number;
  relevance: number;
  override: boolean;
  overrideReason?: string;
  demographicFactors: string[];
  timestamp: Date;
}

export interface FeedbackMetrics {
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  averageAccuracy: number;
  averageRelevance: number;
  overrideRate: number;
  demographicBias: {
    factor: string;
    biasScore: number;
    sampleSize: number;
  }[];
  departmentPerformance: {
    department: string;
    accuracy: number;
    relevance: number;
    overrideRate: number;
  }[];
}

export class FeedbackService {
  private static instance: FeedbackService;
  private notificationService: NotificationService;
  private reinforcementLearningService: ReinforcementLearningService;

  private constructor() {
    this.notificationService = NotificationService.getInstance();
    this.reinforcementLearningService = ReinforcementLearningService.getInstance();
  }

  static getInstance(): FeedbackService {
    if (!FeedbackService.instance) {
      FeedbackService.instance = new FeedbackService();
    }
    return FeedbackService.instance;
  }

  async submitFeedback(feedback: ClinicianFeedback): Promise<void> {
    try {
      // Store feedback in Supabase
      const { error } = await supabase
        .from('clinician_feedback')
        .insert({
          patient_id: feedback.patientId,
          appointment_id: feedback.appointmentId,
          triage_score: feedback.triageScore,
          department: feedback.department,
          feedback_type: feedback.type,
          outcome: feedback.outcome,
          notes: feedback.notes,
          accuracy_rating: feedback.accuracy,
          relevance_rating: feedback.relevance,
          override: feedback.override,
          override_reason: feedback.overrideReason,
          demographic_factors: feedback.demographicFactors,
          timestamp: feedback.timestamp.toISOString(),
        });

      if (error) throw error;

      // Update reinforcement learning model
      await this.reinforcementLearningService.updateModel({
        patientId: feedback.patientId,
        triageScore: feedback.triageScore,
        feedback: {
          type: feedback.type,
          accuracy: feedback.accuracy,
          relevance: feedback.relevance,
          outcome: feedback.outcome,
        },
        demographicFactors: feedback.demographicFactors,
      });

      // Send notification for negative feedback
      if (feedback.type === 'negative') {
        await this.notificationService.sendNotification({
          type: 'warning',
          title: 'Negative Feedback Received',
          message: `Negative feedback received for patient ${feedback.patientId} in ${feedback.department}`,
          userId: 'system',
        });
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  }

  async getFeedbackMetrics(
    filters: {
      startDate?: Date;
      endDate?: Date;
      department?: string;
    } = {}
  ): Promise<FeedbackMetrics> {
    try {
      let query = supabase.from('clinician_feedback').select('*');

      if (filters.startDate) {
        query = query.gte('timestamp', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte('timestamp', filters.endDate.toISOString());
      }
      if (filters.department) {
        query = query.eq('department', filters.department);
      }

      const { data, error } = await query;

      if (error) throw error;

      const feedbacks = data.map(this.mapFeedbackDates);

      return this.calculateMetrics(feedbacks);
    } catch (error) {
      console.error('Error fetching feedback metrics:', error);
      throw error;
    }
  }

  private calculateMetrics(feedbacks: ClinicianFeedback[]): FeedbackMetrics {
    const totalFeedback = feedbacks.length;
    const positiveFeedback = feedbacks.filter(f => f.type === 'positive').length;
    const negativeFeedback = feedbacks.filter(f => f.type === 'negative').length;
    const averageAccuracy = this.calculateAverage(feedbacks.map(f => f.accuracy));
    const averageRelevance = this.calculateAverage(feedbacks.map(f => f.relevance));
    const overrideRate = feedbacks.filter(f => f.override).length / totalFeedback;

    // Calculate demographic bias
    const demographicBias = this.calculateDemographicBias(feedbacks);

    // Calculate department performance
    const departmentPerformance = this.calculateDepartmentPerformance(feedbacks);

    return {
      totalFeedback,
      positiveFeedback,
      negativeFeedback,
      averageAccuracy,
      averageRelevance,
      overrideRate,
      demographicBias,
      departmentPerformance,
    };
  }

  private calculateDemographicBias(feedbacks: ClinicianFeedback[]) {
    const demographicFactors = Array.from(
      new Set(feedbacks.flatMap(f => f.demographicFactors))
    );

    return demographicFactors.map(factor => {
      const factorFeedbacks = feedbacks.filter(f => f.demographicFactors.includes(factor));
      const biasScore = this.calculateBiasScore(factorFeedbacks);
      return {
        factor,
        biasScore,
        sampleSize: factorFeedbacks.length,
      };
    });
  }

  private calculateBiasScore(feedbacks: ClinicianFeedback[]): number {
    if (feedbacks.length === 0) return 0;

    const accuracyBias = this.calculateAverage(feedbacks.map(f => f.accuracy)) - 3;
    const relevanceBias = this.calculateAverage(feedbacks.map(f => f.relevance)) - 3;
    const typeBias = feedbacks.filter(f => f.type === 'positive').length / feedbacks.length - 0.5;

    return (accuracyBias + relevanceBias + typeBias) / 3;
  }

  private calculateDepartmentPerformance(feedbacks: ClinicianFeedback[]) {
    const departments = Array.from(new Set(feedbacks.map(f => f.department)));

    return departments.map(department => {
      const deptFeedbacks = feedbacks.filter(f => f.department === department);
      return {
        department,
        accuracy: this.calculateAverage(deptFeedbacks.map(f => f.accuracy)),
        relevance: this.calculateAverage(deptFeedbacks.map(f => f.relevance)),
        overrideRate: deptFeedbacks.filter(f => f.override).length / deptFeedbacks.length,
      };
    });
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  private mapFeedbackDates(feedback: any): ClinicianFeedback {
    return {
      ...feedback,
      timestamp: new Date(feedback.timestamp),
    };
  }
} 