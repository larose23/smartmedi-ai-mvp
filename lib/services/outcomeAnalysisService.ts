import { supabase } from '@/lib/supabase/client';

export interface TreatmentOutcome {
  patientId: string;
  treatmentId: string;
  treatmentName: string;
  startDate: Date;
  endDate: Date;
  outcome: number;
  sideEffects: string[];
  followUpData: {
    date: Date;
    metrics: Record<string, number>;
  }[];
}

export interface ComparativeStudy {
  studyId: string;
  treatmentA: string;
  treatmentB: string;
  metrics: {
    effectiveness: number;
    cost: number;
    sideEffects: number;
    patientSatisfaction: number;
  };
  patientCount: number;
  duration: number;
}

export interface PredictiveModel {
  modelId: string;
  accuracy: number;
  features: string[];
  predictions: {
    patientId: string;
    predictedOutcome: number;
    confidence: number;
    actualOutcome?: number;
  }[];
}

export class OutcomeAnalysisService {
  async getTreatmentOutcomes(patientId?: string): Promise<TreatmentOutcome[]> {
    try {
      let query = supabase
        .from('treatment_outcomes')
        .select('*');

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map((item: any) => ({
        patientId: item.patient_id,
        treatmentId: item.treatment_id,
        treatmentName: item.treatment_name,
        startDate: new Date(item.start_date),
        endDate: new Date(item.end_date),
        outcome: item.outcome,
        sideEffects: item.side_effects,
        followUpData: item.follow_up_data.map((fud: any) => ({
          date: new Date(fud.date),
          metrics: fud.metrics,
        })),
      }));
    } catch (error) {
      console.error('Error fetching treatment outcomes:', error);
      throw error;
    }
  }

  async getComparativeStudies(treatmentIds?: string[]): Promise<ComparativeStudy[]> {
    try {
      let query = supabase
        .from('comparative_studies')
        .select('*');

      if (treatmentIds && treatmentIds.length > 0) {
        query = query.in('treatment_ids', treatmentIds);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map((item: any) => ({
        studyId: item.study_id,
        treatmentA: item.treatment_a,
        treatmentB: item.treatment_b,
        metrics: {
          effectiveness: item.metrics.effectiveness,
          cost: item.metrics.cost,
          sideEffects: item.metrics.side_effects,
          patientSatisfaction: item.metrics.patient_satisfaction,
        },
        patientCount: item.patient_count,
        duration: item.duration,
      }));
    } catch (error) {
      console.error('Error fetching comparative studies:', error);
      throw error;
    }
  }

  async getPredictiveModels(modelId?: string): Promise<PredictiveModel[]> {
    try {
      let query = supabase
        .from('predictive_models')
        .select('*');

      if (modelId) {
        query = query.eq('model_id', modelId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map((item: any) => ({
        modelId: item.model_id,
        accuracy: item.accuracy,
        features: item.features,
        predictions: item.predictions.map((pred: any) => ({
          patientId: pred.patient_id,
          predictedOutcome: pred.predicted_outcome,
          confidence: pred.confidence,
          actualOutcome: pred.actual_outcome,
        })),
      }));
    } catch (error) {
      console.error('Error fetching predictive models:', error);
      throw error;
    }
  }

  async createTreatmentOutcome(outcome: Omit<TreatmentOutcome, 'patientId'>): Promise<TreatmentOutcome> {
    try {
      const { data, error } = await supabase
        .from('treatment_outcomes')
        .insert({
          treatment_id: outcome.treatmentId,
          treatment_name: outcome.treatmentName,
          start_date: outcome.startDate.toISOString(),
          end_date: outcome.endDate.toISOString(),
          outcome: outcome.outcome,
          side_effects: outcome.sideEffects,
          follow_up_data: outcome.followUpData.map(fud => ({
            date: fud.date.toISOString(),
            metrics: fud.metrics,
          })),
        })
        .select()
        .single();

      if (error) throw error;

      return {
        patientId: data.patient_id,
        treatmentId: data.treatment_id,
        treatmentName: data.treatment_name,
        startDate: new Date(data.start_date),
        endDate: new Date(data.end_date),
        outcome: data.outcome,
        sideEffects: data.side_effects,
        followUpData: data.follow_up_data.map((fud: any) => ({
          date: new Date(fud.date),
          metrics: fud.metrics,
        })),
      };
    } catch (error) {
      console.error('Error creating treatment outcome:', error);
      throw error;
    }
  }

  async updateTreatmentOutcome(patientId: string, outcome: Partial<TreatmentOutcome>): Promise<TreatmentOutcome> {
    try {
      const { data, error } = await supabase
        .from('treatment_outcomes')
        .update({
          treatment_name: outcome.treatmentName,
          start_date: outcome.startDate?.toISOString(),
          end_date: outcome.endDate?.toISOString(),
          outcome: outcome.outcome,
          side_effects: outcome.sideEffects,
          follow_up_data: outcome.followUpData?.map(fud => ({
            date: fud.date.toISOString(),
            metrics: fud.metrics,
          })),
        })
        .eq('patient_id', patientId)
        .select()
        .single();

      if (error) throw error;

      return {
        patientId: data.patient_id,
        treatmentId: data.treatment_id,
        treatmentName: data.treatment_name,
        startDate: new Date(data.start_date),
        endDate: new Date(data.end_date),
        outcome: data.outcome,
        sideEffects: data.side_effects,
        followUpData: data.follow_up_data.map((fud: any) => ({
          date: new Date(fud.date),
          metrics: fud.metrics,
        })),
      };
    } catch (error) {
      console.error('Error updating treatment outcome:', error);
      throw error;
    }
  }

  async deleteTreatmentOutcome(patientId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('treatment_outcomes')
        .delete()
        .eq('patient_id', patientId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting treatment outcome:', error);
      throw error;
    }
  }
} 