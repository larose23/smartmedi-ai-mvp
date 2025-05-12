import { supabase } from '@/lib/supabase';
import { Appointment, Patient, Provider } from '@/types/scheduling';

interface WaitlistEntry {
  id: string;
  appointment_id: string;
  provider_id: string;
  slot_time: string;
  status: 'pending' | 'offered' | 'accepted' | 'declined';
  patient_id: string;
  priority: number;
  created_at: string;
}

export class WaitlistService {
  static async addToWaitlist(
    appointmentId: string,
    patientId: string,
    priority: number = 0
  ): Promise<void> {
    try {
      // Get appointment details
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (appointmentError) throw appointmentError;

      // Add to waitlist
      const { error: waitlistError } = await supabase
        .from('waitlist')
        .insert({
          appointment_id: appointmentId,
          provider_id: appointment.provider_id,
          slot_time: appointment.start_time,
          patient_id: patientId,
          priority,
          status: 'pending'
        });

      if (waitlistError) throw waitlistError;
    } catch (error) {
      console.error('Error adding to waitlist:', error);
      throw error;
    }
  }

  static async getWaitlistForSlot(slotTime: string, providerId: string): Promise<WaitlistEntry[]> {
    try {
      const { data, error } = await supabase
        .from('waitlist')
        .select('*')
        .eq('slot_time', slotTime)
        .eq('provider_id', providerId)
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting waitlist:', error);
      throw error;
    }
  }

  static async offerSlot(waitlistEntryId: string): Promise<void> {
    try {
      // Update waitlist entry status
      const { error: updateError } = await supabase
        .from('waitlist')
        .update({ status: 'offered' })
        .eq('id', waitlistEntryId);

      if (updateError) throw updateError;

      // Get waitlist entry details
      const { data: entry, error: entryError } = await supabase
        .from('waitlist')
        .select('*')
        .eq('id', waitlistEntryId)
        .single();

      if (entryError) throw entryError;

      // Get patient details
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', entry.patient_id)
        .single();

      if (patientError) throw patientError;

      // Send notification to patient
      await this.sendSlotOfferNotification(patient, entry);
    } catch (error) {
      console.error('Error offering slot:', error);
      throw error;
    }
  }

  static async handleSlotResponse(waitlistEntryId: string, accepted: boolean): Promise<void> {
    try {
      const { data: entry, error: entryError } = await supabase
        .from('waitlist')
        .select('*')
        .eq('id', waitlistEntryId)
        .single();

      if (entryError) throw entryError;

      if (accepted) {
        // Update appointment with new patient
        const { error: appointmentError } = await supabase
          .from('appointments')
          .update({ patient_id: entry.patient_id })
          .eq('id', entry.appointment_id);

        if (appointmentError) throw appointmentError;

        // Update waitlist entry
        const { error: updateError } = await supabase
          .from('waitlist')
          .update({ status: 'accepted' })
          .eq('id', waitlistEntryId);

        if (updateError) throw updateError;

        // Notify other waitlisted patients
        await this.notifyOtherWaitlistedPatients(entry);
      } else {
        // Update waitlist entry
        const { error: updateError } = await supabase
          .from('waitlist')
          .update({ status: 'declined' })
          .eq('id', waitlistEntryId);

        if (updateError) throw updateError;

        // Offer slot to next patient
        await this.offerNextSlot(entry.slot_time, entry.provider_id);
      }
    } catch (error) {
      console.error('Error handling slot response:', error);
      throw error;
    }
  }

  private static async sendSlotOfferNotification(patient: Patient, entry: WaitlistEntry): Promise<void> {
    // Implementation would use notification service
    console.log(`Sending slot offer notification to patient ${patient.id}`);
  }

