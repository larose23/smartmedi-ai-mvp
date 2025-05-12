import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Fade,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Archive as ArchiveIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { AppointmentService, Appointment } from '@/services/appointmentService';
import { AppointmentModal } from '@/components/appointments/AppointmentModal';

interface AppointmentHistoryTabProps {
  patientId: string;
}

export const AppointmentHistoryTab: React.FC<AppointmentHistoryTabProps> = ({
  patientId,
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const appointmentService = AppointmentService.getInstance();

  useEffect(() => {
    fetchAppointments();
    setupRealtimeListener();
    return () => {
      window.removeEventListener('appointment-update', handleRealtimeUpdate);
    };
  }, [patientId]);

  const setupRealtimeListener = () => {
    window.addEventListener('appointment-update', handleRealtimeUpdate);
  };

  const handleRealtimeUpdate = (event: CustomEvent) => {
    const { new: newAppointment, old: oldAppointment } = event.detail;
    
    if (newAppointment.patient_id === patientId || oldAppointment?.patient_id === patientId) {
      setAppointments(prev => {
        if (event.detail.eventType === 'DELETE') {
          return prev.filter(apt => apt.id !== oldAppointment.id);
        }
        
        const updated = prev.map(apt => 
          apt.id === newAppointment.id ? appointmentService.mapAppointmentDates(newAppointment) : apt
        );
        
        if (event.detail.eventType === 'INSERT' && newAppointment.patient_id === patientId) {
          updated.push(appointmentService.mapAppointmentDates(newAppointment));
        }
        
        return updated;
      });
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await appointmentService.fetchAppointments({
        patientId,
      });
      setAppointments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (appointment: Appointment, newStatus: Appointment['status']) => {
    try {
      setLoading(true);
      const updated = await appointmentService.updateAppointmentStatus(
        appointment.id,
        newStatus
      );
      setAppointments(prev =>
        prev.map(apt => (apt.id === updated.id ? updated : apt))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'unseen':
        return 'warning';
      case 'scheduled':
        return 'info';
      case 'seen':
        return 'success';
      case 'archived':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: Appointment['status']) => {
    switch (status) {
      case 'unseen':
        return <VisibilityIcon />;
      case 'scheduled':
        return <ScheduleIcon />;
      case 'seen':
        return <CheckCircleIcon />;
      case 'archived':
        return <ArchiveIcon />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Appointment History
      </Typography>

      {appointments.length === 0 ? (
        <Typography color="text.secondary" align="center">
          No appointments found
        </Typography>
      ) : (
        <List>
          {appointments.map((appointment) => (
            <Fade in={true} key={appointment.id}>
              <ListItem
                divider
                sx={{
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <ListItemText
                  primary={new Date(appointment.start_time).toLocaleString()}
                  secondary={
                    <Box component="span" display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" component="span">
                        {appointment.department}
                      </Typography>
                      {appointment.triage_context && (
                        <Chip
                          label={`Urgency: ${(
                            appointment.triage_context.urgency_score * 100
                          ).toFixed(0)}%`}
                          size="small"
                          color={
                            appointment.triage_context.urgency_score > 0.7
                              ? 'error'
                              : appointment.triage_context.urgency_score > 0.4
                              ? 'warning'
                              : 'success'
                          }
                        />
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Box display="flex" gap={1}>
                    <Chip
                      icon={getStatusIcon(appointment.status)}
                      label={appointment.status}
                      color={getStatusColor(appointment.status)}
                      size="small"
                    />
                    <IconButton
                      edge="end"
                      onClick={() => {
                        setSelectedAppointment(appointment);
                        setModalOpen(true);
                      }}
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            </Fade>
          ))}
        </List>
      )}

      {selectedAppointment && (
        <AppointmentModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedAppointment(null);
          }}
          appointment={selectedAppointment}
          onStatusChange={handleStatusChange}
        />
      )}
    </Box>
  );
}; 