export interface Provider {
  id: string;
  name: string;
  specialties: string[];
  qualifications: string[];
  experience: number; // in years
  rating: number; // 0-5
  availability: AvailabilitySchedule;
  languages: string[];
  location: Location;
  contactInfo: ContactInfo;
}

export interface Patient {
  id: string;
  name: string;
  dateOfBirth: string;
  medicalHistory: MedicalHistory;
  insurance: InsuranceInfo;
  preferredProviders?: string[];
  preferredSpecialties?: string[];
  contactInfo: ContactInfo;
}

export interface TimeSlot {
  id: string;
  providerId: string;
  startTime: string; // ISO date string
  endTime: string; // ISO date string
  duration: number; // in minutes
  type: 'regular' | 'urgent' | 'follow-up';
  status: 'available' | 'booked' | 'cancelled';
  patientId?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  providerId: string;
  timeSlot: TimeSlot;
  type: 'regular' | 'urgent' | 'follow-up';
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  reason: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilitySchedule {
  weeklySchedule: {
    [key: string]: TimeSlot[]; // key is day of week
  };
  exceptions: {
    date: string;
    slots: TimeSlot[];
  }[];
}

export interface MedicalHistory {
  conditions: string[];
  allergies: string[];
  medications: string[];
  previousAppointments: string[]; // appointment IDs
  lastCheckup: string; // ISO date string
}

export interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  groupNumber?: string;
  coverage: {
    type: string;
    details: string;
  };
}

export interface Location {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface ContactInfo {
  phone: string;
  email: string;
  preferredContactMethod: 'phone' | 'email' | 'sms';
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
}

export interface SchedulingPreferences {
  urgency: 'high' | 'medium' | 'low';
  preferredSpecialties?: string[];
  preferredProviders?: string[];
  preferredTimeSlots?: TimeSlot[];
  maxWaitTime?: number; // in minutes
  preferredLocation?: Location;
  preferredLanguage?: string;
}

export interface SchedulingResult {
  recommendedSlots: TimeSlot[];
  recommendedProviders: Provider[];
  waitTime: number; // in minutes
  urgencyLevel: 'high' | 'medium' | 'low';
  alternatives?: {
    slots: TimeSlot[];
    providers: Provider[];
  };
} 