  private static async notifyOtherWaitlistedPatients(entry: WaitlistEntry): Promise<void> {
    try {
      // Get other waitlisted patients
      const { data: otherEntries, error: entriesError } = await supabase
        .from('waitlist')
        .select('*')
        .eq('slot_time', entry.slot_time)
        .eq('provider_id', entry.provider_id)
        .eq('status', 'pending')
        .neq('id', entry.id);

      if (entriesError) throw entriesError;

      // Notify each patient
      for (const otherEntry of otherEntries || []) {
        const { data: patient, error: patientError } = await supabase
          .from('patients')
          .select('*')
          .eq('id', otherEntry.patient_id)
          .single();

        if (patientError) throw patientError;

        // Send notification
        await this.sendSlotUnavailableNotification(patient, otherEntry);
      }
    } catch (error) {
      console.error('Error notifying other waitlisted patients:', error);
      throw error;
    }
  }

  private static async offerNextSlot(slotTime: string, providerId: string): Promise<void> {
    try {
      // Get next waitlist entry
      const { data: nextEntry, error: entryError } = await supabase
        .from('waitlist')
        .select('*')
        .eq('slot_time', slotTime)
        .eq('provider_id', providerId)
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (entryError) throw entryError;

      if (nextEntry) {
        await this.offerSlot(nextEntry.id);
      }
    } catch (error) {
      console.error('Error offering next slot:', error);
      throw error;
    }
  }

  private static async sendSlotUnavailableNotification(patient: Patient, entry: WaitlistEntry): Promise<void> {
    // Implementation would use notification service
    console.log(`Sending slot unavailable notification to patient ${patient.id}`);
  }

  static async calculatePriority(patientId: string): Promise<number> {
    try {
      // Get patient's appointment history
      const { data: history, error: historyError } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .order('start_time', { ascending: false })
        .limit(10);

      if (historyError) throw historyError;

      let priority = 0;

      // Factor 1: Number of previous no-shows
      const noShows = history?.filter(a => a.status === 'no-show').length || 0;
      priority -= noShows * 2;

      // Factor 2: Number of completed appointments
      const completed = history?.filter(a => a.status === 'completed').length || 0;
      priority += completed;

      // Factor 3: Time since last appointment
      if (history && history.length > 0) {
        const lastAppointment = new Date(history[0].start_time);
        const daysSinceLastAppointment = Math.floor(
          (new Date().getTime() - lastAppointment.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceLastAppointment > 180) {
          priority += 2; // Higher priority for patients who haven't been seen in a while
        }
      }

      return priority;
    } catch (error) {
      console.error('Error calculating priority:', error);
      throw error;
    }
  }

  static async handleAppointmentStatusChange(
    appointmentId: string,
    newStatus: string
  ): Promise<void> {
    try {
      // Get appointment details
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (appointmentError) throw appointmentError;

      // Handle different status changes
      switch (newStatus) {
        case 'cancelled':
          // Offer slot to waitlisted patients
          await this.offerNextSlot(appointment.start_time, appointment.provider_id);
          break;

        case 'no-show':
          // Update patient's priority in waitlist
          const { data: waitlistEntries, error: waitlistError } = await supabase
            .from('waitlist')
            .select('*')
            .eq('patient_id', appointment.patient_id)
            .eq('status', 'pending');

          if (waitlistError) throw waitlistError;

          // Update priority for all pending entries
          for (const entry of waitlistEntries || []) {
            const newPriority = await this.calculatePriority(appointment.patient_id);
            const { error: updateError } = await supabase
              .from('waitlist')
              .update({ priority: newPriority })
              .eq('id', entry.id);

            if (updateError) throw updateError;
          }
          break;

        case 'completed':
          // Remove patient from waitlist for this provider
          const { error: deleteError } = await supabase
            .from('waitlist')
            .delete()
            .eq('patient_id', appointment.patient_id)
            .eq('provider_id', appointment.provider_id)
            .eq('status', 'pending');

          if (deleteError) throw deleteError;
          break;
      }
    } catch (error) {
      console.error('Error handling appointment status change:', error);
      throw error;
    }
  }
} 