import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppState } from '@/context/StateContext';

interface AppointmentBookingFormProps {
  patientId: string;
  patientName: string;
  onSubmit: (appointmentDetails: any) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

interface TimeSlot {
  time: string;
  isAvailable: boolean;
}

const AppointmentBookingForm: React.FC<AppointmentBookingFormProps> = ({
  patientId,
  patientName,
  onSubmit,
  onCancel,
  isSubmitting,
}) => {
  const { state, addNotification } = useAppState();
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [timeSlot, setTimeSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);

  // Use staff data from our state management
  const staffMembers = state.staff.list;
  const staffLoading = state.staff.loading;

  useEffect(() => {
    // Set default selected staff when staff data is loaded
    if (staffMembers.length > 0 && !selectedStaff) {
      setSelectedStaff(staffMembers[0].id);
    }
  }, [staffMembers, selectedStaff]);

  useEffect(() => {
    if (date && selectedStaff) {
      generateTimeSlots(date, selectedStaff);
    }
  }, [date, selectedStaff]);

  const generateTimeSlots = async (selectedDate: Date, staffId: string) => {
    setLoadingTimeSlots(true);
    setTimeSlots([]);
    setTimeSlot(null);

    try {
      // Format the date as YYYY-MM-DD
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');

      // Get existing appointments for this date from our state
      const existingAppointments = state.appointments.list.filter(appointment => {
        const apptDate = new Date(appointment.appointment_date);
        return (
          appointment.staff_id === staffId &&
          apptDate.getFullYear() === selectedDate.getFullYear() &&
          apptDate.getMonth() === selectedDate.getMonth() &&
          apptDate.getDate() === selectedDate.getDate() &&
          appointment.status !== 'cancelled'
        );
      });

      // Create time slots for every 30 minutes from 8 AM to 5 PM
      const slots: TimeSlot[] = [];
      const startHour = 8;
      const endHour = 17;

      // Convert existing appointments to a Set of time strings for quick lookup
      const bookedTimes = new Set();
      existingAppointments.forEach((appointment) => {
        const appointmentTime = new Date(appointment.appointment_date);
        const hours = appointmentTime.getHours();
        const minutes = appointmentTime.getMinutes();
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        bookedTimes.add(timeString);
      });

      // Generate time slots
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const isAvailable = !bookedTimes.has(timeString);
          slots.push({ time: timeString, isAvailable });
        }
      }

      setTimeSlots(slots);
    } catch (error) {
      console.error('Error generating time slots:', error);
      addNotification('Failed to load available time slots', 'error');
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  const handleSubmit = () => {
    if (!date || !timeSlot || !selectedStaff) {
      addNotification('Please fill in all required fields', 'warning');
      return;
    }

    // Combine date and time slot
    const [hours, minutes] = timeSlot.split(':');
    const appointmentDate = new Date(date);
    appointmentDate.setHours(parseInt(hours, 10));
    appointmentDate.setMinutes(parseInt(minutes, 10));

    const appointmentDetails = {
      patient_id: patientId,
      staff_id: selectedStaff,
      appointment_date: appointmentDate.toISOString(),
      notes: notes,
    };

    onSubmit(appointmentDetails);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Book Appointment for {patientName}</h3>

      {/* Staff selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
        {staffLoading ? (
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading staff...</span>
          </div>
        ) : (
          <select
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            disabled={isSubmitting}
          >
            {staffMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} ({member.role})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Date selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
              disabled={isSubmitting}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, 'PPP') : <span>Select date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
              disabled={(date) => 
                date < new Date(new Date().setHours(0, 0, 0, 0)) || 
                date.getDay() === 0 || 
                date.getDay() === 6
              }
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Time slot selection */}
      {date && selectedStaff && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
          {loadingTimeSlots ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading available time slots...</span>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {timeSlots.map((slot) => (
                <button
                  key={slot.time}
                  className={cn(
                    "py-2 px-3 rounded-md text-sm font-medium",
                    slot.isAvailable
                      ? timeSlot === slot.time
                        ? "bg-blue-500 text-white"
                        : "bg-blue-100 hover:bg-blue-200 text-blue-800"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed",
                  )}
                  onClick={() => slot.isAvailable && setTimeSlot(slot.time)}
                  disabled={!slot.isAvailable || isSubmitting}
                >
                  {slot.time}
                </button>
              ))}
              {timeSlots.length === 0 && (
                <div className="col-span-4 text-center py-4 text-gray-500">
                  No time slots available for this date.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          rows={3}
          placeholder="Add any notes for this appointment"
          disabled={isSubmitting}
        />
      </div>

      {/* Buttons */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button
          onClick={onCancel}
          variant="outline"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!date || !timeSlot || !selectedStaff || isSubmitting}
          className="bg-primary hover:bg-primary/90"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Booking...
            </>
          ) : (
            'Book Appointment'
          )}
        </Button>
      </div>
    </div>
  );
};

export default AppointmentBookingForm; 