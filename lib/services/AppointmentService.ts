import { SchedulingAlgorithm } from '../scheduling/SchedulingAlgorithm';
import {
  Appointment,
  Patient,
  Provider,
  TimeSlot,
  SchedulingPreferences,
  SchedulingResult
} from '@/types/scheduling';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

export class AppointmentService {
  /**
   * Find optimal appointment slots based on patient preferences and urgency
   */
  public static async findOptimalSlots(
    patient: Patient,
    preferences: SchedulingPreferences
  ): Promise<SchedulingResult> {
    try {
      // Fetch available providers
      const { data: providers, error: providersError } = await supabase
        .from('providers')
        .select('*')
        .in('specialties', preferences.preferredSpecialties || []);

      if (providersError) throw providersError;

      // Fetch available time slots
      const { data: slots, error: slotsError } = await supabase
        .from('time_slots')
        .select('*')
        .eq('status', 'available')
        .gte('start_time', new Date().toISOString());

      if (slotsError) throw slotsError;

      // Get optimal slots using the scheduling algorithm
      const optimalSlots = await SchedulingAlgorithm.findOptimalSlots(
        patient,
        preferences,
        providers,
        slots
      );

      // Get provider recommendations
      const recommendedProviders = await SchedulingAlgorithm.getProviderRecommendations(
        patient,
        preferences,
        providers
      );

      // Calculate average wait time
      const waitTime = optimalSlots.length
        ? SchedulingAlgorithm.calculateSlotWaitTime(optimalSlots[0])
        : Infinity;

      return {
        recommendedSlots: optimalSlots,
        recommendedProviders,
        waitTime,
        urgencyLevel: preferences.urgency,
        alternatives: optimalSlots.length > 1
          ? {
              slots: optimalSlots.slice(1),
              providers: recommendedProviders.slice(1)
            }
          : undefined
      };
    } catch (error) {
      console.error('Error finding optimal slots:', error);
      toast.error('Failed to find available appointment slots');
      throw error;
    }
  }

  /**
   * Book an appointment
   */
  public static async bookAppointment(
    patientId: string,
    timeSlotId: string,
    type: 'regular' | 'urgent' | 'follow-up',
    reason: string,
    notes?: string
  ): Promise<Appointment> {
    try {
      // Start a transaction
      const { data: timeSlot, error: slotError } = await supabase
        .from('time_slots')
        .select('*')
        .eq('id', timeSlotId)
        .single();

      if (slotError) throw slotError;

      if (timeSlot.status !== 'available') {
        throw new Error('Time slot is no longer available');
      }

      // Create the appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          patient_id: patientId,
          provider_id: timeSlot.provider_id,
          time_slot_id: timeSlotId,
          type,
          status: 'scheduled',
          reason,
          notes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Update the time slot status
      const { error: updateError } = await supabase
        .from('time_slots')
        .update({ status: 'booked', patient_id: patientId })
        .eq('id', timeSlotId);

      if (updateError) throw updateError;

      // Send confirmation notification
      await this.sendAppointmentConfirmation(appointment);

      return appointment;
    } catch (error) {
      console.error('Error booking appointment:', error);
      toast.error('Failed to book appointment');
      throw error;
    }
  }

  /**
   * Cancel an appointment
   */
  public static async cancelAppointment(
    appointmentId: string,
    reason: string
  ): Promise<void> {
    try {
      // Start a transaction
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (appointmentError) throw appointmentError;

      // Update appointment status
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          notes: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      // Update time slot status
      const { error: slotError } = await supabase
        .from('time_slots')
        .update({
          status: 'available',
          patient_id: null
        })
        .eq('id', appointment.time_slot_id);

      if (slotError) throw slotError;

      // Send cancellation notification
      await this.sendAppointmentCancellation(appointment, reason);
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Failed to cancel appointment');
      throw error;
    }
  }

  /**
   * Send appointment confirmation notification
   */
  private static async sendAppointmentConfirmation(
    appointment: Appointment
  ): Promise<void> {
    try {
      const { data: patient } = await supabase
        .from('patients')
        .select('contact_info')
        .eq('id', appointment.patientId)
        .single();

      const { data: provider } = await supabase
        .from('providers')
        .select('name')
        .eq('id', appointment.providerId)
        .single();

      // Send email notification
      await supabase.functions.invoke('send-email', {
        body: {
          to: patient.contact_info.email,
          subject: 'Appointment Confirmation',
          template: 'appointment-confirmation',
          data: {
            appointment,
            provider: provider.name,
            patient: patient.name
          }
        }
      });

      // Send SMS notification if preferred
      if (patient.contact_info.preferredContactMethod === 'sms') {
        await supabase.functions.invoke('send-sms', {
          body: {
            to: patient.contact_info.phone,
            message: `Your appointment with ${provider.name} has been confirmed for ${new Date(
              appointment.timeSlot.startTime
            ).toLocaleString()}`
          }
        });
      }
    } catch (error) {
      console.error('Error sending confirmation:', error);
      // Don't throw the error as this is not critical
    }
  }

  /**
   * Send appointment cancellation notification
   */
  private static async sendAppointmentCancellation(
    appointment: Appointment,
    reason: string
  ): Promise<void> {
    try {
      const { data: patient } = await supabase
        .from('patients')
        .select('contact_info')
        .eq('id', appointment.patientId)
        .single();

      const { data: provider } = await supabase
        .from('providers')
        .select('name')
        .eq('id', appointment.providerId)
        .single();

      // Send email notification
      await supabase.functions.invoke('send-email', {
        body: {
          to: patient.contact_info.email,
          subject: 'Appointment Cancellation',
          template: 'appointment-cancellation',
          data: {
            appointment,
            provider: provider.name,
            patient: patient.name,
            reason
          }
        }
      });

      // Send SMS notification if preferred
      if (patient.contact_info.preferredContactMethod === 'sms') {
        await supabase.functions.invoke('send-sms', {
          body: {
            to: patient.contact_info.phone,
            message: `Your appointment with ${provider.name} has been cancelled. Reason: ${reason}`
          }
        });
      }
    } catch (error) {
      console.error('Error sending cancellation:', error);
      // Don't throw the error as this is not critical
    }
  }
} 