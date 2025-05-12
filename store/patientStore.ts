import { create } from 'zustand';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PatientDemographics {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  ethnicity: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  contact: {
    phone: string;
    email: string;
  };
  insurance: {
    provider: string;
    policy_number: string;
    group_number: string;
  };
  emergency_contact: {
    name: string;
    relationship: string;
    phone: string;
  };
  medical_record_number: string;
  last_visit: string;
}

interface MedicalHistory {
  conditions: Array<{
    id: string;
    name: string;
    diagnosis_date: string;
    status: 'active' | 'resolved' | 'chronic';
    severity: 'mild' | 'moderate' | 'severe';
    notes?: string;
  }>;
  medications: Array<{
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    start_date: string;
    end_date?: string;
    prescribed_by: string;
    status: 'active' | 'discontinued';
    notes?: string;
  }>;
  allergies: Array<{
    id: string;
    allergen: string;
    reaction: string;
    severity: 'mild' | 'moderate' | 'severe';
    notes?: string;
  }>;
  procedures: Array<{
    id: string;
    name: string;
    date: string;
    provider: string;
    location: string;
    notes?: string;
  }>;
}

interface Appointment {
  id: string;
  case_id: string;
  patient_id: string;
  provider_id: string;
  department: string;
  scheduled_time: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  type: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface PatientState {
  patientData: PatientDemographics | null;
  medicalHistory: MedicalHistory | null;
  appointments: Appointment[];
  loading: {
    patient: boolean;
    history: boolean;
    appointments: boolean;
  };
  error: {
    patient: string | null;
    history: string | null;
    appointments: string | null;
  };
  fetchPatientData: (patientId: string) => Promise<void>;
  fetchMedicalHistory: (patientId: string) => Promise<void>;
  fetchAppointments: (caseId: string) => Promise<void>;
  bookAppointment: (appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateAppointment: (appointmentId: string, updates: Partial<Appointment>) => Promise<void>;
}

export const usePatientStore = create<PatientState>((set, get) => ({
  patientData: null,
  medicalHistory: null,
  appointments: [],
  loading: {
    patient: false,
    history: false,
    appointments: false,
  },
  error: {
    patient: null,
    history: null,
    appointments: null,
  },

  fetchPatientData: async (patientId: string) => {
    set(state => ({ loading: { ...state.loading, patient: true } }));
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (error) throw error;

      set({ patientData: data, error: { ...get().error, patient: null } });
    } catch (err) {
      set(state => ({
        error: { ...state.error, patient: err instanceof Error ? err.message : 'Failed to fetch patient data' }
      }));
    } finally {
      set(state => ({ loading: { ...state.loading, patient: false } }));
    }
  },

  fetchMedicalHistory: async (patientId: string) => {
    set(state => ({ loading: { ...state.loading, history: true } }));
    try {
      const { data, error } = await supabase
        .from('medical_history')
        .select('*')
        .eq('patient_id', patientId)
        .single();

      if (error) throw error;

      set({ medicalHistory: data, error: { ...get().error, history: null } });
    } catch (err) {
      set(state => ({
        error: { ...state.error, history: err instanceof Error ? err.message : 'Failed to fetch medical history' }
      }));
    } finally {
      set(state => ({ loading: { ...state.loading, history: false } }));
    }
  },

  fetchAppointments: async (caseId: string) => {
    set(state => ({ loading: { ...state.loading, appointments: true } }));
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('case_id', caseId)
        .order('scheduled_time', { ascending: true });

      if (error) throw error;

      set({ appointments: data || [], error: { ...get().error, appointments: null } });
    } catch (err) {
      set(state => ({
        error: { ...state.error, appointments: err instanceof Error ? err.message : 'Failed to fetch appointments' }
      }));
    } finally {
      set(state => ({ loading: { ...state.loading, appointments: false } }));
    }
  },

  bookAppointment: async (appointment) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert([appointment])
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        appointments: [...state.appointments, data],
        error: { ...state.error, appointments: null }
      }));
    } catch (err) {
      set(state => ({
        error: { ...state.error, appointments: err instanceof Error ? err.message : 'Failed to book appointment' }
      }));
      throw err;
    }
  },

  updateAppointment: async (appointmentId, updates) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        appointments: state.appointments.map(apt =>
          apt.id === appointmentId ? { ...apt, ...data } : apt
        ),
        error: { ...state.error, appointments: null }
      }));
    } catch (err) {
      set(state => ({
        error: { ...state.error, appointments: err instanceof Error ? err.message : 'Failed to update appointment' }
      }));
      throw err;
    }
  },
})); 