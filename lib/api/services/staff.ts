/**
 * Staff API Service
 * 
 * Handles all staff-related API requests with advanced features:
 * - Sophisticated caching strategies
 * - API versioning
 * - Error handling and retries
 * - Request/response monitoring
 */

import { apiClient } from '../client';
import { ApiResponse, RequestOptions } from '../types';
import { CacheStrategy } from '../cache';

// Staff types
export interface StaffMember {
  id: string;
  name: string;
  role: string;
  specialty?: string;
  department?: string;
  available?: boolean;
  email?: string;
  phone?: string;
  profile_image?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StaffCreate {
  name: string;
  role: string;
  specialty?: string;
  department?: string;
  available?: boolean;
  email?: string;
  phone?: string;
}

export interface StaffUpdate {
  name?: string;
  role?: string;
  specialty?: string;
  department?: string;
  available?: boolean;
  email?: string;
  phone?: string;
}

/**
 * Staff Service - handles all staff API interactions
 */
class StaffService {
  private baseUrl = '/api';
  private readonly CACHE_TTL = {
    SHORT: 60000, // 1 minute
    MEDIUM: 300000, // 5 minutes
    LONG: 3600000 // 1 hour
  };

  /**
   * Get all staff members
   */
  async getStaff(options?: RequestOptions): Promise<ApiResponse<StaffMember[]>> {
    const params: Record<string, string> = {};
    
    if (options?.limit) params.limit = options.limit.toString();
    if (options?.offset) params.offset = options.offset.toString();
    if (options?.sortBy) params.sortBy = options.sortBy;
    if (options?.sortDirection) params.sortDirection = options.sortDirection;
    
    return apiClient.get(`${this.baseUrl}/staff`, { 
      params,
      cache: true,
      cacheTTL: this.CACHE_TTL.MEDIUM,
      cacheStrategy: CacheStrategy.STALE_WHILE_REVALIDATE,
      cacheKey: 'staff-list',
      retries: 2,
      retryDelay: 1000,
      headers: {
        'X-Request-Type': 'staff-list'
      }
    });
  }

  /**
   * Get available staff members for appointments
   */
  async getAvailableStaff(departmentId?: string): Promise<ApiResponse<StaffMember[]>> {
    const params: Record<string, string> = {
      available: 'true'
    };
    
    if (departmentId) params.department = departmentId;
    
    return apiClient.get(`${this.baseUrl}/staff/available`, { 
      params,
      cache: true,
      cacheTTL: this.CACHE_TTL.SHORT,
      cacheStrategy: CacheStrategy.STALE_WHILE_REVALIDATE,
      cacheKey: `available-staff-${departmentId || 'all'}`,
      retries: 2,
      retryDelay: 1000,
      headers: {
        'X-Request-Type': 'available-staff'
      }
    });
  }

  /**
   * Get a staff member by ID
   */
  async getStaffMember(id: string): Promise<ApiResponse<StaffMember>> {
    return apiClient.get(`${this.baseUrl}/staff/${id}`, {
      cache: true,
      cacheTTL: this.CACHE_TTL.MEDIUM,
      cacheStrategy: CacheStrategy.STALE_WHILE_REVALIDATE,
      cacheKey: `staff-${id}`,
      retries: 2,
      retryDelay: 1000,
      headers: {
        'X-Request-Type': 'staff-details'
      }
    });
  }

  /**
   * Create a new staff member
   */
  async createStaffMember(staffData: StaffCreate): Promise<ApiResponse<StaffMember>> {
    return apiClient.post(`${this.baseUrl}/staff`, staffData, {
      cache: false,
      retries: 2,
      retryDelay: 1000,
      headers: {
        'X-Request-Type': 'create-staff'
      },
      invalidateCache: [
        'staff-list',
        `available-staff-${staffData.department || 'all'}`
      ]
    });
  }

  /**
   * Update a staff member
   */
  async updateStaffMember(id: string, staffData: StaffUpdate): Promise<ApiResponse<StaffMember>> {
    return apiClient.put(`${this.baseUrl}/staff/${id}`, staffData, {
      cache: false,
      retries: 2,
      retryDelay: 1000,
      headers: {
        'X-Request-Type': 'update-staff'
      },
      invalidateCache: [
        `staff-${id}`,
        'staff-list',
        staffData.department ? `available-staff-${staffData.department}` : null
      ].filter(Boolean)
    });
  }

  /**
   * Delete a staff member
   */
  async deleteStaffMember(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.delete(`${this.baseUrl}/staff/${id}`, {
      cache: false,
      retries: 2,
      retryDelay: 1000,
      headers: {
        'X-Request-Type': 'delete-staff'
      },
      invalidateCache: [
        `staff-${id}`,
        'staff-list',
        'available-staff-all'
      ]
    });
  }

  /**
   * Update staff availability status
   */
  async updateAvailability(id: string, available: boolean): Promise<ApiResponse<StaffMember>> {
    return apiClient.patch(`${this.baseUrl}/staff/${id}/availability`, { 
      available 
    }, {
      cache: false,
      retries: 2,
      retryDelay: 1000,
      headers: {
        'X-Request-Type': 'update-availability'
      },
      invalidateCache: [
        `staff-${id}`,
        'available-staff-all'
      ]
    });
  }

  /**
   * Get staff schedule
   */
  async getStaffSchedule(id: string, startDate: string, endDate: string): Promise<ApiResponse<any>> {
    return apiClient.get(`${this.baseUrl}/staff/${id}/schedule`, {
      params: {
        startDate,
        endDate
      },
      cache: true,
      cacheTTL: this.CACHE_TTL.SHORT,
      cacheStrategy: CacheStrategy.STALE_WHILE_REVALIDATE,
      cacheKey: `staff-schedule-${id}-${startDate}-${endDate}`,
      retries: 2,
      retryDelay: 1000,
      headers: {
        'X-Request-Type': 'staff-schedule'
      }
    });
  }
}

// Create and export a singleton instance
const staffService = new StaffService();
export default staffService; 