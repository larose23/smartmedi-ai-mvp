import { supabase } from '@/lib/supabase';
import { Appointment, Patient } from '@/types/scheduling';

interface NoShowPrediction {
  probability: number;
  riskLevel: 'low' | 'medium' | 'high';
  factors: string[];
}

interface NoShowFactors {
  previousNoShows: number;
  appointmentTime: string;
  dayOfWeek: number;
  weatherCondition?: string;
  distanceToClinic: number;
  appointmentType: string;
  lastVisitDate?: string;
  reminderResponse?: boolean;
}

export class NoShowAnalysis {
  private static readonly RISK_THRESHOLDS = {
    low: 0.3,
    medium: 0.6
  };

  private static readonly FACTOR_WEIGHTS = {
    previousNoShows: 0.3,
    appointmentTime: 0.15,
    dayOfWeek: 0.1,
    weatherCondition: 0.05,
    distanceToClinic: 0.1,
    appointmentType: 0.1,
    lastVisitDate: 0.1,
    reminderResponse: 0.1
  };

  static async predictNoShow(appointment: Appointment, patient: Patient): Promise<NoShowPrediction> {
    try {
      // Fetch historical data
      const { data: history, error: historyError } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patient.id)
        .order('start_time', { ascending: false })
        .limit(10);

      if (historyError) throw historyError;

      // Calculate factors
      const factors = await this.calculateFactors(appointment, patient, history || []);

      // Calculate probability
      const probability = this.calculateProbability(factors);

      // Determine risk level
      const riskLevel = this.determineRiskLevel(probability);

      // Identify contributing factors
      const contributingFactors = this.identifyContributingFactors(factors);

      return {
        probability,
        riskLevel,
        factors: contributingFactors
      };
    } catch (error) {
      console.error('Error predicting no-show:', error);
      throw error;
    }
  }

  private static async calculateFactors(
    appointment: Appointment,
    patient: Patient,
    history: Appointment[]
  ): Promise<NoShowFactors> {
    const previousNoShows = history.filter(a => a.status === 'no-show').length;
    const appointmentDate = new Date(appointment.start_time);
    const lastVisit = history.find(a => a.status === 'completed');

    // Calculate distance to clinic (mock implementation)
    const distanceToClinic = await this.calculateDistance(patient.address, appointment.location);

    // Get weather forecast (mock implementation)
    const weatherCondition = await this.getWeatherForecast(appointmentDate);

    return {
      previousNoShows,
      appointmentTime: appointmentDate.toLocaleTimeString(),
      dayOfWeek: appointmentDate.getDay(),
      weatherCondition,
      distanceToClinic,
      appointmentType: appointment.type,
      lastVisitDate: lastVisit?.start_time,
      reminderResponse: false // Will be updated when reminder is sent
    };
  }

  private static calculateProbability(factors: NoShowFactors): number {
    let probability = 0;

    // Previous no-shows
    probability += (factors.previousNoShows * 0.1) * this.FACTOR_WEIGHTS.previousNoShows;

    // Appointment time (higher risk for early morning and late afternoon)
    const hour = new Date(`2000-01-01T${factors.appointmentTime}`).getHours();
    const timeRisk = hour < 9 || hour > 16 ? 0.8 : 0.3;
    probability += timeRisk * this.FACTOR_WEIGHTS.appointmentTime;

    // Day of week (higher risk for Monday and Friday)
    const dayRisk = factors.dayOfWeek === 1 || factors.dayOfWeek === 5 ? 0.7 : 0.3;
    probability += dayRisk * this.FACTOR_WEIGHTS.dayOfWeek;

    // Weather condition
    if (factors.weatherCondition === 'rain' || factors.weatherCondition === 'snow') {
      probability += 0.6 * this.FACTOR_WEIGHTS.weatherCondition;
    }

    // Distance to clinic
    const distanceRisk = factors.distanceToClinic > 20 ? 0.7 : 0.3;
    probability += distanceRisk * this.FACTOR_WEIGHTS.distanceToClinic;

    // Appointment type
    const typeRisk = factors.appointmentType === 'follow-up' ? 0.4 : 0.6;
    probability += typeRisk * this.FACTOR_WEIGHTS.appointmentType;

    // Last visit date
    if (factors.lastVisitDate) {
      const daysSinceLastVisit = Math.floor(
        (new Date().getTime() - new Date(factors.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      const recencyRisk = daysSinceLastVisit > 180 ? 0.7 : 0.3;
      probability += recencyRisk * this.FACTOR_WEIGHTS.lastVisitDate;
    }

    // Reminder response
    if (factors.reminderResponse === false) {
      probability += 0.8 * this.FACTOR_WEIGHTS.reminderResponse;
    }

    return Math.min(Math.max(probability, 0), 1);
  }

  private static determineRiskLevel(probability: number): 'low' | 'medium' | 'high' {
    if (probability <= this.RISK_THRESHOLDS.low) return 'low';
    if (probability <= this.RISK_THRESHOLDS.medium) return 'medium';
    return 'high';
  }

  private static identifyContributingFactors(factors: NoShowFactors): string[] {
    const contributingFactors: string[] = [];

    if (factors.previousNoShows > 0) {
      contributingFactors.push(`Previous no-shows: ${factors.previousNoShows}`);
    }

    const hour = new Date(`2000-01-01T${factors.appointmentTime}`).getHours();
    if (hour < 9 || hour > 16) {
      contributingFactors.push('Early morning or late afternoon appointment');
    }

    if (factors.dayOfWeek === 1 || factors.dayOfWeek === 5) {
      contributingFactors.push('Appointment on Monday or Friday');
    }

    if (factors.weatherCondition === 'rain' || factors.weatherCondition === 'snow') {
      contributingFactors.push(`Poor weather conditions: ${factors.weatherCondition}`);
    }

    if (factors.distanceToClinic > 20) {
      contributingFactors.push('Long distance to clinic');
    }

    if (factors.appointmentType === 'follow-up') {
      contributingFactors.push('Follow-up appointment');
    }

    return contributingFactors;
  }

  private static async calculateDistance(patientAddress: string, clinicLocation: string): Promise<number> {
    // Mock implementation - in reality, would use a geocoding service
    return Math.random() * 30;
  }

  private static async getWeatherForecast(date: Date): Promise<string> {
    // Mock implementation - in reality, would use a weather API
    const conditions = ['sunny', 'cloudy', 'rain', 'snow'];
    return conditions[Math.floor(Math.random() * conditions.length)];
  }

  static async updatePredictionWithReminderResponse(
    appointment: Appointment,
    patient: Patient,
    reminderResponse: boolean
  ): Promise<NoShowPrediction> {
    try {
      // Get current prediction
      const currentPrediction = await this.predictNoShow(appointment, patient);

      // Adjust probability based on reminder response
      let adjustedProbability = currentPrediction.probability;
      if (reminderResponse) {
        // Positive response reduces risk
        adjustedProbability *= 0.7;
      } else {
        // No response increases risk
        adjustedProbability *= 1.3;
      }

      // Ensure probability stays within bounds
      adjustedProbability = Math.min(Math.max(adjustedProbability, 0), 1);

      // Update risk level
      const newRiskLevel = this.determineRiskLevel(adjustedProbability);

      // Update factors
      const updatedFactors = [...currentPrediction.factors];
      if (reminderResponse) {
        updatedFactors.push('Patient confirmed appointment');
      } else {
        updatedFactors.push('No response to reminder');
      }

      return {
        probability: adjustedProbability,
        riskLevel: newRiskLevel,
        factors: updatedFactors
      };
    } catch (error) {
      console.error('Error updating prediction with reminder response:', error);
      throw error;
    }
  }
} 