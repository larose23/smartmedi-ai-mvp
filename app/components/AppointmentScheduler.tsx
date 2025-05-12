'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { EventInput, DateSelectArg, EventClickArg } from '@fullcalendar/core'
import { toast } from 'react-hot-toast'
import { AppointmentService } from '@/lib/services/AppointmentService'
import {
  SchedulingPreferences,
  TimeSlot,
  Provider,
  SchedulingResult
} from '@/types/scheduling'
import { useAuth } from '@/lib/hooks/useAuth'
import MultiProviderCalendar from './MultiProviderCalendar'
import RecurringAppointmentForm from './RecurringAppointmentForm'

// Import FullCalendar styles
import '@fullcalendar/common/main.css'
import '@fullcalendar/daygrid/main.css'
import '@fullcalendar/timegrid/main.css'

interface Appointment {
  id: string
  patient_id: string
  staff_id: string
  appointment_date: string
  status: string
  notes: string
  is_recurring?: boolean
  recurrence_pattern?: string
  recurrence_end_date?: string
  patient?: {
    name: string
  }
  staff?: {
    name: string
    role: string
  }
}

interface Patient {
  id: string
  name: string
}

interface Staff {
  id: string
  name: string
  role: string
}

interface AppointmentModalProps {
  appointment: Appointment | null
  onClose: () => void
  onUpdate: (id: string, status: string) => void
}

interface RecurringAppointment {
  is_recurring: boolean
  pattern: 'daily' | 'weekly' | 'monthly'
  end_date: string
}

