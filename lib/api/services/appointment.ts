/**
 * Appointment API Service
 * 
 * Handles all appointment-related API requests with advanced features:
 * - Sophisticated caching strategies
 * - API versioning
 * - Error handling and retries
 * - Request/response monitoring
 */

import { apiClient } from '../client';
import { ApiResponse, RequestOptions } from '../types';
import { CacheStrategy } from '../cache';

// Appointment types
export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id?: string;
  department?: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  status: 'scheduled' | 'canceled' | 'completed' | 'no-show';
  notes?: string;
  created_at?: string;
  updated_at?: string;
  patient_name?: string;
  doctor_name?: string;
}

export interface AppointmentCreate {
  patient_id: string;
  doctor_id?: string;
  department?: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes?: number;
  status?: 'scheduled' | 'canceled' | 'completed' | 'no-show';
  notes?: string;
}

export interface AppointmentUpdate {
  doctor_id?: string;
  department?: string;
  appointment_date?: string;
  appointment_time?: string;
  duration_minutes?: number;
  status?: 'scheduled' | 'canceled' | 'completed' | 'no-show';
  notes?: string;
}

/**
 * Appointment Service - handles all appointment API interactions
 */
class AppointmentService {
  private baseUrl = '/api';
  private readonly CACHE_TTL = {
    SHORT: 30000, // 30 seconds
    MEDIUM: 300000, // 5 minutes
    LONG: 3600000 // 1 hour
  };

  /**
   * Get all appointments
   */
  async getAppointments(options?: RequestOptions): Promise<ApiResponse<Appointment[]>> {
    const params: Record<string, string> = {};
    
    if (options?.limit) params.limit = options.limit.toString();
    if (options?.offset) params.offset = options.offset.toString();
    if (options?.sortBy) params.sortBy = options.sortBy;
    if (options?.sortDirection) params.sortDirection = options.sortDirection;
    
    return apiClient.get(`${this.baseUrl}/appointments`, { 
      params,
      cache: true,
      cacheTTL: this.CACHE_TTL.SHORT,
      cacheStrategy: CacheStrategy.STALE_WHILE_REVALIDATE,
      cacheKey: 'appointments-list',
      retries: 2,
      retryDelay: 1000,
      headers: {
        'X-Request-Type': 'appointments-list'
      }
    });
  }

  /**
   * Get appointments for a specific patient
   */
  async getPatientAppointments(patientId: string): Promise<ApiResponse<Appointment[]>> {
    return apiClient.get(`${this.baseUrl}/patients/${patientId}/appointments`, {
      cache: true,
      cacheTTL: this.CACHE_TTL.MEDIUM,
      cacheStrategy: CacheStrategy.STALE_WHILE_REVALIDATE,
      cacheKey: `patient-appointments-${patientId}`,
      retries: 2,
      retryDelay: 1000,
      headers: {
        'X-Request-Type': 'patient-appointments'
      }
    });
  }

  /**
   * Get available appointment slots
   */
  async getAvailableSlots(
    date: string, 
    departmentId?: string
  ): Promise<ApiResponse<{ time: string; available: boolean }[]>> {
    const params: Record<string, string> = { date };
    if (departmentId) params.departmentId = departmentId;
    
    return apiClient.get(`${this.baseUrl}/appointments/available-slots`, { 
      params,
      cache: true,
      cacheTTL: this.CACHE_TTL.SHORT,
      cacheStrategy: CacheStrategy.STALE_WHILE_REVALIDATE,
      cacheKey: `slots-${date}-${departmentId || 'all'}`,
      retries: 2,
      retryDelay: 1000,
      headers: {
        'X-Request-Type': 'available-slots'
      }
    });
  }

  /**
   * Create a new appointment
   */
  async createAppointment(appointmentData: AppointmentCreate): Promise<ApiResponse<Appointment>> {
    return apiClient.post(`${this.baseUrl}/appointments`, appointmentData, {
      cache: false,
      retries: 2,
      retryDelay: 1000,
      headers: {
        'X-Request-Type': 'create-appointment'
      },
      invalidateCache: [
        'appointments-list',
        `patient-appointments-${appointmentData.patient_id}`,
        `slots-${appointmentData.appointment_date}-${appointmentData.department || 'all'}`
      ]
    });
  }

  /**
   * Update an appointment
   */
  async updateAppointment(id: string, appointmentData: AppointmentUpdate): Promise<ApiResponse<Appointment>> {
    return apiClient.put(`${this.baseUrl}/appointments/${id}`, appointmentData, {
      cache: false,
      retries: 2,
      retryDelay: 1000,
      headers: {
        'X-Request-Type': 'update-appointment'
      },
      invalidateCache: [
        `appointment-${id}`,
        'appointments-list',
        appointmentData.appointment_date ? 
          `slots-${appointmentData.appointment_date}-${appointmentData.department || 'all'}` : 
          null
      ].filter(Boolean)
    });
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(id: string, reason?: string): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.post(`${this.baseUrl}/appointments/${id}/cancel`, { reason }, {
      cache: false,
      retries: 2,
      retryDelay: 1000,
      headers: {
        'X-Request-Type': 'cancel-appointment'
      },
      invalidateCache: [
        `appointment-${id}`,
        'appointments-list'
      ]
    });
  }

  /**
   * Mark appointment as completed
   */
  async completeAppointment(id: string, notes?: string): Promise<ApiResponse<Appointment>> {
    return apiClient.post(`${this.baseUrl}/appointments/${id}/complete`, { notes }, {
      cache: false,
      retries: 2,
      retryDelay: 1000,
      headers: {
        'X-Request-Type': 'complete-appointment'
      },
      invalidateCache: [
        `appointment-${id}`,
        'appointments-list'
      ]
    });
  }
}

// Create and export a singleton instance
const appointmentService = new AppointmentService();
export default appointmentService; 