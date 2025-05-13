import { supabase } from '@/lib/supabase/client';

export interface PatientJourneyCost {
  id: string;
  patientId: string;
  journeyId: string;
  department: string;
  serviceType: string;
  cost: number;
  date: string;
  category: 'direct' | 'indirect' | 'overhead';
  notes?: string;
}

export interface ReimbursementSuggestion {
  id: string;
  patientId: string;
  serviceId: string;
  currentCode: string;
  suggestedCode: string;
  potentialIncrease: number;
  confidence: number;
  reasoning: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface RevenueCycleMetric {
  id: string;
  department: string;
  period: string;
  totalBilled: number;
  totalCollected: number;
  daysInAR: number;
  denialRate: number;
  cleanClaimRate: number;
  collectionRate: number;
}

export class FinancialAnalyticsService {
  async getPatientJourneyCosts(
    patientId?: string,
    startDate?: string,
    endDate?: string,
    department?: string
  ): Promise<PatientJourneyCost[]> {
    let query = supabase
      .from('patient_journey_costs')
      .select('*');

    if (patientId) {
      query = query.eq('patientId', patientId);
    }
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }
    if (department) {
      query = query.eq('department', department);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error fetching patient journey costs: ${error.message}`);
    }

    return data || [];
  }

  async getReimbursementSuggestions(
    patientId?: string,
    status?: 'pending' | 'approved' | 'rejected'
  ): Promise<ReimbursementSuggestion[]> {
    let query = supabase
      .from('reimbursement_suggestions')
      .select('*');

    if (patientId) {
      query = query.eq('patientId', patientId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error fetching reimbursement suggestions: ${error.message}`);
    }

    return data || [];
  }

  async getRevenueCycleMetrics(
    department?: string,
    period?: string
  ): Promise<RevenueCycleMetric[]> {
    let query = supabase
      .from('revenue_cycle_metrics')
      .select('*');

    if (department) {
      query = query.eq('department', department);
    }
    if (period) {
      query = query.eq('period', period);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error fetching revenue cycle metrics: ${error.message}`);
    }

    return data || [];
  }

  async updateReimbursementSuggestion(
    id: string,
    status: 'approved' | 'rejected'
  ): Promise<void> {
    const { error } = await supabase
      .from('reimbursement_suggestions')
      .update({ status })
      .eq('id', id);

    if (error) {
      throw new Error(`Error updating reimbursement suggestion: ${error.message}`);
    }
  }

  async addPatientJourneyCost(cost: Omit<PatientJourneyCost, 'id'>): Promise<PatientJourneyCost> {
    const { data, error } = await supabase
      .from('patient_journey_costs')
      .insert([cost])
      .select()
      .single();

    if (error) {
      throw new Error(`Error adding patient journey cost: ${error.message}`);
    }

    return data;
  }

  async updateRevenueCycleMetric(
    id: string,
    metrics: Partial<RevenueCycleMetric>
  ): Promise<void> {
    const { error } = await supabase
      .from('revenue_cycle_metrics')
      .update(metrics)
      .eq('id', id);

    if (error) {
      throw new Error(`Error updating revenue cycle metric: ${error.message}`);
    }
  }
} 