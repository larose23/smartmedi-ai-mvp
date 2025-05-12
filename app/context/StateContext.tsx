'use client';

import React, { createContext, useContext, useReducer, ReactNode, useMemo, useCallback } from 'react';
import { patientService, appointmentService, staffService } from '@/lib/api';
import type { Patient as PatientType } from '@/lib/api/services/patient';
import type { Appointment as AppointmentType } from '@/lib/api/services/appointment';
import type { StaffMember as StaffMemberType } from '@/lib/api/services/staff';

// Define types for our state
export type Patient = PatientType;
export type StaffMember = StaffMemberType;

// Application state structure
interface AppState {
  patients: {
    checkIns: Patient[];
    archived: Patient[];
    loading: boolean;
    error: string | null;
    selectedPatient: Patient | null;
  };
  appointments: {
    list: AppointmentType[];
    loading: boolean;
    error: string | null;
  };
  staff: {
    list: StaffMember[];
    loading: boolean;
    error: string | null;
  };
  ui: {
    dashboardFilter: {
      department: string;
      priority: string;
    };
    modals: {
      patientDetails: boolean;
      appointmentBooking: boolean;
    };
    notifications: {
      list: { id: string; message: string; type: 'info' | 'success' | 'warning' | 'error' }[];
    };
  };
}

// Initial state
const initialState: AppState = {
  patients: {
    checkIns: [],
    archived: [],
    loading: false,
    error: null,
    selectedPatient: null,
  },
  appointments: {
    list: [],
    loading: false,
    error: null,
  },
  staff: {
    list: [],
    loading: false,
    error: null,
  },
  ui: {
    dashboardFilter: {
      department: 'All',
      priority: 'All',
    },
    modals: {
      patientDetails: false,
      appointmentBooking: false,
    },
    notifications: {
      list: [],
    },
  },
};

// Action types
type ActionType =
  | { type: 'SET_CHECKINS'; payload: Patient[] }
  | { type: 'SET_ARCHIVED_PATIENTS'; payload: Patient[] }
  | { type: 'SET_PATIENTS_LOADING'; payload: boolean }
  | { type: 'SET_PATIENTS_ERROR'; payload: string | null }
  | { type: 'SELECT_PATIENT'; payload: Patient | null }
  | { type: 'SET_APPOINTMENTS'; payload: AppointmentType[] }
  | { type: 'SET_APPOINTMENTS_LOADING'; payload: boolean }
  | { type: 'SET_APPOINTMENTS_ERROR'; payload: string | null }
  | { type: 'SET_STAFF'; payload: StaffMember[] }
  | { type: 'SET_STAFF_LOADING'; payload: boolean }
  | { type: 'SET_STAFF_ERROR'; payload: string | null }
  | { type: 'SET_DASHBOARD_FILTER'; payload: { department?: string; priority?: string } }
  | { type: 'TOGGLE_PATIENT_DETAILS_MODAL'; payload: boolean }
  | { type: 'TOGGLE_APPOINTMENT_BOOKING_MODAL'; payload: boolean }
  | { type: 'ADD_NOTIFICATION'; payload: { message: string; type: 'info' | 'success' | 'warning' | 'error' } }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'ARCHIVE_PATIENT'; payload: string };

