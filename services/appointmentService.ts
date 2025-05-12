import { createClient } from '@supabase/supabase-js';
import { RealtimeChannel } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface Appointment {
  id: string;
  patient_id: string;
  provider_id: string;
  start_time: Date;
  end_time: Date;
  status: 'unseen' | 'scheduled' | 'seen' | 'archived';
  department: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  triage_context?: {
    urgency_score: number;
    risk_factors: string[];
    recommendations: string[];
  };
}

export class AppointmentService {
  private static instance: AppointmentService;
  private realtimeChannel: RealtimeChannel | null = null;

  private constructor() {
    this.initializeRealtimeSubscription();
  }

  static getInstance(): AppointmentService {
    if (!AppointmentService.instance) {
      AppointmentService.instance = new AppointmentService();
    }
    return AppointmentService.instance;
  }

  private initializeRealtimeSubscription() {
    this.realtimeChannel = supabase
      .channel('appointments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        (payload) => {
          // Handle real-time updates
          this.handleRealtimeUpdate(payload);
        }
      )
      .subscribe();
  }

  private handleRealtimeUpdate(payload: any) {
    // Emit events for UI updates
    const event = new CustomEvent('appointment-update', {
      detail: payload,
    });
    window.dispatchEvent(event);
  }

  async fetchAppointments(
    filters: {
      status?: Appointment['status'];
      department?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<Appointment[]> {
    try {
      let query = supabase.from('appointments').select('*');

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.department) {
        query = query.eq('department', filters.department);
      }
      if (filters.startDate) {
        query = query.gte('start_time', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte('end_time', filters.endDate.toISOString());
      }

      const { data, error } = await query.order('start_time', { ascending: true });

      if (error) throw error;
      return data.map(this.mapAppointmentDates);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      throw error;
    }
  }

  async updateAppointmentStatus(
    appointmentId: string,
    newStatus: Appointment['status']
  ): Promise<Appointment> {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) throw error;
      return this.mapAppointmentDates(data);
    } catch (error) {
      console.error('Error updating appointment status:', error);
      throw error;
    }
  }

  async archiveAppointment(appointmentId: string): Promise<Appointment> {
    try {
      // Start a transaction
      const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (fetchError) throw fetchError;

      // Archive the appointment
      const { data: archived, error: archiveError } = await supabase
        .from('appointments_archive')
        .insert({
          ...appointment,
          archived_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (archiveError) throw archiveError;

      // Update the original appointment status
      const { data: updated, error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', appointmentId)
        .select()
        .single();

      if (updateError) throw updateError;

      return this.mapAppointmentDates(updated);
    } catch (error) {
      console.error('Error archiving appointment:', error);
      throw error;
    }
  }

  private mapAppointmentDates(appointment: any): Appointment {
    return {
      ...appointment,
      start_time: new Date(appointment.start_time),
      end_time: new Date(appointment.end_time),
      created_at: new Date(appointment.created_at),
      updated_at: new Date(appointment.updated_at),
    };
  }

  cleanup() {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }
  }
} 