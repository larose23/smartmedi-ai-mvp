import React, { useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Chip,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { usePatientStore } from '../../../store/patientStore';

interface Provider {
  id: string;
  name: string;
  specialty: string;
  availability: {
    weekdays: number[];
    weekends: number[];
  };
}

interface Department {
  id: string;
  name: string;
  location: string;
  capacity: number;
  current_load: number;
}

export default function AppointmentTab({ caseId }: { caseId: string }) {
  const { appointments, error, loading, bookAppointment } = usePatientStore();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [notes, setNotes] = useState('');

  if (loading.appointments) {
    return null; // Loading is handled by the parent component
  }

  if (error.appointments) {
    return null; // Error is handled by the error boundary
  }

  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedProvider || !selectedDepartment || !selectedType) {
      return;
    }

    try {
      await bookAppointment({
        case_id: caseId,
        provider_id: selectedProvider,
        department: selectedDepartment,
        scheduled_time: selectedDate.toISOString(),
        duration: 30, // Default duration in minutes
        status: 'scheduled',
        type: selectedType,
        notes,
      });

      setOpenDialog(false);
      resetForm();
    } catch (err) {
      // Error is handled by the error boundary
      console.error('Failed to book appointment:', err);
    }
  };

  const resetForm = () => {
    setSelectedDate(null);
    setSelectedProvider('');
    setSelectedDepartment('');
    setSelectedType('');
    setNotes('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'primary';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      case 'no_show':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Grid container spacing={3}>
      {/* Appointment List */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Appointments</Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setOpenDialog(true)}
            >
              Book New Appointment
            </Button>
          </Box>
          <Grid container spacing={2}>
            {appointments.map((appointment) => (
              <Grid item xs={12} key={appointment.id}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1">
                      {new Date(appointment.scheduled_time).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Department: {appointment.department}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Type: {appointment.type}
                    </Typography>
                    {appointment.notes && (
                      <Typography variant="body2" color="text.secondary">
                        Notes: {appointment.notes}
                      </Typography>
                    )}
                  </Box>
                  <Chip
                    label={appointment.status}
                    color={getStatusColor(appointment.status)}
                    size="small"
                  />
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Grid>

      {/* Book Appointment Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Book New Appointment</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateTimePicker
                  label="Appointment Time"
                  value={selectedDate}
                  onChange={(newValue) => setSelectedDate(newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Provider</InputLabel>
                <Select
                  value={selectedProvider}
                  label="Provider"
                  onChange={(e) => setSelectedProvider(e.target.value)}
                >
                  {providers.map((provider) => (
                    <MenuItem key={provider.id} value={provider.id}>
                      {provider.name} - {provider.specialty}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  value={selectedDepartment}
                  label="Department"
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                >
                  {departments.map((department) => (
                    <MenuItem key={department.id} value={department.id}>
                      {department.name} ({department.location})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Appointment Type</InputLabel>
                <Select
                  value={selectedType}
                  label="Appointment Type"
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <MenuItem value="initial">Initial Consultation</MenuItem>
                  <MenuItem value="follow_up">Follow-up</MenuItem>
                  <MenuItem value="procedure">Procedure</MenuItem>
                  <MenuItem value="emergency">Emergency</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleBookAppointment}
            variant="contained"
            color="primary"
            disabled={!selectedDate || !selectedProvider || !selectedDepartment || !selectedType}
          >
            Book Appointment
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
} 