// Reducer function
function appReducer(state: AppState, action: ActionType): AppState {
  switch (action.type) {
    case 'SET_CHECKINS':
      return {
        ...state,
        patients: {
          ...state.patients,
          checkIns: action.payload,
        },
      };
    case 'SET_ARCHIVED_PATIENTS':
      return {
        ...state,
        patients: {
          ...state.patients,
          archived: action.payload,
        },
      };
    case 'SET_PATIENTS_LOADING':
      return {
        ...state,
        patients: {
          ...state.patients,
          loading: action.payload,
        },
      };
    case 'SET_PATIENTS_ERROR':
      return {
        ...state,
        patients: {
          ...state.patients,
          error: action.payload,
        },
      };
    case 'SELECT_PATIENT':
      return {
        ...state,
        patients: {
          ...state.patients,
          selectedPatient: action.payload,
        },
      };
    case 'SET_APPOINTMENTS':
      return {
        ...state,
        appointments: {
          ...state.appointments,
          list: action.payload,
        },
      };
    case 'SET_APPOINTMENTS_LOADING':
      return {
        ...state,
        appointments: {
          ...state.appointments,
          loading: action.payload,
        },
      };
    case 'SET_APPOINTMENTS_ERROR':
      return {
        ...state,
        appointments: {
          ...state.appointments,
          error: action.payload,
        },
      };
    case 'SET_STAFF':
      return {
        ...state,
        staff: {
          ...state.staff,
          list: action.payload,
        },
      };
    case 'SET_STAFF_LOADING':
      return {
        ...state,
        staff: {
          ...state.staff,
          loading: action.payload,
        },
      };
    case 'SET_STAFF_ERROR':
      return {
        ...state,
        staff: {
          ...state.staff,
          error: action.payload,
        },
      };
    case 'SET_DASHBOARD_FILTER':
      return {
        ...state,
        ui: {
          ...state.ui,
          dashboardFilter: {
            ...state.ui.dashboardFilter,
            ...(action.payload.department !== undefined && { department: action.payload.department }),
            ...(action.payload.priority !== undefined && { priority: action.payload.priority }),
          },
        },
      };
    case 'TOGGLE_PATIENT_DETAILS_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            patientDetails: action.payload,
          },
        },
      };
    case 'TOGGLE_APPOINTMENT_BOOKING_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            appointmentBooking: action.payload,
          },
        },
      };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: {
            list: [
              ...state.ui.notifications.list,
              {
                id: Date.now().toString(),
                message: action.payload.message,
                type: action.payload.type,
              },
            ],
          },
        },
      };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: {
            list: state.ui.notifications.list.filter((notification) => notification.id !== action.payload),
          },
        },
      };
    case 'ARCHIVE_PATIENT':
      return {
        ...state,
        patients: {
          ...state.patients,
          checkIns: state.patients.checkIns.filter((patient) => patient.id !== action.payload),
          archived: [
            ...state.patients.archived,
            state.patients.checkIns.find((patient) => patient.id === action.payload),
          ].filter(Boolean) as Patient[],
        },
      };
    default:
      return state;
  }
}