const AppointmentModal = ({ appointment, onClose, onUpdate }: AppointmentModalProps) => {
  if (!appointment) return null

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 p-6 space-y-4">
        <div className="flex justify-between items-start">
          <h3 className="text-xl font-semibold">Appointment Details</h3>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Patient</p>
            <p className="font-medium">{appointment.patient?.name || 'Unknown Patient'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Staff</p>
            <p className="font-medium">{appointment.staff?.name || 'Unknown Staff'} ({appointment.staff?.role})</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Date & Time</p>
            <p className="font-medium">
              {new Date(appointment.appointment_date).toLocaleDateString()} at{' '}
              {new Date(appointment.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <select
              value={appointment.status}
              onChange={(e) => onUpdate(appointment.id, e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-gray-500">Notes</p>
            <p className="mt-1">{appointment.notes || 'No notes available'}</p>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <button
            onClick={handleClose}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

const AppointmentScheduler = () => {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [showNewAppointmentForm, setShowNewAppointmentForm] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [newAppointment, setNewAppointment] = useState({
    patient_id: '',
    staff_id: '',
    appointment_date: '',
    appointment_time: '',
    notes: ''
  })
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [calendarKey, setCalendarKey] = useState(0)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [showDayView, setShowDayView] = useState(false)
  const [dayAppointments, setDayAppointments] = useState<Appointment[]>([])
  const [recurringAppointment, setRecurringAppointment] = useState({
    is_recurring: false,
    pattern: 'weekly',
    end_date: ''
  })
  const [preferences, setPreferences] = useState<SchedulingPreferences>({
    urgency: 'medium',
    maxWaitTime: 10080 // 1 week in minutes
  })
  const [schedulingResult, setSchedulingResult] = useState<SchedulingResult | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [showRecurringForm, setShowRecurringForm] = useState(false)

  useEffect(() => {
    loadAppointments()
    loadPatientsAndStaff()
    if (user) {
      loadPatientPreferences()
    }
    // Set up real-time subscription
    const subscription = supabase
      .channel('appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, 
        () => {
          loadAppointments()
          // Force calendar refresh when appointments change
          setCalendarKey(prev => prev + 1)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [selectedDate, selectedStatus, user])

  async function loadPatientsAndStaff() {
    try {
      setLoading(true)
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select('id, name')
      
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, name, role')

      if (patientsError || staffError) {
        throw new Error(patientsError?.message || staffError?.message)
      }

      setPatients(patientsData || [])
      setStaff(staffData || [])
    } catch (err) {
      console.error('Error loading patients and staff:', err)
      setError(err instanceof Error ? err.message : 'Failed to load patients and staff')
      toast.error('Failed to load patients and staff data')
    } finally {
      setLoading(false)
    }
  }

  const loadPatientPreferences = async () => {
    try {
      const { data: patient } = await supabase
        .from('patients')
        .select('preferred_providers, preferred_specialties')
        .eq('id', user.id)
        .single()

      if (patient) {
        setPreferences(prev => ({
          ...prev,
          preferredProviders: patient.preferred_providers,
          preferredSpecialties: patient.preferred_specialties
        }))
      }
    } catch (error) {
      console.error('Error loading patient preferences:', error)
    }
  }

  const createRecurringAppointments = async (baseAppointment: Omit<Appointment, 'id'>): Promise<Omit<Appointment, 'id'>[]> => {
    if (!recurringAppointment.end_date) {
      throw new Error('End date is required for recurring appointments')
    }

    const appointments: Omit<Appointment, 'id'>[] = []
    const startDate = new Date(baseAppointment.appointment_date)
    const endDate = new Date(recurringAppointment.end_date)
    
    let currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      appointments.push({
        ...baseAppointment,
        appointment_date: currentDate.toISOString(),
        is_recurring: true,
        recurrence_pattern: recurringAppointment.pattern,
        recurrence_end_date: recurringAppointment.end_date
      })

      // Move to next date based on pattern
      switch (recurringAppointment.pattern) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1)
          break
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7)
          break
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1)
          break
      }
    }

    return appointments
  }

  const createAppointment = async () => {
    try {
      setLoading(true)
      
      if (!newAppointment.patient_id || !newAppointment.staff_id || !newAppointment.appointment_date) {
        toast.error('Please fill in all required fields')
        return
      }

      // Check for existing appointments
      const existingAppointments = await supabase
        .from('appointments')
        .select('*')
        .eq('staff_id', newAppointment.staff_id)
        .eq('appointment_date', newAppointment.appointment_date)
        .eq('status', 'scheduled')

      if (existingAppointments.error) {
        throw new Error('Failed to check for existing appointments')
      }

      if (existingAppointments.data && existingAppointments.data.length > 0) {
        toast.error('An appointment already exists at this time')
        return
      }

      // Create the base appointment object
      const baseAppointment: Omit<Appointment, 'id'> = {
        patient_id: newAppointment.patient_id,
        staff_id: newAppointment.staff_id,
        appointment_date: newAppointment.appointment_date,
        status: 'scheduled',
        notes: newAppointment.notes || '',
        is_recurring: false
      }

      if (recurringAppointment.is_recurring) {
        // Generate recurring appointments
        const recurringAppointments = await createRecurringAppointments(baseAppointment)
        
        // Insert all recurring appointments
        const { error: recurringError } = await supabase
          .from('appointments')
          .insert(recurringAppointments)

        if (recurringError) {
          throw new Error('Failed to create recurring appointments')
        }
      } else {
        // Insert single appointment
        const { error: singleError } = await supabase
          .from('appointments')
          .insert([baseAppointment])

        if (singleError) {
          throw new Error('Failed to create appointment')
        }
      }

      toast.success('Appointment created successfully')
      
      // Direct archive method that guarantees patients move to the archive
      try {
        if (newAppointment.patient_id) {
          console.log('Starting direct archive process for patient ID:', newAppointment.patient_id)
          
          // Step 1: Get check-in data
          const { data: checkInData, error: checkInError } = await supabase
            .from('check_ins')
            .select('*')
            .eq('id', newAppointment.patient_id)
            .single()
          
          if (checkInError) {
            console.error('Error fetching check-in data:', checkInError)
          }
          
          if (checkInData) {
            console.log('Found check-in data:', checkInData)
            
            // Step 2: Insert directly into patients table
            const { error: insertError } = await supabase
              .from('patients')
              .insert([{
                id: checkInData.id,
                first_name: checkInData.full_name?.split(' ')[0] || 'Unknown',
                last_name: checkInData.full_name?.split(' ').length > 1 
                  ? checkInData.full_name?.split(' ').slice(1).join(' ') 
                  : 'Patient',
                date_of_birth: checkInData.date_of_birth || 'Not Available',
                gender: checkInData.gender || 'Not Specified',
                contact: checkInData.contact_info || 'Not Available',
                created_at: new Date().toISOString(),
                name: checkInData.full_name || 'Unknown Patient'
              }])
            
            if (insertError) {
              // If insert fails, try upsert instead
              console.error('Insert error, trying upsert:', insertError)
              const { error: upsertError } = await supabase
                .from('patients')
                .upsert([{
                  id: checkInData.id,
                  first_name: checkInData.full_name?.split(' ')[0] || 'Unknown',
                  last_name: checkInData.full_name?.split(' ').length > 1 
                    ? checkInData.full_name?.split(' ').slice(1).join(' ') 
                    : 'Patient',
                  date_of_birth: checkInData.date_of_birth || 'Not Available',
                  gender: checkInData.gender || 'Not Specified',
                  contact: checkInData.contact_info || 'Not Available',
                  created_at: new Date().toISOString(),
                  name: checkInData.full_name || 'Unknown Patient'
                }], { onConflict: 'id' })
              
              if (upsertError) {
                console.error('Final upsert error:', upsertError)
              } else {
                console.log('Patient successfully upserted to archive')
              }
            } else {
              console.log('Patient successfully inserted to archive')
            }
            
            // Step 3: Delete from check_ins to remove from dashboard
            const { error: deleteError } = await supabase
              .from('check_ins')
              .delete()
              .eq('id', checkInData.id)
            
            if (deleteError) {
              console.error('Error deleting check-in:', deleteError)
            } else {
              console.log('Check-in successfully deleted')
            }
          } else {
            console.log('No check-in data found for ID:', newAppointment.patient_id)
          }
        }
      } catch (archiveError) {
        console.error('Error in direct archive process:', archiveError)
      }
      
      setShowNewAppointmentForm(false)
      loadAppointments()
    } catch (error) {
      console.error('Error creating appointment:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create appointment')
    } finally {
      setLoading(false)
    }
  }

  async function updateAppointmentStatus(appointmentId: string, newStatus: string) {
    try {
      setLoading(true)
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId)

      if (error) {
        toast.error('Failed to update appointment status')
        throw error
      }

      toast.success('Appointment status updated successfully')
      loadAppointments()
    } catch (err) {
      console.error('Error updating appointment status:', err)
      setError(err instanceof Error ? err.message : 'Failed to update appointment status')
    } finally {
      setLoading(false)
    }
  }

  async function loadAppointments() {
    try {
      setLoading(true)
      setError(null)
      
      // Get all appointments without date filter
      let query = supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: true })

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus)
      }

      const { data: appointmentsData, error: appointmentsError } = await query

      if (appointmentsError) {
        throw new Error(`Failed to fetch appointments: ${appointmentsError.message}`)
      }

      if (!appointmentsData || appointmentsData.length === 0) {
        setAppointments([])
        return
      }

      // Get patient details
      const patientIds = appointmentsData.map(apt => apt.patient_id)
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select('id, name')
        .in('id', patientIds)

      if (patientsError) {
        throw new Error(`Failed to fetch patient details: ${patientsError.message}`)
      }

      // Get staff details
      const staffIds = appointmentsData.map(apt => apt.staff_id)
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, name, role')
        .in('id', staffIds)

      if (staffError) {
        throw new Error(`Failed to fetch staff details: ${staffError.message}`)
      }

      // Combine the data
      const formattedAppointments = appointmentsData.map(apt => {
        const patient = Array.isArray(patientsData) ? patientsData.find(p => p.id === apt.patient_id) : undefined
        const staff = Array.isArray(staffData) ? staffData.find(s => s.id === apt.staff_id) : undefined

        return {
          ...apt,
          patient: patient ? { name: patient.name } : undefined,
          staff: staff ? { name: staff.name, role: staff.role } : undefined
        }
      })

      setAppointments(formattedAppointments)
    } catch (err) {
      console.error('Error loading appointments:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred while loading appointments')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled':
        return { bg: 'bg-blue-100', text: 'text-blue-800' }
      case 'completed':
        return { bg: 'bg-green-100', text: 'text-green-800' }
      case 'cancelled':
        return { bg: 'bg-red-100', text: 'text-red-800' }
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800' }
    }
  }

  const handleEventClick = (info: EventClickArg) => {
    const appointment = appointments.find(a => a.id === info.event.id)
    if (appointment) {
      setSelectedAppointment(appointment)
      setIsModalOpen(true)
    }
  }

  const handleEventDrop = async (info: EventClickArg) => {
    try {
      setLoading(true)
      const newDate = info.event.start
      if (!newDate) {
        throw new Error('Invalid date')
      }

      const { error } = await supabase
        .from('appointments')
        .update({ appointment_date: newDate.toISOString() })
        .eq('id', info.event.id)

      if (error) {
        toast.error('Failed to reschedule appointment')
        throw error
      }

      toast.success('Appointment rescheduled successfully')
      loadAppointments()
    } catch (err) {
      console.error('Error rescheduling appointment:', err)
      setError(err instanceof Error ? err.message : 'Failed to reschedule appointment')
      // Revert the event position
      if (info.event.start) {
        info.event.setStart(info.event.start)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedAppointment(null)
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        handleModalClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isModalOpen])

  const handleViewChange = (newView: 'list' | 'calendar') => {
    setView(newView)
    if (newView === 'calendar') {
      setCalendarKey(prev => prev + 1)
    }
  }

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const selectedDate = selectInfo.start
    setSelectedDay(selectedDate)
    setShowDayView(true)
    
    // Filter appointments for the selected day
    const dayApps = appointments.filter(appointment => {
      const appDate = new Date(appointment.appointment_date)
      return appDate.toDateString() === selectedDate.toDateString()
    })
    
    setDayAppointments(dayApps)
  }

  const handleDayClick = (arg: any) => {
    const clickedDate = arg.date
    // Format the date as YYYY-MM-DD
    const formattedDate = clickedDate.toISOString().split('T')[0]
    setSelectedDay(clickedDate)
    
    // Filter appointments for the selected day
    const dayApps = appointments.filter(appointment => {
      const appDate = new Date(appointment.appointment_date)
      return appDate.toDateString() === clickedDate.toDateString()
    })
    
    setDayAppointments(dayApps)
    setShowDayView(true)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const handleTimeSlotClick = (time: string) => {
    if (!selectedDay) return

    // Create the appointment date in local time
    const [hours, minutes] = time.split(':').map(Number)
    const appointmentDate = new Date(selectedDay)
    appointmentDate.setHours(hours, minutes, 0, 0)
    
    // Set the appointment with the local date and time
    setNewAppointment({
      ...newAppointment,
      appointment_date: appointmentDate.toISOString(),
      appointment_time: time
    })
    
    // Show the appointment form
    setShowNewAppointmentForm(true)
    setShowDayView(false)
  }

  const isTimeSlotAvailable = (time: string, staffId: string) => {
    return !dayAppointments.some(appointment => {
      const appDate = new Date(appointment.appointment_date)
      const [hours, minutes] = time.split(':').map(Number)
      return (
        appointment.staff_id === staffId &&
        appDate.getUTCHours() === hours &&
        appDate.getUTCMinutes() === minutes
      )
    })
  }

  // Update the calendarEvents mapping to handle timezone correctly
  const calendarEvents = appointments.map((appointment) => {
    // Parse the stored date string without timezone adjustments
    const appointmentDate = new Date(appointment.appointment_date)
    
    return {
      id: appointment.id.toString(),
      title: `${appointment.patient?.name || 'Unknown Patient'} - ${appointment.staff?.name || 'Unknown Staff'}`,
      start: appointmentDate,
      end: new Date(appointmentDate.getTime() + 30 * 60000), // 30 minutes duration
      backgroundColor: appointment.status === 'completed' ? '#4CAF50' : 
                      appointment.status === 'cancelled' ? '#f44336' : 
                      appointment.status === 'no-show' ? '#ff9800' : '#2196F3',
      borderColor: appointment.status === 'completed' ? '#4CAF50' : 
                  appointment.status === 'cancelled' ? '#f44336' : 
                  appointment.status === 'no-show' ? '#ff9800' : '#2196F3',
      textColor: '#ffffff',
      extendedProps: {
        status: appointment.status,
        notes: appointment.notes,
        is_recurring: appointment.is_recurring,
        recurrence_pattern: appointment.recurrence_pattern,
        recurrence_end_date: appointment.recurrence_end_date
      }
    }
  }).filter(Boolean) as EventInput[]

  // Generate time slots for the day
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = []
    const startHour = 8 // 8 AM
    const endHour = 18 // 6 PM
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        slots.push({
          time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
          isAvailable: true
        })
      }
    }
    return slots
  }

  // Get available staff for a specific time slot
  const getAvailableStaff = (time: string) => {
    return staff.filter(staffMember => 
      isTimeSlotAvailable(time, staffMember.id)
    )
  }

  // Get staff member's appointments for the selected day
  const getStaffAppointments = (staffId: string) => {
    return dayAppointments.filter(appointment => appointment.staff_id === staffId)
  }

  const handleFindSlots = async () => {
    if (!user) {
      toast.error('Please log in to schedule an appointment')
      return
    }

    setLoading(true)
    try {
      const result = await AppointmentService.findOptimalSlots(
        { id: user.id } as any, // We only need the ID for this operation
        preferences
      )
      setSchedulingResult(result)
    } catch (error) {
      console.error('Error finding slots:', error)
      toast.error('Failed to find available slots')
    } finally {
      setLoading(false)
    }
  }

  const handleBookAppointment = async () => {
    if (!selectedSlot || !reason) {
      toast.error('Please select a time slot and provide a reason')
      return
    }

    setLoading(true)
    try {
      await AppointmentService.bookAppointment(
        user.id,
        selectedSlot.id,
        preferences.urgency === 'high' ? 'urgent' : 'regular',
        reason,
        notes
      )
      toast.success('Appointment booked successfully!')
      setSelectedSlot(null)
      setReason('')
      setNotes('')
      setSchedulingResult(null)
    } catch (error) {
      console.error('Error booking appointment:', error)
      toast.error('Failed to book appointment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Appointment Scheduler</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => handleViewChange(view === 'list' ? 'calendar' : 'list')}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            {view === 'list' ? 'Switch to Calendar' : 'Switch to List'}
          </button>
          <button
            onClick={() => setShowNewAppointmentForm(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            New Appointment
          </button>
        </div>
      </div>

      {view === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-4">
              <FullCalendar
                key={calendarKey}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                events={calendarEvents}
                eventClick={handleEventClick}
                eventDrop={handleEventDrop}
                selectable={true}
                select={handleDateSelect}
                editable={true}
                eventTimeFormat={{
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                }}
                slotMinTime="08:00:00"
                slotMaxTime="18:00:00"
                allDaySlot={false}
                height="auto"
                eventDidMount={(info) => {
                  if (info.event.extendedProps.is_recurring) {
                    info.el.classList.add('recurring-event')
                    info.el.title = `Recurring: ${info.event.extendedProps.recurrence_pattern} until ${new Date(info.event.extendedProps.recurrence_end_date).toLocaleDateString()}`
                  }
                }}
              />
            </div>
          </div>

          {showDayView && selectedDay && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {selectedDay.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h3>
                <button
                  onClick={() => setShowDayView(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-700">Appointments</h4>
                {dayAppointments.length > 0 ? (
                  <div className="space-y-2">
                    {dayAppointments.map(appointment => (
                      <div 
                        key={appointment.id}
                        className="p-2 rounded border border-gray-200 hover:border-blue-500 cursor-pointer"
                        onClick={() => {
                          setSelectedAppointment(appointment)
                          setIsModalOpen(true)
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">
                            {formatTime(appointment.appointment_date)}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(appointment.status).bg} ${getStatusColor(appointment.status).text}`}>
                            {appointment.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {appointment.patient?.name} with {appointment.staff?.name}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No appointments scheduled</p>
                )}

                <div className="pt-4">
                  <h4 className="font-medium text-gray-700 mb-2">Available Time Slots</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {generateTimeSlots().map((slot: TimeSlot, index: number) => {
                      const availableStaff = getAvailableStaff(slot.time)
                      const isBooked = availableStaff.length === 0
                      
                      return (
                        <button
                          key={index}
                          onClick={() => !isBooked && handleTimeSlotClick(slot.time)}
                          disabled={isBooked}
                          className={`p-2 rounded text-sm ${
                            isBooked 
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                              : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                          }`}
                          title={isBooked ? 'No staff available at this time' : `${availableStaff.length} staff available`}
                        >
                          {slot.time}
                          {!isBooked && (
                            <span className="text-xs block text-blue-500">
                              {availableStaff.length} staff available
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="font-medium text-gray-700 mb-2">Staff Availability</h4>
                  <div className="space-y-2">
                    {staff.map(staffMember => {
                      const staffAppointments = getStaffAppointments(staffMember.id)
                      return (
                        <div key={staffMember.id} className="p-2 bg-gray-50 rounded">
                          <div className="font-medium">{staffMember.name} ({staffMember.role})</div>
                          <div className="text-sm text-gray-600">
                            {staffAppointments.length > 0 ? (
                              <div>
                                Booked at: {staffAppointments.map(app => 
                                  new Date(app.appointment_date).toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })
                                ).join(', ')}
                              </div>
                            ) : (
                              <div>Available all day</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="space-y-4">
            {appointments.map(appointment => (
              <div
                key={appointment.id}
                className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                onClick={() => {
                  setSelectedAppointment(appointment)
                  setIsModalOpen(true)
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{appointment.patient?.name}</h3>
                    <p className="text-sm text-gray-600">
                      {formatTime(appointment.appointment_date)} with {appointment.staff?.name}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(appointment.status).bg} ${getStatusColor(appointment.status).text}`}>
                    {appointment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isModalOpen && (
        <AppointmentModal
          appointment={selectedAppointment}
          onClose={handleModalClose}
          onUpdate={updateAppointmentStatus}
        />
      )}

      {showNewAppointmentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 space-y-4">
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-semibold">New Appointment</h3>
              <button
                onClick={() => setShowNewAppointmentForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Patient</label>
                <select
                  value={newAppointment.patient_id}
                  onChange={(e) => setNewAppointment({ ...newAppointment, patient_id: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select Patient</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>{patient.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Staff</label>
                <select
                  value={newAppointment.staff_id}
                  onChange={(e) => setNewAppointment({ ...newAppointment, staff_id: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select Staff</option>
                  {staff.map(staff => (
                    <option key={staff.id} value={staff.id}>{staff.name} ({staff.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  value={newAppointment.appointment_date}
                  onChange={(e) => setNewAppointment({ ...newAppointment, appointment_date: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Time</label>
                <input
                  type="time"
                  value={newAppointment.appointment_time}
                  onChange={(e) => setNewAppointment({ ...newAppointment, appointment_time: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={newAppointment.notes}
                  onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={recurringAppointment.is_recurring}
                  onChange={(e) => setRecurringAppointment({
                    ...recurringAppointment,
                    is_recurring: e.target.checked
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="recurring" className="ml-2 block text-sm text-gray-700">
                  Recurring Appointment
                </label>
              </div>

              {recurringAppointment.is_recurring && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Recurrence Pattern</label>
                    <select
                      value={recurringAppointment.pattern}
                      onChange={(e) => setRecurringAppointment({
                        ...recurringAppointment,
                        pattern: e.target.value as 'daily' | 'weekly' | 'monthly'
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">End Date</label>
                    <input
                      type="date"
                      value={recurringAppointment.end_date}
                      onChange={(e) => setRecurringAppointment({
                        ...recurringAppointment,
                        end_date: e.target.value
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <button
                onClick={() => setShowNewAppointmentForm(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={createAppointment}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Create Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .recurring-event {
          background-image: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(255, 255, 255, 0.1) 10px,
            rgba(255, 255, 255, 0.1) 20px
          );
          border-style: dashed;
        }
      `}</style>
    </div>
  )
}

export default AppointmentScheduler