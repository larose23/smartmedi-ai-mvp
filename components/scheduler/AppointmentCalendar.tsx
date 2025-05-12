import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { SchedulerService, TimeSlot, Appointment } from '@/services/schedulerService';

interface AppointmentCalendarProps {
  patientId: string;
  department: string;
  urgencyScore?: number;
  onAppointmentBooked: (appointment: Appointment) => void;
}

export const AppointmentCalendar: React.FC<AppointmentCalendarProps> = ({
  patientId,
  department,
  urgencyScore,
  onAppointmentBooked,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');

  const schedulerService = SchedulerService.getInstance();

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDate]);

  const fetchAvailableSlots = async () => {
    try {
      setLoading(true);
      setError(null);

      if (urgencyScore && urgencyScore > 0.7) {
        // Fetch urgent slots if urgency score is high
        const urgentSlots = await schedulerService.suggestUrgentSlots(
          department,
          urgencyScore
        );
        setAvailableSlots(urgentSlots);
      } else {
        // Fetch regular availability
        const endDate = new Date(selectedDate!);
        endDate.setHours(23, 59, 59);
        const slots = await schedulerService.fetchProviderAvailability(
          'all', // This would be replaced with actual provider selection
          selectedDate!,
          endDate
        );
        setAvailableSlots(slots);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setBookingDialogOpen(true);
  };

  const handleBookingConfirm = async () => {
    if (!selectedSlot) return;

    try {
      setLoading(true);
      setError(null);

      const appointment = await schedulerService.bookAppointment(
        patientId,
        selectedSlot,
        notes
      );

      onAppointmentBooked(appointment);
      setBookingDialogOpen(false);
      setSelectedSlot(null);
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper elevation={3} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Schedule Appointment
        </Typography>

        {urgencyScore && urgencyScore > 0.7 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            High urgency detected. Showing prioritized appointment slots.
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <DateCalendar
              value={selectedDate}
              onChange={(newDate) => setSelectedDate(newDate)}
              minDate={new Date()}
            />
          </Grid>
          <Grid item xs={12} md={8}>
            {loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Available Time Slots
                </Typography>
                <Grid container spacing={1}>
                  {availableSlots.map((slot) => (
                    <Grid item key={slot.start.toISOString()}>
                      <Tooltip
                        title={`Provider: ${slot.provider_name}\nDepartment: ${slot.department}`}
                      >
                        <Chip
                          label={new Date(slot.start).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          onClick={() => handleSlotSelect(slot)}
                          color={slot.is_urgent ? 'error' : 'primary'}
                          variant={slot.is_urgent ? 'filled' : 'outlined'}
                        />
                      </Tooltip>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </Grid>
        </Grid>

        <Dialog
          open={bookingDialogOpen}
          onClose={() => setBookingDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Confirm Appointment</DialogTitle>
          <DialogContent>
            {selectedSlot && (
              <Box mt={2}>
                <Typography variant="body1" gutterBottom>
                  Provider: {selectedSlot.provider_name}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Date: {selectedSlot.start.toLocaleDateString()}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Time:{' '}
                  {selectedSlot.start.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  margin="normal"
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBookingDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleBookingConfirm}
              variant="contained"
              color="primary"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Confirm Booking'}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </LocalizationProvider>
  );
}; 