/**
 * API Layer for SmartMedi AI
 * 
 * Exports standardized API client and service modules
 */

// Export the core API client
export { default as apiClient, ApiClient } from './client';

// Export API services
export { default as patientService } from './services/patient';
export { default as triageService } from './services/triage';
export { default as appointmentService } from './services/appointment';
export { default as staffService } from './services/staff';

// Re-export common response types
export * from './types'; 