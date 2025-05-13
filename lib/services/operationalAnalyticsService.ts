import { supabase } from '@/lib/supabase/client';

export interface StaffProductivityMetrics {
  staffId: string;
  name: string;
  role: string;
  metrics: {
    patientsSeen: number;
    averageConsultationTime: number;
    followUpRate: number;
    patientSatisfaction: number;
    documentationCompleteness: number;
  };
  period: {
    start: string;
    end: string;
  };
}

export interface ResourceUtilization {
  resourceId: string;
  name: string;
  type: 'equipment' | 'room' | 'facility';
  metrics: {
    utilizationRate: number;
    downtime: number;
    maintenanceCosts: number;
    efficiency: number;
  };
  period: {
    start: string;
    end: string;
  };
}

export interface OperationalEfficiency {
  departmentId: string;
  name: string;
  metrics: {
    waitTime: number;
    throughput: number;
    costPerPatient: number;
    resourceEfficiency: number;
  };
  period: {
    start: string;
    end: string;
  };
}

export class OperationalAnalyticsService {
  async getStaffProductivityMetrics(
    startDate: string,
    endDate: string,
    departmentId?: string
  ): Promise<StaffProductivityMetrics[]> {
    const { data, error } = await supabase
      .from('staff_productivity_metrics')
      .select('*')
      .gte('period.start', startDate)
      .lte('period.end', endDate)
      .eq('department_id', departmentId || '');

    if (error) throw error;
    return data;
  }

  async getResourceUtilization(
    startDate: string,
    endDate: string,
    resourceType?: string
  ): Promise<ResourceUtilization[]> {
    const { data, error } = await supabase
      .from('resource_utilization')
      .select('*')
      .gte('period.start', startDate)
      .lte('period.end', endDate)
      .eq('type', resourceType || '');

    if (error) throw error;
    return data;
  }

  async getOperationalEfficiency(
    startDate: string,
    endDate: string,
    departmentId?: string
  ): Promise<OperationalEfficiency[]> {
    const { data, error } = await supabase
      .from('operational_efficiency')
      .select('*')
      .gte('period.start', startDate)
      .lte('period.end', endDate)
      .eq('department_id', departmentId || '');

    if (error) throw error;
    return data;
  }

  async updateStaffMetrics(
    staffId: string,
    metrics: Partial<StaffProductivityMetrics['metrics']>
  ): Promise<void> {
    const { error } = await supabase
      .from('staff_productivity_metrics')
      .update({ metrics })
      .eq('staff_id', staffId);

    if (error) throw error;
  }

  async updateResourceUtilization(
    resourceId: string,
    metrics: Partial<ResourceUtilization['metrics']>
  ): Promise<void> {
    const { error } = await supabase
      .from('resource_utilization')
      .update({ metrics })
      .eq('resource_id', resourceId);

    if (error) throw error;
  }

  async updateOperationalEfficiency(
    departmentId: string,
    metrics: Partial<OperationalEfficiency['metrics']>
  ): Promise<void> {
    const { error } = await supabase
      .from('operational_efficiency')
      .update({ metrics })
      .eq('department_id', departmentId);

    if (error) throw error;
  }
} 