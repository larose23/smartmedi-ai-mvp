/**
 * Triage API Service
 * 
 * Handles all triage-related API requests
 */

import { apiClient } from '../client';
import { ApiResponse } from '../types';
import type { TriageRequest, TriageResponse } from '@/types/triage';

/**
 * Triage Service - handles all triage-related API interactions
 */
class TriageService {
  private baseUrl = '/api';

  /**
   * Submit symptoms for triage assessment
   */
  async assessSymptoms(request: TriageRequest): Promise<ApiResponse<TriageResponse>> {
    return apiClient.post(`${this.baseUrl}/triage`, request, {
      // Longer timeout for ML-powered triage requests
      timeout: 30000,
      // No caching for triage requests to ensure fresh results
      cache: false
    });
  }

  /**
   * Get triage score explanation
   */
  async getScoreExplanation(triageScore: string): Promise<ApiResponse<{ explanation: string }>> {
    return apiClient.get(`${this.baseUrl}/triage/explanation`, {
      params: { score: triageScore },
      // Cache explanations as they don't change often
      cache: true,
      cacheTTL: 3600000 // 1 hour
    });
  }

  /**
   * Submit follow-up information for an existing triage assessment
   */
  async submitFollowUp(
    triageId: string, 
    followUpData: Partial<TriageRequest>
  ): Promise<ApiResponse<TriageResponse>> {
    return apiClient.post(`${this.baseUrl}/triage/${triageId}/follow-up`, followUpData, {
      // No caching for follow-up requests
      cache: false
    });
  }

  /**
   * Get suggested follow-up questions based on symptoms
   */
  async getSuggestedQuestions(symptoms: string[]): Promise<ApiResponse<{ questions: string[] }>> {
    return apiClient.post(`${this.baseUrl}/triage/questions`, { symptoms }, {
      // Cache suggested questions briefly
      cache: true,
      cacheTTL: 300000 // 5 minutes
    });
  }

  /**
   * Retrieve historical triage data for a patient
   */
  async getPatientTriageHistory(patientId: string): Promise<ApiResponse<TriageResponse[]>> {
    return apiClient.get(`${this.baseUrl}/triage/history/${patientId}`);
  }
}

// Create and export a singleton instance
const triageService = new TriageService();
export default triageService; 