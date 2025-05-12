import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import twilio from 'twilio';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Initialize Google Calendar API
const calendar = google.calendar('v3');
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

export interface TimeSlot {
  start: Date;
  end: Date;
  provider_id: string;
  provider_name: string;
  department: string;
  is_urgent: boolean;
  urgency_score?: number;
}

export interface Appointment {
  id: string;
  patient_id: string;
  provider_id: string;
  start_time: Date;
  end_time: Date;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  department: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface NoShowPrediction {
  probability: number;
  risk_factors: {
    factor: string;
    impact: number;
  }[];
  recommendations: string[];
}

export class SchedulerService {
  private static instance: SchedulerService;

  private constructor() {}

  static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  async fetchProviderAvailability(
    providerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TimeSlot[]> {
    try {
      // Fetch provider's calendar from Google Calendar
      const calendarId = await this.getProviderCalendarId(providerId);
      const response = await calendar.events.list({
        auth,
        calendarId,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      // Process calendar events to find available slots
      const busySlots = response.data.items || [];
      const availableSlots = this.calculateAvailableSlots(busySlots, startDate, endDate);

      // Add provider information to slots
      const provider = await this.getProviderInfo(providerId);
      return availableSlots.map(slot => ({
        ...slot,
        provider_id: providerId,
        provider_name: provider.name,
        department: provider.department,
      }));
    } catch (error) {
      console.error('Error fetching provider availability:', error);
      throw error;
    }
  }

  private async getProviderCalendarId(providerId: string): Promise<string> {
    const { data, error } = await supabase
      .from('providers')
      .select('calendar_id')
      .eq('id', providerId)
      .single();

    if (error) throw error;
    return data.calendar_id;
  }

  private async getProviderInfo(providerId: string) {
    const { data, error } = await supabase
      .from('providers')
      .select('name, department')
      .eq('id', providerId)
      .single();

    if (error) throw error;
    return data;
  }

  private calculateAvailableSlots(
    busySlots: any[],
    startDate: Date,
    endDate: Date
  ): TimeSlot[] {
    // Implementation of slot calculation logic
    // This would consider working hours, breaks, and existing appointments
    // For now, returning a simplified version
    return [];
  }

  async suggestUrgentSlots(
    department: string,
    urgencyScore: number
  ): Promise<TimeSlot[]> {
    try {
      // Fetch all providers in the department
      const { data: providers, error } = await supabase
        .from('providers')
        .select('id')
        .eq('department', department);

      if (error) throw error;

      // Get availability for all providers
      const now = new Date();
      const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next 24 hours
      const allSlots = await Promise.all(
        providers.map(provider =>
          this.fetchProviderAvailability(provider.id, now, endDate)
        )
      );

      // Filter and rank slots based on urgency
      const urgentSlots = allSlots
        .flat()
        .map(slot => ({
          ...slot,
          urgency_score: this.calculateUrgencyScore(slot, urgencyScore),
        }))
        .filter(slot => slot.urgency_score > 0.7)
        .sort((a, b) => b.urgency_score! - a.urgency_score!);

      return urgentSlots;
    } catch (error) {
      console.error('Error suggesting urgent slots:', error);
      throw error;
    }
  }

  private calculateUrgencyScore(slot: TimeSlot, patientUrgencyScore: number): number {
    // Implementation of urgency scoring logic
    // This would consider factors like:
    // - Time until appointment
    // - Provider's expertise
    // - Patient's urgency score
    // - Department capacity
    return 0;
  }

  async bookAppointment(
    patientId: string,
    slot: TimeSlot,
    notes?: string
  ): Promise<Appointment> {
    try {
      // Start a transaction
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          patient_id: patientId,
          provider_id: slot.provider_id,
          start_time: slot.start,
          end_time: slot.end,
          status: 'scheduled',
          department: slot.department,
          notes,
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Add to Google Calendar
      await calendar.events.insert({
        auth,
        calendarId: await this.getProviderCalendarId(slot.provider_id),
        requestBody: {
          summary: `Appointment with Patient ${patientId}`,
          start: { dateTime: slot.start.toISOString() },
          end: { dateTime: slot.end.toISOString() },
          description: notes,
        },
      });

      // Archive check-in record
      await this.archiveCheckIn(patientId, appointment.id);

      // Send confirmation SMS
      await this.sendAppointmentConfirmation(patientId, appointment);

      return appointment;
    } catch (error) {
      console.error('Error booking appointment:', error);
      throw error;
    }
  }

  private async archiveCheckIn(patientId: string, appointmentId: string) {
    try {
      // Get check-in record
      const { data: checkIn, error: checkInError } = await supabase
        .from('check_ins')
        .select('*')
        .eq('patient_id', patientId)
        .single();

      if (checkInError) throw checkInError;

      // Archive the record
      const { error: archiveError } = await supabase
        .from('patients_archive')
        .upsert({
          ...checkIn,
          appointment_id: appointmentId,
          archived_at: new Date().toISOString(),
        });

      if (archiveError) throw archiveError;

      // Delete from check-ins
      const { error: deleteError } = await supabase
        .from('check_ins')
        .delete()
        .eq('patient_id', patientId);

      if (deleteError) throw deleteError;
    } catch (error) {
      console.error('Error archiving check-in:', error);
      throw error;
    }
  }

  private async sendAppointmentConfirmation(
    patientId: string,
    appointment: Appointment
  ) {
    try {
      // Get patient's phone number
      const { data: patient, error } = await supabase
        .from('patients')
        .select('phone_number')
        .eq('id', patientId)
        .single();

      if (error) throw error;

      // Send SMS
      await twilioClient.messages.create({
        body: `Your appointment has been scheduled for ${new Date(
          appointment.start_time
        ).toLocaleString()}. Please arrive 15 minutes early.`,
        to: patient.phone_number,
        from: process.env.TWILIO_PHONE_NUMBER,
      });
    } catch (error) {
      console.error('Error sending appointment confirmation:', error);
      // Don't throw the error as SMS failure shouldn't prevent appointment booking
    }
  }

  async predictNoShow(appointmentId: string): Promise<NoShowPrediction> {
    try {
      // Get appointment and patient data
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select('*, patients(*)')
        .eq('id', appointmentId)
        .single();

      if (appointmentError) throw appointmentError;

      // Get historical no-show data
      const { data: history, error: historyError } = await supabase
        .from('appointments')
        .select('status')
        .eq('patient_id', appointment.patient_id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (historyError) throw historyError;

      // Calculate no-show probability using logistic regression
      const probability = this.calculateNoShowProbability(appointment, history);

      // Generate risk factors and recommendations
      const riskFactors = this.identifyRiskFactors(appointment, history);
      const recommendations = this.generateRecommendations(probability, riskFactors);

      return {
        probability,
        risk_factors: riskFactors,
        recommendations,
      };
    } catch (error) {
      console.error('Error predicting no-show:', error);
      throw error;
    }
  }

  private calculateNoShowProbability(
    appointment: any,
    history: any[]
  ): number {
    // Implementation of logistic regression model
    // This would consider factors like:
    // - Historical no-show rate
    // - Time of day
    // - Day of week
    // - Distance to facility
    // - Previous appointment history
    return 0;
  }

  private identifyRiskFactors(
    appointment: any,
    history: any[]
  ): { factor: string; impact: number }[] {
    // Implementation of risk factor identification
    return [];
  }

  private generateRecommendations(
    probability: number,
    riskFactors: { factor: string; impact: number }[]
  ): string[] {
    // Implementation of recommendation generation
    return [];
  }

  async sendReminder(appointmentId: string) {
    try {
      const { data: appointment, error } = await supabase
        .from('appointments')
        .select('*, patients(phone_number)')
        .eq('id', appointmentId)
        .single();

      if (error) throw error;

      // Send reminder SMS
      await twilioClient.messages.create({
        body: `Reminder: You have an appointment tomorrow at ${new Date(
          appointment.start_time
        ).toLocaleString()}. Please confirm your attendance by replying YES.`,
        to: appointment.patients.phone_number,
        from: process.env.TWILIO_PHONE_NUMBER,
      });
    } catch (error) {
      console.error('Error sending reminder:', error);
      throw error;
    }
  }
} 