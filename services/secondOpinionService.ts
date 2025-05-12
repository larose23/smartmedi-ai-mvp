import { createClient } from '@supabase/supabase-js';
import { TriageCase } from '../types/triage';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Specialist {
  id: string;
  name: string;
  specialty: string;
  email: string;
  phone?: string;
  availability: {
    weekdays: number[];
    weekends: number[];
  };
}

interface SecondOpinionRequest {
  id: string;
  case_id: string;
  requesting_staff_id: string;
  specialist_id?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reason: string;
  notes?: string;
}

interface Consultation {
  id: string;
  request_id: string;
  scheduled_time: string;
  duration_minutes: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
}

interface ConsultationFeedback {
  id: string;
  consultation_id: string;
  specialist_id: string;
  feedback_type: 'diagnosis' | 'treatment' | 'both';
  feedback: string;
  recommendations: string[];
}

class SecondOpinionService {
  // Get available specialists for a given specialty
  async getAvailableSpecialists(specialty: string): Promise<Specialist[]> {
    try {
      const { data, error } = await supabase
        .from('specialists')
        .select('*')
        .eq('specialty', specialty);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching specialists:', error);
      throw error;
    }
  }

  // Create a second opinion request
  async createRequest(
    caseId: string,
    staffId: string,
    priority: SecondOpinionRequest['priority'],
    reason: string,
    notes?: string
  ): Promise<SecondOpinionRequest> {
    try {
      const { data, error } = await supabase
        .from('second_opinion_requests')
        .insert({
          case_id: caseId,
          requesting_staff_id: staffId,
          status: 'pending',
          priority,
          reason,
          notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating second opinion request:', error);
      throw error;
    }
  }

  // Get all second opinion requests for a case with pagination
  async getCaseRequests(
    caseId: string,
    page: number = 1,
    limit: number = 5
  ): Promise<{ requests: SecondOpinionRequest[]; total: number }> {
    try {
      // Get total count
      const { count, error: countError } = await supabase
        .from('second_opinion_requests')
        .select('*', { count: 'exact', head: true })
        .eq('case_id', caseId);

      if (countError) throw countError;

      // Get paginated data
      const { data, error } = await supabase
        .from('second_opinion_requests')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;

      return {
        requests: data,
        total: count || 0,
      };
    } catch (error) {
      console.error('Error fetching case requests:', error);
      throw error;
    }
  }

  // Schedule a consultation
  async scheduleConsultation(
    requestId: string,
    specialistId: string,
    scheduledTime: string,
    durationMinutes: number = 30,
    notes?: string
  ): Promise<Consultation> {
    try {
      // Start a transaction
      const { data: consultation, error: consultationError } = await supabase
        .from('consultations')
        .insert({
          request_id: requestId,
          scheduled_time: scheduledTime,
          duration_minutes: durationMinutes,
          status: 'scheduled',
          notes,
        })
        .select()
        .single();

      if (consultationError) throw consultationError;

      // Update the request status
      const { error: requestError } = await supabase
        .from('second_opinion_requests')
        .update({
          status: 'accepted',
          specialist_id: specialistId,
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      return consultation;
    } catch (error) {
      console.error('Error scheduling consultation:', error);
      throw error;
    }
  }

  // Get consultation details
  async getConsultation(consultationId: string): Promise<Consultation> {
    try {
      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('id', consultationId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching consultation:', error);
      throw error;
    }
  }

  // Submit consultation feedback
  async submitFeedback(
    consultationId: string,
    specialistId: string,
    feedbackType: ConsultationFeedback['feedback_type'],
    feedback: string,
    recommendations: string[]
  ): Promise<ConsultationFeedback> {
    try {
      // Start a transaction
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('consultation_feedback')
        .insert({
          consultation_id: consultationId,
          specialist_id: specialistId,
          feedback_type: feedbackType,
          feedback,
          recommendations,
        })
        .select()
        .single();

      if (feedbackError) throw feedbackError;

      // Update consultation status
      const { error: consultationError } = await supabase
        .from('consultations')
        .update({ status: 'completed' })
        .eq('id', consultationId);

      if (consultationError) throw consultationError;

      // Update request status
      const { error: requestError } = await supabase
        .from('second_opinion_requests')
        .update({ status: 'completed' })
        .eq('id', (await this.getConsultation(consultationId)).request_id);

      if (requestError) throw requestError;

      return feedbackData;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  }

  // Get consultation feedback
  async getFeedback(consultationId: string): Promise<ConsultationFeedback> {
    try {
      const { data, error } = await supabase
        .from('consultation_feedback')
        .select('*')
        .eq('consultation_id', consultationId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching feedback:', error);
      throw error;
    }
  }

  // Get specialist availability for a given date
  async getSpecialistAvailability(
    specialistId: string,
    date: string
  ): Promise<{ available: boolean; slots: string[] }> {
    try {
      const { data: specialist, error } = await supabase
        .from('specialists')
        .select('availability')
        .eq('id', specialistId)
        .single();

      if (error) throw error;

      const dayOfWeek = new Date(date).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const availableHours = isWeekend ? specialist.availability.weekends : specialist.availability.weekdays;

      // Check existing consultations
      const { data: consultations } = await supabase
        .from('consultations')
        .select('scheduled_time')
        .eq('specialist_id', specialistId)
        .gte('scheduled_time', `${date}T00:00:00`)
        .lt('scheduled_time', `${date}T23:59:59`);

      const bookedSlots = new Set(
        consultations?.map(c => new Date(c.scheduled_time).getHours()) || []
      );

      const availableSlots = availableHours
        .filter(hour => !bookedSlots.has(hour))
        .map(hour => `${date}T${hour.toString().padStart(2, '0')}:00:00`);

      return {
        available: availableSlots.length > 0,
        slots: availableSlots,
      };
    } catch (error) {
      console.error('Error checking specialist availability:', error);
      throw error;
    }
  }
}

export const secondOpinionService = new SecondOpinionService(); 