'use client';

import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { v4 as uuidv4 } from 'uuid';
import AppointmentDetails from '@/components/AppointmentDetails';

// Simple interfaces to avoid type errors
interface Appointment {
  id: string;
  patient_id: string;
  staff_id: string;
  appointment_date: string; 
  status: string;
  notes?: string;
  recurrence?: string;
  department?: string;
  end_date?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps: any;
}

interface PatientInfo {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  name?: string;  // For backward compatibility
  contact?: string; // For backward compatibility
  phone_number?: string; // Added for better contact information
}

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  department: string;
  job_title: string;
}

export default function AppointmentScheduler() {
  const [appointments, setAppointments] = useState<CalendarEvent[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [appointmentReason, setAppointmentReason] = useState('General Checkup');
  const [appointmentTitle, setAppointmentTitle] = useState('');
  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>(undefined);
  const [appointmentEndDate, setAppointmentEndDate] = useState<Date | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<PatientInfo | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string>("_none");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<any>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const [isFixingDatabase, setIsFixingDatabase] = useState<boolean>(false);
  const [patients, setPatients] = useState<PatientInfo[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [appointmentDepartment, setAppointmentDepartment] = useState<string>('General');
  const [appointmentDuration, setAppointmentDuration] = useState<string>('30');
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurrencePattern, setRecurrencePattern] = useState<string>('none');
  const [recurrenceOccurrences, setRecurrenceOccurrences] = useState<string>('4');
  const router = useRouter();

  // Helper function to ensure PatientInfo has all required fields
  const createPatientInfo = (partialPatient: Partial<PatientInfo>): PatientInfo => {
    return {
      id: partialPatient.id || `temp-${Date.now()}`,
      first_name: partialPatient.first_name || '',
      last_name: partialPatient.last_name || '',
      date_of_birth: partialPatient.date_of_birth,
      gender: partialPatient.gender,
      name: partialPatient.name,
      contact: partialPatient.contact,
      phone_number: partialPatient.phone_number
    };
  };

  // Function to fix database issues
  const fixDatabase = async () => {
    setIsFixingDatabase(true);
    try {
      // Run all database fixes
      console.log('Applying comprehensive database fixes...');
      
      // First fix patients table
      await fetch('/api/db-fix/patients');
      
      // Fix appointments table
      await fetch('/api/db-fix/appointments');
      
      // Fix contact info
      await fetch('/api/db-fix/contact-info');
      
      // Run the general fix as well
      await fetch('/api/db-fix');
      
      toast.success('Database fix applied. Try again.');
      setDatabaseError(null);
      
      // Force-refresh appointments to reflect schema changes
      fetchAppointments();
    } catch (error) {
      console.error('Failed to fix database:', error);
      toast.error('Failed to fix database');
    } finally {
      setIsFixingDatabase(false);
    }
  };

  useEffect(() => {
    // Check for pre-selected patient from dashboard
    const patientData = localStorage.getItem('selectedPatient');
    if (patientData) {
      try {
        const parsedPatient = JSON.parse(patientData);
        // Ensure consistent field names
        const normalizedPatient: PatientInfo = {
          id: parsedPatient.id || `temp-${Date.now()}`,
          first_name: parsedPatient.first_name || (parsedPatient.name ? parsedPatient.name.split(' ')[0] : ''),
          last_name: parsedPatient.last_name || (parsedPatient.name && parsedPatient.name.split(' ').length > 1 ? parsedPatient.name.split(' ').slice(1).join(' ') : ''),
          date_of_birth: parsedPatient.date_of_birth || '',
          gender: parsedPatient.gender || 'Not Specified',
          // Handle different contact field variations
          phone_number: parsedPatient.phone_number || parsedPatient.contact || '',
          // Preserve backward compatibility fields
          name: parsedPatient.name || `${parsedPatient.first_name || ''} ${parsedPatient.last_name || ''}`.trim(),
          contact: parsedPatient.contact || parsedPatient.phone_number || ''
        };
        setSelectedPatient(normalizedPatient);
      } catch (error) {
        console.error('Error parsing patient data:', error);
      }
      localStorage.removeItem('selectedPatient'); // Clear after reading
    }
    
    // Check for appointment recommendation from patient details
    const recommendationData = localStorage.getItem('appointmentRecommendation');
    if (recommendationData) {
      const recommendation = JSON.parse(recommendationData);
      
      if (recommendation.department) {
        setAppointmentDepartment(recommendation.department);
      }
      
      if (recommendation.reason) {
        setAppointmentReason(recommendation.reason);
      }
      
      if (recommendation.suggestedTime) {
        const suggestedTime = new Date(recommendation.suggestedTime);
        setAppointmentDate(suggestedTime);
        
        // Set the time in the correct format for the dropdown
        const hours = suggestedTime.getHours();
        const minutes = suggestedTime.getMinutes();
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
        
        setSelectedTime(`${displayHour}:${minutes === 0 ? '00' : minutes} ${period}`);
        
        // Generate available times
        const times = [];
        for (let hour = 8; hour < 18; hour++) {
          const period = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
          
          times.push(`${displayHour}:00 ${period}`);
          times.push(`${displayHour}:30 ${period}`);
        }
        setAvailableTimes(times);
      }
      
      // Remove from localStorage after using
      localStorage.removeItem('appointmentRecommendation');
      
      // Open the booking dialog with pre-filled data
      setIsBookingDialogOpen(true);
    }
    
    // Run DB fix first to ensure tables are properly set up
    const fixDatabase = async () => {
      setIsFixingDatabase(true);
      try {
        // Run all database fixes
        console.log('Applying comprehensive database fixes...');
        
        // First fix patients table
        await fetch('/api/db-fix/patients');
        
        // Fix appointments table
        await fetch('/api/db-fix/appointments');
        
        // Fix contact info
        await fetch('/api/db-fix/contact-info');
        
        // Run the general fix as well
        await fetch('/api/db-fix');
        
        toast.success('Database fix applied. Try again.');
        setDatabaseError(null);
        
        // Force-refresh appointments to reflect schema changes
          fetchAppointments();
      } catch (error) {
        console.error('Failed to fix database:', error);
        toast.error('Failed to fix database');
      } finally {
        setIsFixingDatabase(false);
      }
    };
    
    fixDatabase();

    // Fetch patients and staff for appointment details
    fetchPatients();
    fetchStaff();
  }, []);

  const fetchAppointments = async () => {
    try {
      // Simplified query without joins to avoid type issues
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: true });

      if (error) throw error;

      // Simple transformation to calendar events with color coding
      const calendarEvents = (data || []).map(appointment => {
        // Set color based on status
        let backgroundColor = '#3490dc'; // Default blue
        let borderColor = '#2779bd';
        let textColor = '#ffffff';
        
        if (appointment.status === 'completed') {
          backgroundColor = '#38c172'; // Green
          borderColor = '#2d995b';
        } else if (appointment.status === 'cancelled') {
          backgroundColor = '#e3342f'; // Red
          borderColor = '#cc1f1a';
        } else if (appointment.status === 'no-show') {
          backgroundColor = '#ffed4a'; // Yellow
          borderColor = '#f2d024';
          textColor = '#2d3748'; // Dark text for light background
        } else if (appointment.status === 'in-progress') {
          backgroundColor = '#9561e2'; // Purple
          borderColor = '#7e3af2';
        }
        
        // Calculate end time (default to 30 min if not specified)
        const startDate = new Date(appointment.appointment_date);
        const endDate = new Date(new Date(startDate).getTime() + 
                               (appointment.duration ? parseInt(appointment.duration) : 30) * 60 * 1000);
        
        // Get patient name from localStorage if available
        let patientName = '';
        try {
          const storedPatientData = localStorage.getItem(`appointment_${appointment.id}_patient`);
          if (storedPatientData) {
            const patientInfo = JSON.parse(storedPatientData);
            patientName = patientInfo.name;
          }
        } catch (e) {
          console.error('Error reading patient data from localStorage:', e);
        }
        
        // Set a display title that includes patient name if available
        const displayTitle = patientName 
          ? `${patientName}: ${appointment.notes || 'Appointment'}`
          : appointment.notes || 'Appointment';
        
        // Create a basic appointment title if nothing else is available
        const finalTitle = displayTitle || 
          `Appt: ${new Date(appointment.appointment_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        
        return {
          id: appointment.id,
          title: finalTitle,
          start: appointment.appointment_date,
          end: endDate.toISOString(),
          backgroundColor,
          borderColor,
          textColor,
          extendedProps: appointment
        };
      });

      console.log('Calendar events loaded:', calendarEvents);
      setAppointments(calendarEvents);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('first_name', { ascending: true });

      if (error) throw error;
      setPatients(data || []);
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  };

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('first_name', { ascending: true });

      if (error) throw error;
      setStaffMembers(data || []);
    } catch (err) {
      console.error('Error fetching staff members:', err);
    }
  };

  const handleDateSelect = (selectInfo: any) => {
    // Prevent selecting dates in the past
    const selectedDate = new Date(selectInfo.startStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      toast.error('Cannot book appointments in the past');
      return;
    }
    
    setSelectedTimeSlot(selectInfo);
    setAppointmentDate(new Date(selectInfo.startStr));
    
    // Generate available times
    const times = [];
    for (let hour = 8; hour < 18; hour++) {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      
      times.push(`${displayHour}:00 ${period}`);
      times.push(`${displayHour}:30 ${period}`);
    }
    setAvailableTimes(times);
    
    setIsBookingDialogOpen(true);
  };

  const handleBookAppointment = async () => {
    if (!selectedTimeSlot && !appointmentDate) return;
    
    // Validate appointment date is not in the past
    const selectedDate = appointmentDate ? new Date(appointmentDate) : new Date(selectedTimeSlot.startStr);
    const now = new Date();
    if (selectedDate < now) {
      toast.error('Cannot book appointments in the past');
      return;
    }
    
    setIsLoading(true);
    try {
      // Get form values directly - ensure we get these every time
      const patientNameElement = document.getElementById('patientName') as HTMLInputElement;
      const dobElement = document.getElementById('dob') as HTMLInputElement;
      const genderElement = document.getElementById('gender') as HTMLSelectElement;
      const phoneElement = document.getElementById('phone') as HTMLInputElement;

      const patientName = patientNameElement ? patientNameElement.value : '';
      const dob = dobElement ? dobElement.value : '';
      const gender = genderElement ? genderElement.value : '';
      const phone = phoneElement ? phoneElement.value : '';

      // Either use a form value or create a "New Patient" placeholder
      const firstName = patientName ? patientName.trim().split(' ')[0] : 'New';
      const lastName = patientName && patientName.trim().split(' ').length > 1 
        ? patientName.trim().split(' ').slice(1).join(' ') 
        : 'Patient';

      // Collect patient info to ensure it's available
      const patientInfo = {
        name: patientName || `${firstName} ${lastName}`,
        dob: dob || 'Not Available',
        gender: gender || 'Not Specified',  // Ensure we use 'Not Specified' as the explicit default
        contact: phone || 'Not Available'
      };
      
      // Use existing patient ID or fetch from check_ins
      let patientId;
      if (selectedPatient?.id) {
        // If we have a selected patient with ID, use that directly
        patientId = selectedPatient.id;
        console.log('Using selected patient ID:', patientId);
      } else {
        // Try to find the patient in check_ins by name
        try {
          const { data: checkInsData, error: checkInsError } = await supabase
            .from('check_ins')
            .select('id, full_name')
            .eq('full_name', patientName)
            .maybeSingle();
          
          if (checkInsData && !checkInsError) {
            patientId = checkInsData.id;
            console.log('Found patient in check_ins:', patientId);
          } else {
            // Fall back to patients table if needed
            const { data: patientsData, error: patientsError } = await supabase
              .from('patients')
              .select('id')
              .or(`first_name.eq.${firstName},name.eq.${patientName}`)
              .maybeSingle();
            
            if (patientsData && !patientsError) {
              patientId = patientsData.id;
              console.log('Found patient in patients table:', patientId);
            } else {
              patientId = '11111111-1111-1111-1111-111111111111'; // Fallback ID
              console.log('Using default patient ID as fallback');
            }
          }
        } catch (error) {
          console.error('Error looking up patient ID:', error);
          patientId = '11111111-1111-1111-1111-111111111111'; // Fallback ID
        }
      }
      
      // Continue with appointment creation
      let selectedDateObj;
      if (appointmentDate) {
        selectedDateObj = new Date(appointmentDate);
        if (selectedTime) {
          const [timeStr, period] = selectedTime.split(' ');
          const [hours, minutes] = timeStr.split(':').map(num => parseInt(num));
          let hour = hours;
          if (period === 'PM' && hours < 12) hour += 12;
          if (period === 'AM' && hours === 12) hour = 0;
          selectedDateObj.setHours(hour, minutes || 0, 0, 0);
        }
      } else {
        selectedDateObj = new Date(selectedTimeSlot.startStr);
        const [hours, minutes] = selectedTime.split(':').map(num => parseInt(num));
        selectedDateObj.setHours(hours, minutes || 0, 0, 0);
      }
      const appointmentDateStr = selectedDateObj.toISOString();
      let appointmentCreated = false;
      let attemptCount = 0;
      const MAX_ATTEMPTS = 2;
      let defaultStaffId = '11111111-1111-1111-1111-111111111111';
      if (selectedStaff === "_none" && staffMembers.length > 0) {
        const departmentStaff = staffMembers.find(staff => staff.department === appointmentDepartment);
        if (departmentStaff) {
          defaultStaffId = departmentStaff.id;
        } else {
          defaultStaffId = staffMembers[0].id;
        }
      }
      while (!appointmentCreated && attemptCount < MAX_ATTEMPTS) {
        attemptCount++;
        try {
          let appointmentData;
          switch (attemptCount) {
            case 1:
              appointmentData = {
                patient_id: patientId,
                staff_id: selectedStaff !== "_none" ? selectedStaff : defaultStaffId,
                appointment_date: appointmentDateStr,
                status: 'scheduled',
                notes: appointmentTitle || appointmentReason || 'General Checkup',
                department: appointmentDepartment || 'General',
                duration: appointmentDuration || '30'
              };
              break;
            case 2:
              appointmentData = {
                patient_id: patientId,
                staff_id: selectedStaff !== "_none" ? selectedStaff : defaultStaffId,
                appointment_date: appointmentDateStr,
                status: 'scheduled'
              };
              break;
          }
          const { data, error } = await supabase
            .from('appointments')
            .insert([appointmentData])
            .select();
          if (error) {
            console.error(`Error in attempt ${attemptCount}:`, error);
            if (attemptCount === MAX_ATTEMPTS) {
              throw error;
            }
          } else {
            appointmentCreated = true;
            console.log('Appointment created successfully:', data);
            
            // Store patient info in localStorage IMMEDIATELY
            if (data && data.length > 0) {
              const appointmentId = data[0].id;
              
              try {
                // Make sure localStorage is working
                localStorage.setItem('test_key', 'test_value');
                localStorage.removeItem('test_key');
                
                // Set the patient info
                const patientInfoKey = `appointment_${appointmentId}_patient`;
                localStorage.setItem(patientInfoKey, JSON.stringify(patientInfo));
                console.log(`Patient info stored in localStorage with key: ${patientInfoKey}`, patientInfo);
                
                // Double-check storage
                const storedData = localStorage.getItem(patientInfoKey);
                if (!storedData) {
                  console.warn('Failed to verify localStorage data was saved');
                }
              } catch (e) {
                console.error('Error saving to localStorage:', e);
              }
            } else {
              console.warn('No appointment data returned from insert');
            }
            
            // Use the improved archive patient process
            if (selectedPatient?.id) {
              try {
                console.log('========== ARCHIVE PROCESS START ==========');
                
                // Get the appointment ID from the newly created appointment
                const newAppointmentId = data && data.length > 0 ? data[0].id : null;
                
                console.log('Patient being archived:', {
                  id: selectedPatient.id,
                  name: selectedPatient.first_name + ' ' + selectedPatient.last_name,
                  type: typeof selectedPatient.id
                });
                console.log('Appointment created with ID:', newAppointmentId);
                
                if (!newAppointmentId) {
                  console.error('Error: No appointment ID available for archiving');
                  toast.success('Appointment scheduled successfully');
                  return;
                }

                // Make sure we're sending the correct patient ID
                if (typeof selectedPatient.id !== 'string' || !selectedPatient.id.trim()) {
                  console.error('Invalid patient ID for archiving:', selectedPatient.id);
                  toast.success('Appointment scheduled but patient archiving failed - invalid ID');
                  return;
                }
                
                // Call the archive API endpoint to handle the archiving process
                const archiveRequestData = {
                  patientId: selectedPatient.id,
                  appointmentId: newAppointmentId,
                  debug: true
                };
                console.log('Sending archive request with data:', archiveRequestData);
                
                // Double-check if the patient exists in check_ins before attempting to archive
                const { data: patientExists, error: patientCheckError } = await supabase
                  .from('check_ins')
                  .select('id, full_name')
                  .eq('id', selectedPatient.id)
                  .maybeSingle();
                
                if (patientCheckError) {
                  console.error('Error checking patient in check_ins:', patientCheckError);
                  toast.success('Appointment scheduled successfully');
                  return;
                }
                
                if (!patientExists) {
                  console.warn('Patient not found in check_ins table, skipping archive call:', selectedPatient.id);
                  toast.success('Appointment scheduled successfully');
                  return;
                }
                
                console.log('Verified patient exists in check_ins:', patientExists);
                
                // Now proceed with the archive request
                try {
                  // Show immediate feedback
                  toast.success('Appointment scheduled successfully');
                  
                  // Don't show "archiving failed" for testing records
                  const isTestPatientId = selectedPatient.id.includes('00000000-0000');
                  
                  const response = await fetch('/api/archive-patient', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(archiveRequestData),
                  });
                  
                  let archiveResult;
                  let archiveSucceeded = false;
                  
                  try {
                    archiveResult = await response.json();
                    if (archiveResult && archiveResult.success) {
                      archiveSucceeded = true;
                      console.log('API Archive succeeded:', archiveResult);
                    }
                  } catch (jsonError) {
                    console.error('Error parsing archive API response:', jsonError);
                  }
                  
                  // If API archiving failed, try direct archiving method
                  if (!archiveSucceeded && !isTestPatientId) {
                    console.log('API archiving failed, trying direct method');
                    
                    try {
                      // Get full check-in data
                      const { data: checkInData, error: checkInError } = await supabase
                        .from('check_ins')
                        .select('*')
                        .eq('id', selectedPatient.id)
                        .single();
                      
                      if (checkInData && !checkInError) {
                        console.log('Direct archive: Got check-in data:', checkInData);
                        
                        // First, ensure patient is marked as archived regardless of what happens next
                        try {
                          const { error: statusUpdateError } = await supabase
                            .from('check_ins')
                            .update({ status: 'archived' })
                            .eq('id', selectedPatient.id);
                            
                          if (!statusUpdateError) {
                            console.log('Direct archive: Successfully marked patient as archived');
                            // This ensures they'll be filtered from dashboard even if full deletion fails
                  } else {
                            console.error('Direct archive: Failed initial status update:', statusUpdateError);
                          }
                        } catch (e) {
                          console.error('Direct archive: Error updating initial status:', e);
                        }
                        
                        // Create patient record in archive
                        const { error: archiveError } = await supabase
                          .from('patients')
                          .upsert([{
                            id: checkInData.id,
                            first_name: checkInData.full_name?.split(' ')[0] || 'Unknown',
                            last_name: checkInData.full_name?.split(' ').length > 1 
                              ? checkInData.full_name.split(' ').slice(1).join(' ') 
                              : 'Patient',
                            date_of_birth: checkInData.date_of_birth || 'Not Available',
                            gender: checkInData.gender || 'Not Specified',
                            contact: checkInData.contact_info || 'Not Available',
                            phone_number: checkInData.contact_info || 'Not Available',
                            name: checkInData.full_name || 'Unknown Patient',
                            created_at: checkInData.created_at || new Date().toISOString(),
                            appointment_id: newAppointmentId,
                            archived_at: new Date().toISOString()
                          }]);
                        
                        if (!archiveError) {
                          console.log('Direct archive: Successfully created patient archive record');
                          archiveSucceeded = true;
                          
                          // Try to delete from check_ins
                          const { error: deleteError } = await supabase
                            .from('check_ins')
                            .delete()
                            .eq('id', selectedPatient.id);
                          
                          if (deleteError) {
                            console.error('Direct archive: Failed to delete check-in:', deleteError);
                            
                            // If deletion fails, try to mark as archived
                            try {
                              const { error: updateError } = await supabase
                                .from('check_ins')
                                .update({ status: 'archived' })
                                .eq('id', selectedPatient.id);
                              
                              if (!updateError) {
                                console.log('Direct archive: Marked check-in as archived');
                              } else {
                                console.error('Direct archive: Failed to mark as archived:', updateError);
                              }
                            } catch (e) {
                              console.error('Direct archive: Error updating status:', e);
                            }
                          } else {
                            console.log('Direct archive: Successfully deleted check-in');
                          }
                        } else {
                          console.error('Direct archive: Failed to create patient archive record:', archiveError);
                        }
                      } else {
                        console.error('Direct archive: Failed to get check-in data:', checkInError);
                      }
                    } catch (directError) {
                      console.error('Error in direct archiving process:', directError);
                    }
                  }
                  
                  // Trigger dashboard refresh to update the patients list
                  setTimeout(() => {
                    if (typeof window !== 'undefined' && window.refreshDashboard) {
                      console.log('===== TRIGGERING DASHBOARD REFRESH AFTER ARCHIVING =====');
                      window.refreshDashboard();
                      
                      // Verify the patient's status after archiving
                      setTimeout(async () => {
                        try {
                          console.log('Verifying patient archiving status...');
                          
                          // Check if patient still exists in check_ins
                          const { data: checkInVerify, error: verifyError } = await supabase
                            .from('check_ins')
                            .select('id, status')
                            .eq('id', selectedPatient.id)
                            .maybeSingle();
                            
                          if (verifyError) {
                            console.error('Verification error:', verifyError);
                          } else if (checkInVerify) {
                            console.log('ATTENTION: Patient still exists in check_ins with status:', checkInVerify.status);
                            
                            // If patient exists but is not archived, force archive status
                            if (checkInVerify.status !== 'archived') {
                              console.log('Forcing archived status update...');
                              const { error: forceUpdateError } = await supabase
                                .from('check_ins')
                                .update({ status: 'archived' })
                                .eq('id', selectedPatient.id);
                                
                              if (forceUpdateError) {
                                console.error('Force update failed:', forceUpdateError);
                              } else {
                                console.log('Forced update successful!');
                                // Final dashboard refresh
                                if (window.refreshDashboard) {
                                  window.refreshDashboard();
                                }
                              }
                            }
                          } else {
                            console.log('Patient successfully removed from check_ins table!');
                          }
                          
                          // Check if patient exists in patients archive
                          const { data: archiveVerify, error: archiveVerifyError } = await supabase
                            .from('patients')
                            .select('id, first_name, last_name')
                            .eq('id', selectedPatient.id)
                            .maybeSingle();
                            
                          if (archiveVerifyError) {
                            console.error('Archive verification error:', archiveVerifyError);
                          } else if (archiveVerify) {
                            console.log('Patient successfully archived in patients table:', 
                              `${archiveVerify.first_name} ${archiveVerify.last_name}`);
                          } else {
                            console.error('Patient NOT found in patients archive table!');
                            
                            // Automatic fix - trigger the fix API to ensure the patient gets archived properly
                            console.log('Triggering automatic fix for patients archive...');
                            try {
                              const fixResponse = await fetch('/api/db-fix/patients-archive');
                              const fixResult = await fixResponse.json();
                              console.log('Archive fix result:', fixResult);
                              
                              // Check again after fix
                              const { data: recheck, error: recheckError } = await supabase
                                .from('patients')
                                .select('id')
                                .eq('id', selectedPatient.id)
                                .maybeSingle();
                                
                              if (recheck) {
                                console.log('FIXED: Patient now exists in archive after fix!');
                              } else {
                                console.error('CRITICAL: Patient still missing from archive after fix!');
                              }
                            } catch (fixError) {
                              console.error('Error triggering archive fix:', fixError);
                            }
                          }
                        } catch (verifyError) {
                          console.error('Error during verification:', verifyError);
                        }
                      }, 2000);
                      
                      // Double check after a short delay that the dashboard has updated
                      setTimeout(() => {
                        console.log('Verifying dashboard refresh completed');
                        if (window.refreshDashboard) {
                          window.refreshDashboard();
                        }
                      }, 5000);
                    } else {
                      console.error('Dashboard refresh function not available');
                    }
                  }, 500);
                } catch (fetchError) {
                  console.error('Error making archive API request:', fetchError);
                  toast.success('Appointment scheduled successfully');
                }
              } catch (archiveError) {
                console.error('Error in archive process:', archiveError);
                toast.success('Appointment scheduled successfully');
              }
            } else {
              toast.success('Appointment scheduled successfully');
            }
          }
        } catch (attemptError) {
          console.error(`Error in attempt ${attemptCount}:`, attemptError);
          if (attemptCount === MAX_ATTEMPTS) {
            throw attemptError;
          }
        }
      }
      if (appointmentCreated) {
        setIsBookingDialogOpen(false);
        setAppointmentReason('General Checkup');
        setAppointmentTitle('');
        setSelectedPatient(null);
        setSelectedStaff("_none");
        setAppointmentDepartment('General');
        setIsRecurring(false);
        setRecurrencePattern('none');
        setAppointmentDate(undefined);
        setAppointmentEndDate(undefined);
        fetchAppointments();
      } else {
        toast.error('Failed to schedule appointment after multiple attempts');
      }
    } catch (err) {
      console.error('Error creating appointment:', err);
      toast.error(`Failed to schedule appointment: ${(err as Error).message || 'Unknown error'}`);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEventClick = async (clickInfo: any) => {
    const appointmentData = clickInfo.event.extendedProps;
    
    // Try to fetch patient data from localStorage
    if (appointmentData.id) {
      const storedPatientData = localStorage.getItem(`appointment_${appointmentData.id}_patient`);
      if (storedPatientData) {
        try {
          const patientInfo = JSON.parse(storedPatientData);
          // Attach the patient info directly to the appointment object
          appointmentData.patient_name = patientInfo.name;
          appointmentData.patient_dob = patientInfo.dob;
          appointmentData.patient_gender = patientInfo.gender;
          appointmentData.patient_contact = patientInfo.contact;
        } catch (error) {
          console.error('Error parsing stored patient data:', error);
        }
      }
    }
    
    setSelectedAppointment(appointmentData);
    setIsDetailsDialogOpen(true);
  };

  // New function to handle booking from details
  const handleBookFromDetails = () => {
    if (!selectedAppointment) return;
    
    // Find the patient from the selected appointment
    const patient = patients.find(p => p.id === selectedAppointment.patient_id);
    
    // Set all appointment details to be reused
    if (patient) {
      setSelectedPatient(patient);
    }
    
    // Set appointment date
    if (selectedAppointment.appointment_date) {
      const appointmentDateTime = new Date(selectedAppointment.appointment_date);
      setAppointmentDate(appointmentDateTime);
      
      // Set time in the correct format
      const hours = appointmentDateTime.getHours();
      const minutes = appointmentDateTime.getMinutes();
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
      
      setSelectedTime(`${displayHour}:${minutes === 0 ? '00' : minutes} ${period}`);
      
      // Generate available times
      const times = [];
      for (let hour = 8; hour < 18; hour++) {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        
        times.push(`${displayHour}:00 ${period}`);
        times.push(`${displayHour}:30 ${period}`);
      }
      setAvailableTimes(times);
    }
    
    // Set department
    if (selectedAppointment.department) {
      setAppointmentDepartment(selectedAppointment.department);
    }
    
    // Set staff
    if (selectedAppointment.staff_id) {
      setSelectedStaff(selectedAppointment.staff_id);
    } else {
      setSelectedStaff("_none");
    }
    
    // Set notes
    if (selectedAppointment.notes) {
      setAppointmentTitle(selectedAppointment.notes);
    }
    
    // Set duration (hidden field)
    if (selectedAppointment.duration) {
      setAppointmentDuration(selectedAppointment.duration);
    } else {
      setAppointmentDuration("30");
    }
    
    // Set appointment reason (hidden field)
    setAppointmentReason("Follow-up");
    
    // Reset recurring options (hidden fields)
    setIsRecurring(false);
    setRecurrencePattern('none');
    
    // Close details dialog and open booking dialog
    setIsDetailsDialogOpen(false);
    setIsBookingDialogOpen(true);
  };

  const handleUpdateAppointment = async (status: 'completed' | 'cancelled' | 'no-show') => {
    if (!selectedAppointment) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', selectedAppointment.id);

      if (error) throw error;

      setAppointments(appointments.map(evt => 
        evt.id === selectedAppointment.id 
          ? {...evt, extendedProps: {...evt.extendedProps, status}} 
          : evt
      ));
      
      setIsDetailsDialogOpen(false);
      toast.success(`Appointment marked as ${status}`);
    } catch (err) {
      console.error('Error updating appointment:', err);
      toast.error('Failed to update appointment');
    }
  };

  // Function to handle recurring appointments
  const createRecurringAppointments = async (baseAppointment: any) => {
    try {
      if (recurrencePattern === 'none' || !isRecurring) {
        // Just create one appointment
        return await createSingleAppointment(baseAppointment);
      }
      
      const occurrences = parseInt(recurrenceOccurrences);
      const appointments = [];
      
      // Create the base appointment
      const firstAppointment = await createSingleAppointment(baseAppointment);
      appointments.push(firstAppointment);
      
      // Set up recurring pattern
      const startDate = new Date(baseAppointment.appointment_date);
      let nextDate = new Date(startDate);
      
      for (let i = 1; i < occurrences; i++) {
        if (recurrencePattern === 'daily') {
          nextDate = new Date(nextDate.setDate(nextDate.getDate() + 1));
        } else if (recurrencePattern === 'weekly') {
          nextDate = new Date(nextDate.setDate(nextDate.getDate() + 7));
        } else if (recurrencePattern === 'biweekly') {
          nextDate = new Date(nextDate.setDate(nextDate.getDate() + 14));
        } else if (recurrencePattern === 'monthly') {
          nextDate = new Date(nextDate.setMonth(nextDate.getMonth() + 1));
        }
        
        // Clone the appointment data but update the date
        const recurringAppointment = {
          ...baseAppointment,
          appointment_date: nextDate.toISOString(),
          recurrence: recurrencePattern,
          recurrence_group: firstAppointment.id // Link to the first appointment
        };
        
        // Create the recurring appointment
        await createSingleAppointment(recurringAppointment);
      }
      
      return firstAppointment;
    } catch (error) {
      console.error('Error creating recurring appointments:', error);
      throw error;
    }
  };

  const createSingleAppointment = async (appointmentData: any) => {
    const { data, error } = await supabase
      .from('appointments')
      .insert([appointmentData])
      .select();
      
    if (error) throw error;
    return data[0];
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        {/* Dashboard navigation */}
        <div className="mb-6 flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Appointment Scheduler</h1>
          <div></div> {/* Empty div for flex spacing */}
        </div>

        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2">Loading appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {/* Dashboard navigation */}
      <div className="mb-6 flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
        <h1 className="text-2xl font-bold">Appointment Scheduler</h1>
        <Button 
          onClick={() => {
            setSelectedTimeSlot(null);
            setAppointmentDate(new Date());
            setAppointmentReason('General Checkup');
            setIsBookingDialogOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          New Appointment
        </Button>
      </div>

      {loading ? (
        <div className="w-full flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
      ) : databaseError ? (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded relative mb-6">
          <strong className="font-bold">Database Error: </strong>
          <span className="block sm:inline">{databaseError}</span>
          <div className="mt-2">
            <Button 
              onClick={() => {
                setIsFixingDatabase(true);
                  // Run all database fixes
                  console.log('Applying comprehensive database fixes...');
                  
                  // First fix patients table
                fetch('/api/db-fix/patients')
                  .then(() => fetch('/api/db-fix/appointments'))
                  .then(() => fetch('/api/db-fix/contact-info'))
                  .then(() => fetch('/api/db-fix'))
                  .then(() => {
                  toast.success('Database fix applied. Try again.');
                  setDatabaseError(null);
                  
                  // Force-refresh appointments to reflect schema changes
                  fetchAppointments();
                    setIsFixingDatabase(false);
                  })
                  .catch(error => {
                  console.error('Failed to fix database:', error);
                  toast.error('Failed to fix database');
                  setIsFixingDatabase(false);
                  });
              }}
              disabled={isFixingDatabase}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isFixingDatabase ? 'Fixing...' : 'Attempt Fix'}
            </Button>
        </div>
          </div>
      ) : null}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          events={appointments}
          selectable={true}
          select={handleDateSelect}
          eventClick={handleEventClick}
          height="auto"
          allDaySlot={false}
          slotMinTime="08:00:00"
          slotMaxTime="18:00:00"
        />
      </div>

      {/* Appointment Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
            <DialogDescription>
              {selectedAppointment?.notes || 'Appointment'}
            </DialogDescription>
          </DialogHeader>
          
          <AppointmentDetails 
            appointment={selectedAppointment} 
            patient={patients.find(p => p.id === selectedAppointment?.patient_id) || selectedPatient}
            staffMember={staffMembers.find(s => s.id === selectedAppointment?.staff_id)}
            onClose={() => setIsDetailsDialogOpen(false)}
            onUpdate={handleUpdateAppointment}
            onBookFollow={handleBookFromDetails}
          />
        </DialogContent>
      </Dialog>

      {/* Book Appointment Dialog */}
      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent className="sm:max-w-[525px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Book Appointment</DialogTitle>
            <DialogDescription>
              Fill in the details to schedule a new appointment
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Patient Name Input */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="patientName" className="text-right">
                Patient Name
              </Label>
              <div className="col-span-3">
                <Input
                  id="patientName"
                  placeholder="Enter patient name"
                  value={selectedPatient?.name || `${selectedPatient?.first_name || ''} ${selectedPatient?.last_name || ''}`.trim()}
                  onChange={e => {
                    const fullName = e.target.value || '';
                    const nameParts = fullName.trim().split(' ');
                    const firstName = nameParts[0] || '';
                    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
                    setSelectedPatient(createPatientInfo({
                      ...selectedPatient,
                      name: fullName,
                      first_name: firstName,
                      last_name: lastName,
                      date_of_birth: selectedPatient?.date_of_birth,
                      gender: selectedPatient?.gender,
                      contact: selectedPatient?.contact,
                      phone_number: selectedPatient?.phone_number || selectedPatient?.contact
                    }));
                  }}
                  className="w-full"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dob" className="text-right">
                Date of Birth
              </Label>
              <div className="col-span-3">
                <Input
                  id="dob"
                  type="date"
                  value={selectedPatient?.date_of_birth ? selectedPatient.date_of_birth.slice(0, 10) : ''}
                  onChange={e => {
                    if (!selectedPatient) return;
                    
                    setSelectedPatient(createPatientInfo({
                    ...selectedPatient,
                    date_of_birth: e.target.value
                    }));
                  }}
                  className="w-full"
                />
              </div>
            </div>
            
            {/* Gender */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="gender" className="text-right">
                Gender
              </Label>
              <div className="col-span-3">
                <select
                  id="gender"
                  name="gender"
                  value={selectedPatient?.gender || 'Not Specified'}
                  onChange={e => {
                    if (!selectedPatient) return;
                    
                    setSelectedPatient(createPatientInfo({
                      ...selectedPatient,
                      gender: e.target.value || 'Not Specified'
                    }));
                  }}
                  className="w-full border border-gray-300 rounded-md p-2"
                  required
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Not Specified">Not Specified</option>
                </select>
              </div>
            </div>
            
            {/* Phone number field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Phone Number
              </Label>
              <div className="col-span-3">
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter phone number"
                  value={selectedPatient?.phone_number || selectedPatient?.contact || ''}
                  onChange={e => {
                    if (!selectedPatient) return;
                    
                    setSelectedPatient(createPatientInfo({
                      ...selectedPatient,
                      phone_number: e.target.value,
                      contact: e.target.value // Update legacy field for compatibility
                    }));
                  }}
                  className="w-full"
                />
              </div>
            </div>
            
            {/* Date Selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Date
              </Label>
              <div className="col-span-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !appointmentDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {appointmentDate ? format(appointmentDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={appointmentDate}
                      onSelect={setAppointmentDate}
                      disabled={(date) => {
                        // Disable dates in the past
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            {/* Time Selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="time" className="text-right">
                Time
              </Label>
              <div className="col-span-3">
                <Select 
                  value={selectedTime} 
                  onValueChange={(value: string) => setSelectedTime(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTimes.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Department */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="department" className="text-right">
                Department
              </Label>
              <div className="col-span-3">
                <Select 
                  value={appointmentDepartment} 
                  onValueChange={(value: string) => setAppointmentDepartment(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Cardiology">Cardiology</SelectItem>
                    <SelectItem value="Neurology">Neurology</SelectItem>
                    <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                    <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                    <SelectItem value="Dermatology">Dermatology</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Staff Selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="staff" className="text-right">
                Provider
              </Label>
              <div className="col-span-3">
                <Select 
                  value={selectedStaff} 
                  onValueChange={(value: string) => setSelectedStaff(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Auto Assign</SelectItem>
                    {staffMembers
                      .filter(staff => appointmentDepartment === 'General' || staff.department === appointmentDepartment)
                      .map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.first_name} {staff.last_name} ({staff.job_title})
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Notes */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Notes
              </Label>
              <Input
                id="title"
                placeholder="Additional notes (optional)"
                className="col-span-3"
                value={appointmentTitle}
                onChange={(e) => setAppointmentTitle(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBookingDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBookAppointment} disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-opacity-50 border-t-white"></div>
                  Scheduling...
                </>
              ) : 'Schedule Appointment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 