export const SCHEDULING_CONSTANTS = {
  URGENCY_WEIGHTS: {
    high: 1.0,
    medium: 0.7,
    low: 0.4
  },
  WEIGHTS: {
    SPECIALIZATION_MATCH: 0.4,
    WAIT_TIME: 0.3,
    PROVIDER_PREFERENCE: 0.3
  },
  MAX_WAIT_TIMES: {
    high: 24 * 60, // 24 hours in minutes
    medium: 72 * 60, // 72 hours in minutes
    low: 168 * 60 // 1 week in minutes
  },
  DEFAULT_MAX_WAIT_TIME: 10080, // 1 week in minutes
  SLOT_DURATION: 30, // minutes
  WORKING_HOURS: {
    start: 8, // 8 AM
    end: 18 // 6 PM
  },
  RECURRENCE_PATTERNS: {
    daily: 'daily',
    weekly: 'weekly',
    monthly: 'monthly'
  },
  APPOINTMENT_STATUS: {
    SCHEDULED: 'scheduled',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    NO_SHOW: 'no-show'
  },
  NOTIFICATION_TEMPLATES: {
    CONFIRMATION: 'appointment-confirmation',
    CANCELLATION: 'appointment-cancellation',
    REMINDER: 'appointment-reminder'
  }
} as const; 