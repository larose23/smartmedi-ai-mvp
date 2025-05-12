import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import interactionPlugin from '@fullcalendar/interaction';
import { EventInput, DateSelectArg, EventClickArg, EventDropArg } from '@fullcalendar/core';
import { Provider, Appointment, Patient } from '@/types/scheduling';
import { LoadingSpinner } from './LoadingSpinner';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { SCHEDULING_CONSTANTS } from '@/lib/constants/scheduling';
import ProviderSelector from './ProviderSelector';
import AppointmentDetailsModal from './AppointmentDetailsModal';
import CalendarViewControls from './CalendarViewControls';

interface MultiProviderCalendarProps {
  providers: Provider[];
  onAppointmentUpdate?: (appointmentId: string, newDate: Date) => void;
  onAppointmentClick?: (appointment: Appointment) => void;
}

const MultiProviderCalendar: React.FC<MultiProviderCalendarProps> = ({
  providers,
  onAppointmentUpdate,
  onAppointmentClick
}) => {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<Provider[]>(providers);
  const [currentView, setCurrentView] = useState('resourceTimelineDay');
  const [selectedAppointment, setSelectedAppointment] = useState<{
    appointment: Appointment;
    provider: Provider;
    patient: Patient;
  } | null>(null);
  const calendarRef = React.useRef<FullCalendar>(null);

  useEffect(() => {
    loadAppointments();
    formatResources();
  }, [selectedProviders]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .in('provider_id', selectedProviders.map(p => p.id))
        .gte('start_time', new Date().toISOString());

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const formatResources = () => {
    const formattedResources = selectedProviders.map(provider => ({
      id: provider.id,
      title: provider.name,
      specialties: provider.specialties,
      extendedProps: {
        provider
      }
    }));
    setResources(formattedResources);
  };

  const handleEventDrop = async (info: EventDropArg) => {
    try {
      const appointmentId = info.event.id;
      const newDate = info.event.start;
      
      if (!newDate) {
        throw new Error('Invalid date');
      }

      // Check for conflicts
      const { data: conflicts } = await supabase
        .from('appointments')
        .select('*')
        .eq('provider_id', info.event.getResources()[0].id)
        .eq('start_time', newDate.toISOString())
        .neq('id', appointmentId);

      if (conflicts && conflicts.length > 0) {
        info.revert();
        toast.error('Time slot is already booked');
        return;
      }

      // Update appointment
      const { error } = await supabase
        .from('appointments')
        .update({
          start_time: newDate.toISOString(),
          end_time: new Date(newDate.getTime() + SCHEDULING_CONSTANTS.SLOT_DURATION * 60000).toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      toast.success('Appointment rescheduled successfully');
      onAppointmentUpdate?.(appointmentId, newDate);
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      toast.error('Failed to reschedule appointment');
      info.revert();
    }
  };

  const handleEventClick = async (info: EventClickArg) => {
    const appointment = appointments.find(a => a.id === info.event.id);
    if (appointment) {
      try {
        // Fetch patient details
        const { data: patient, error: patientError } = await supabase
          .from('patients')
          .select('*')
          .eq('id', appointment.patient_id)
          .single();

        if (patientError) throw patientError;

        const provider = selectedProviders.find(p => p.id === appointment.provider_id);
        if (!provider) throw new Error('Provider not found');

        setSelectedAppointment({
          appointment,
          provider,
          patient
        });
      } catch (error) {
        console.error('Error loading appointment details:', error);
        toast.error('Failed to load appointment details');
      }
    }
  };

  const handleViewChange = (view: string) => {
    setCurrentView(view);
    calendarRef.current?.getApi().changeView(view);
  };

  const handleToday = () => {
    calendarRef.current?.getApi().today();
  };

  const handlePrev = () => {
    calendarRef.current?.getApi().prev();
  };

  const handleNext = () => {
    calendarRef.current?.getApi().next();
  };

  const handleAppointmentCancel = async () => {
    if (!selectedAppointment) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: SCHEDULING_CONSTANTS.APPOINTMENT_STATUS.CANCELLED
        })
        .eq('id', selectedAppointment.appointment.id);

      if (error) throw error;

      toast.success('Appointment cancelled successfully');
      setSelectedAppointment(null);
      loadAppointments();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Failed to cancel appointment');
    }
  };

  const calendarEvents: EventInput[] = appointments.map(appointment => ({
    id: appointment.id,
    resourceId: appointment.provider_id,
    title: `Appointment with ${appointment.patient_id}`,
    start: appointment.start_time,
    end: appointment.end_time,
    extendedProps: {
      appointment
    },
    backgroundColor: getStatusColor(appointment.status),
    borderColor: getStatusColor(appointment.status),
    textColor: '#ffffff'
  }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case SCHEDULING_CONSTANTS.APPOINTMENT_STATUS.COMPLETED:
        return '#4CAF50';
      case SCHEDULING_CONSTANTS.APPOINTMENT_STATUS.CANCELLED:
        return '#f44336';
      case SCHEDULING_CONSTANTS.APPOINTMENT_STATUS.NO_SHOW:
        return '#ff9800';
      default:
        return '#2196F3';
    }
  };

  if (loading) {
    return <LoadingSpinner size="large" text="Loading calendar..." />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1">
          <ProviderSelector
            providers={providers}
            selectedProviders={selectedProviders}
            onSelectionChange={setSelectedProviders}
          />
        </div>
        <div className="lg:col-span-3">
          <CalendarViewControls
            currentView={currentView}
            onViewChange={handleViewChange}
            onToday={handleToday}
            onPrev={handlePrev}
            onNext={handleNext}
          />
          <div className="bg-white rounded-lg shadow p-4">
            <FullCalendar
              ref={calendarRef}
              plugins={[resourceTimelinePlugin, interactionPlugin]}
              initialView={currentView}
              headerToolbar={false}
              resources={resources}
              events={calendarEvents}
              eventDrop={handleEventDrop}
              eventClick={handleEventClick}
              editable={true}
              droppable={true}
              resourceAreaWidth="15%"
              slotDuration="00:30:00"
              slotMinTime={`${SCHEDULING_CONSTANTS.WORKING_HOURS.start}:00:00`}
              slotMaxTime={`${SCHEDULING_CONSTANTS.WORKING_HOURS.end}:00:00`}
              allDaySlot={false}
              height="auto"
              resourceLabelContent={(arg) => (
                <div className="flex flex-col">
                  <span className="font-medium">{arg.resource.title}</span>
                  <span className="text-xs text-gray-500">
                    {arg.resource.extendedProps.provider.specialties.join(', ')}
                  </span>
                </div>
              )}
            />
          </div>
        </div>
      </div>

      {selectedAppointment && (
        <AppointmentDetailsModal
          appointment={selectedAppointment.appointment}
          provider={selectedAppointment.provider}
          patient={selectedAppointment.patient}
          onClose={() => setSelectedAppointment(null)}
          onCancel={handleAppointmentCancel}
          onReschedule={() => {
            // Implement rescheduling logic
            setSelectedAppointment(null);
          }}
        />
      )}
    </div>
  );
};

export default MultiProviderCalendar; 