// Create the context
type AppContextType = {
  state: AppState;
  dispatch: React.Dispatch<ActionType>;
  // Selector functions
  getFilteredPatients: () => Patient[];
  getPatientById: (id: string) => Patient | undefined;
  getAppointmentsForPatient: (patientId: string) => AppointmentType[];
  getStaffById: (id: string) => StaffMember | undefined;
  // Action creators
  fetchCheckIns: () => Promise<void>;
  fetchArchivedPatients: () => Promise<void>;
  fetchAppointments: () => Promise<void>;
  fetchStaff: () => Promise<void>;
  selectPatient: (patient: Patient | null) => void;
  setDashboardFilter: (filter: { department?: string; priority?: string }) => void;
  showPatientDetails: (show: boolean) => void;
  showAppointmentBooking: (show: boolean) => void;
  addNotification: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  removeNotification: (id: string) => void;
  archivePatient: (patientId: string) => Promise<void>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Memoized selector functions
  const getFilteredPatients = useCallback(() => {
    return state.patients.checkIns.filter(
      (patient) =>
        (state.ui.dashboardFilter.department === 'All' ||
          patient.department === state.ui.dashboardFilter.department) &&
        (state.ui.dashboardFilter.priority === 'All' ||
          patient.priority_level === state.ui.dashboardFilter.priority)
    );
  }, [state.patients.checkIns, state.ui.dashboardFilter.department, state.ui.dashboardFilter.priority]);

  const getPatientById = useCallback(
    (id: string) => {
      return (
        state.patients.checkIns.find((patient) => patient.id === id) ||
        state.patients.archived.find((patient) => patient.id === id)
      );
    },
    [state.patients.checkIns, state.patients.archived]
  );

  const getAppointmentsForPatient = useCallback(
    (patientId: string) => {
      return state.appointments.list.filter((appointment) => appointment.patient_id === patientId);
    },
    [state.appointments.list]
  );

  const getStaffById = useCallback(
    (id: string) => {
      return state.staff.list.find((staff) => staff.id === id);
    },
    [state.staff.list]
  );

  // Updated to use API services
  const fetchCheckIns = useCallback(async () => {
    try {
      dispatch({ type: 'SET_PATIENTS_LOADING', payload: true });
      dispatch({ type: 'SET_PATIENTS_ERROR', payload: null });
      
      const response = await patientService.getCheckIns();
      
      if (response.success) {
        dispatch({ type: 'SET_CHECKINS', payload: response.data });
      } else {
        throw new Error(response.error || 'Failed to fetch check-ins');
      }
    } catch (error: any) {
      console.error('Error fetching check-ins:', error);
      dispatch({ type: 'SET_PATIENTS_ERROR', payload: error.message || 'Failed to fetch patients' });
    } finally {
      dispatch({ type: 'SET_PATIENTS_LOADING', payload: false });
    }
  }, []);

  const fetchArchivedPatients = useCallback(async () => {
    try {
      dispatch({ type: 'SET_PATIENTS_LOADING', payload: true });
      
      const response = await patientService.getArchivedPatients();
      
      if (response.success) {
        dispatch({ type: 'SET_ARCHIVED_PATIENTS', payload: response.data });
      } else {
        throw new Error(response.error || 'Failed to fetch archived patients');
      }
    } catch (error: any) {
      console.error('Error fetching archived patients:', error);
      dispatch({ type: 'SET_PATIENTS_ERROR', payload: error.message || 'Failed to fetch archived patients' });
    } finally {
      dispatch({ type: 'SET_PATIENTS_LOADING', payload: false });
    }
  }, []);

  const fetchAppointments = useCallback(async () => {
    try {
      dispatch({ type: 'SET_APPOINTMENTS_LOADING', payload: true });
      dispatch({ type: 'SET_APPOINTMENTS_ERROR', payload: null });
      
      const response = await appointmentService.getAppointments();
      
      if (response.success) {
        dispatch({ type: 'SET_APPOINTMENTS', payload: response.data });
      } else {
        throw new Error(response.error || 'Failed to fetch appointments');
      }
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      dispatch({ type: 'SET_APPOINTMENTS_ERROR', payload: error.message || 'Failed to fetch appointments' });
    } finally {
      dispatch({ type: 'SET_APPOINTMENTS_LOADING', payload: false });
    }
  }, []);

  const fetchStaff = useCallback(async () => {
    try {
      dispatch({ type: 'SET_STAFF_LOADING', payload: true });
      dispatch({ type: 'SET_STAFF_ERROR', payload: null });
      
      const response = await staffService.getStaff();
      
      if (response.success) {
        dispatch({ type: 'SET_STAFF', payload: response.data });
      } else {
        throw new Error(response.error || 'Failed to fetch staff');
      }
    } catch (error: any) {
      console.error('Error fetching staff:', error);
      dispatch({ type: 'SET_STAFF_ERROR', payload: error.message || 'Failed to fetch staff' });
    } finally {
      dispatch({ type: 'SET_STAFF_LOADING', payload: false });
    }
  }, []);

  const selectPatient = useCallback((patient: Patient | null) => {
    dispatch({ type: 'SELECT_PATIENT', payload: patient });
  }, []);

  const setDashboardFilter = useCallback((filter: { department?: string; priority?: string }) => {
    dispatch({ type: 'SET_DASHBOARD_FILTER', payload: filter });
  }, []);

  const showPatientDetails = useCallback((show: boolean) => {
    dispatch({ type: 'TOGGLE_PATIENT_DETAILS_MODAL', payload: show });
  }, []);

  const showAppointmentBooking = useCallback((show: boolean) => {
    dispatch({ type: 'TOGGLE_APPOINTMENT_BOOKING_MODAL', payload: show });
  }, []);

  const addNotification = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error') => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: { message, type } });
  }, []);

  const removeNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  }, []);

  const archivePatient = useCallback(async (patientId: string) => {
    try {
      const response = await patientService.archivePatient(patientId);
      
      if (response.success) {
        dispatch({ type: 'ARCHIVE_PATIENT', payload: patientId });
        return;
      } else {
        throw new Error(response.error || 'Failed to archive patient');
      }
    } catch (error: any) {
      console.error('Error archiving patient:', error);
      throw error;
    }
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      state,
      dispatch,
      getFilteredPatients,
      getPatientById,
      getAppointmentsForPatient,
      getStaffById,
      fetchCheckIns,
      fetchArchivedPatients,
      fetchAppointments,
      fetchStaff,
      selectPatient,
      setDashboardFilter,
      showPatientDetails,
      showAppointmentBooking,
      addNotification,
      removeNotification,
      archivePatient,
    }),
    [
      state,
      getFilteredPatients,
      getPatientById,
      getAppointmentsForPatient,
      getStaffById,
      fetchCheckIns,
      fetchArchivedPatients,
      fetchAppointments,
      fetchStaff,
      selectPatient,
      setDashboardFilter,
      showPatientDetails,
      showAppointmentBooking,
      addNotification,
      removeNotification,
      archivePatient,
    ]
  );

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

// Custom hook for using the context
export function useAppState() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
} 