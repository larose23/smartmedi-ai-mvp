/**
 * Patient API Service
 * 
 * Handles all patient-related API requests with advanced features:
 * - Sophisticated caching strategies
 * - API versioning
 * - Error handling and retries
 * - Request/response monitoring
 */

import { apiClient } from '../client';
import { ApiResponse, RequestOptions } from '../types';
import { CacheStrategy } from '../cache';

// Patient types
export interface Patient {
  id: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  date_of_birth: string;
  gender?: string;
  contact?: string;
  triage_score?: string;
  primary_symptom?: string;
  check_in_time?: string;
  archived_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PatientCreate {
  full_name: string;
  date_of_birth: string;
  gender?: string;
  contact?: string;
  primary_symptom?: string;
  symptoms?: string[];
  medical_history?: string[];
  [key: string]: any;
}

export interface PatientUpdate {
  full_name?: string;
  date_of_birth?: string;
  gender?: string;
  contact?: string;
  primary_symptom?: string;
  triage_score?: string;
  symptoms?: string[];
  medical_history?: string[];
  [key: string]: any;
}

/**
 * Patient Service - handles all patient API interactions
 */
class PatientService {
  private baseUrl = '/api';
  private readonly CACHE_TTL = {
    SHORT: 60000, // 1 minute
    MEDIUM: 300000, // 5 minutes
    LONG: 3600000 // 1 hour
  };

  /**
   * Get all active check-ins
   */
  async getCheckIns(options?: RequestOptions): Promise<ApiResponse<Patient[]>> {
    const params: Record<string, string> = {};
    
    if (options?.limit) params.limit = options.limit.toString();
    if (options?.offset) params.offset = options.offset.toString();
    if (options?.sortBy) params.sortBy = options.sortBy;
    if (options?.sortDirection) params.sortDirection = options.sortDirection;
    
    return apiClient.get(`${this.baseUrl}/checkins`, { 
      params,
      cache: true,
      cacheTTL: this.CACHE_TTL.SHORT,
      cacheStrategy: CacheStrategy.STALE_WHILE_REVALIDATE,
      cacheKey: 'checkins-list',
      retries: 2,
      retryDelay: 1000,
      headers: {
        'X-Request-Type': 'checkins-list'
      }
    });
  }

  /**
   * Get archived patients
   */
  async getArchivedPatients(options?: RequestOptions): Promise<ApiResponse<Patient[]>> {
    const params: Record<string, string> = {};
    
    if (options?.limit) params.limit = options.limit.toString();
    if (options?.offset) params.offset = options.offset.toString();
    
    return apiClient.get(`${this.baseUrl}/archived-patients`, { 
      params,
      cache: true,
      cacheTTL: this.CACHE_TTL.MEDIUM,
      cacheStrategy: CacheStrategy.STALE_WHILE_REVALIDATE,
      cacheKey: 'archived-patients-list',
      retries: 2,
      retryDelay: 1000,
      headers: {
        'X-Request-Type': 'archived-patients'
      }
    });
  }

  /**
   * Get a patient by ID
   */
  async getPatient(id: string): Promise<ApiResponse<Patient>> {
    return apiClient.get(`${this.baseUrl}/patients/${id}`, {
      cache: true,
      cacheTTL: this.CACHE_TTL.MEDIUM,
      cacheStrategy: CacheStrategy.STALE_WHILE_REVALIDATE,
      cacheKey: `patient-${id}`,
      retries: 3,
      retryDelay: 1000,
      headers: {
        'X-Request-Type': 'patient-details'
      }
    });
  }

  /**
   * Create a new patient check-in
   */
  async createCheckIn(patientData: PatientCreate): Promise<ApiResponse<Patient>> {
    return apiClient.post(`${this.baseUrl}/checkins`, patientData, {
      cache: false,
      retries: 2,
      retryDelay: 1000,
      headers: {
        'X-Request-Type': 'create-checkin'
      },
      // Invalidate related caches
      invalidateCache: ['checkins-list', 'patients-list']
    });
  }

  /**
   * Update a patient
   */
  async updatePatient(id: string, patientData: PatientUpdate): Promise<ApiResponse<Patient>> {
    return apiClient.put(`${this.baseUrl}/patients/${id}`, patientData, {
      cache: false,
      retries: 2,
      retryDelay: 1000,
      headers: {
        'X-Request-Type': 'update-patient'
      },
      // Invalidate related caches
      invalidateCache: [`patient-${id}`, 'patients-list', 'checkins-list']
    });
  }

  /**
   * Archive a patient (mark as seen)
   */
  async archivePatient(patientId: string, appointmentId?: string): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.post(`${this.baseUrl}/archive-patient`, { 
      patientId, 
      appointmentId 
    }, {
      cache: false,
      retries: 2,
      retryDelay: 1000,
      headers: {
        'X-Request-Type': 'archive-patient'
      },
      // Invalidate related caches
      invalidateCache: [
        `patient-${patientId}`,
        'checkins-list',
        'archived-patients-list',
        appointmentId ? `appointment-${appointmentId}` : null
      ].filter(Boolean)
    });
  }

  /**
   * Search patients
   */
  async searchPatients(query: string, options?: RequestOptions): Promise<ApiResponse<Patient[]>> {
    const params: Record<string, string> = {
      query
    };
    
    if (options?.limit) params.limit = options.limit.toString();
    if (options?.offset) params.offset = options.offset.toString();
    
    return apiClient.get(`${this.baseUrl}/patients/search`, { 
      params,
      cache: true,
      cacheTTL: this.CACHE_TTL.SHORT,
      cacheStrategy: CacheStrategy.STALE_WHILE_REVALIDATE,
      cacheKey: `search-${query}-${JSON.stringify(params)}`,
      retries: 2,
      retryDelay: 1000,
      headers: {
        'X-Request-Type': 'patient-search'
      }
    });
  }

  /**
   * Delete a patient (for administrative purposes)
   */
  async deletePatient(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.delete(`${this.baseUrl}/patients/${id}`, {
      cache: false,
      retries: 2,
      retryDelay: 1000,
      headers: {
        'X-Request-Type': 'delete-patient'
      },
      // Invalidate related caches
      invalidateCache: [
        `patient-${id}`,
        'patients-list',
        'checkins-list',
        'archived-patients-list'
      ]
    });
  }
}

// Create and export a singleton instance
const patientService = new PatientService();
export default patientService; 