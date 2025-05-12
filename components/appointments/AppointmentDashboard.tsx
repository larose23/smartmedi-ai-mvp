import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Tooltip,
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
import { AppointmentModal } from './AppointmentModal';

interface AppointmentDashboardProps {
  department?: string;
}

export const AppointmentDashboard: React.FC<AppointmentDashboardProps> = ({
  department,
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Appointment['status']>('unseen');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const appointmentService = AppointmentService.getInstance();

  useEffect(() => {
    fetchAppointments();
    setupRealtimeListener();
    return () => {
      window.removeEventListener('appointment-update', handleRealtimeUpdate);
    };
  }, [activeTab, department]);

  const setupRealtimeListener = () => {
    window.addEventListener('appointment-update', handleRealtimeUpdate);
  };

  const handleRealtimeUpdate = (event: CustomEvent) => {
    const { new: newAppointment, old: oldAppointment } = event.detail;
    
    setAppointments(prev => {
      if (event.detail.eventType === 'DELETE') {
        return prev.filter(apt => apt.id !== oldAppointment.id);
      }
      
      const updated = prev.map(apt => 
        apt.id === newAppointment.id ? appointmentService.mapAppointmentDates(newAppointment) : apt
      );
      
      if (event.detail.eventType === 'INSERT') {
        updated.push(appointmentService.mapAppointmentDates(newAppointment));
      }
      
      return updated;
    });
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await appointmentService.fetchAppointments({
        status: activeTab,
        department,
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

  const handleArchive = async (appointment: Appointment) => {
    try {
      setLoading(true);
      const archived = await appointmentService.archiveAppointment(appointment.id);
      setAppointments(prev =>
        prev.map(apt => (apt.id === archived.id ? archived : apt))
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

  return (
    <Box>
      <Paper elevation={3} sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
        >
          <Tab
            label="Unseen"
            value="unseen"
            icon={<VisibilityIcon />}
            iconPosition="start"
          />
          <Tab
            label="Scheduled"
            value="scheduled"
            icon={<ScheduleIcon />}
            iconPosition="start"
          />
          <Tab
            label="Seen"
            value="seen"
            icon={<CheckCircleIcon />}
            iconPosition="start"
          />
          <Tab
            label="Archived"
            value="archived"
            icon={<ArchiveIcon />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {appointments.map((appointment) => (
            <Grid item xs={12} key={appointment.id}>
              <Fade in={true}>
                <Paper
                  elevation={2}
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography variant="h6">
                      {new Date(appointment.start_time).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Department: {appointment.department}
                    </Typography>
                    {appointment.triage_context && (
                      <Box mt={1}>
                        <Chip
                          label={`Urgency: ${(
                            appointment.triage_context.urgency_score * 100
                          ).toFixed(0)}%`}
                          color={
                            appointment.triage_context.urgency_score > 0.7
                              ? 'error'
                              : appointment.triage_context.urgency_score > 0.4
                              ? 'warning'
                              : 'success'
                          }
                          size="small"
                        />
                      </Box>
                    )}
                  </Box>

                  <Box display="flex" gap={1}>
                    <Chip
                      icon={getStatusIcon(appointment.status)}
                      label={appointment.status}
                      color={getStatusColor(appointment.status)}
                    />
                    <Tooltip title="View Details">
                      <IconButton
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          setModalOpen(true);
                        }}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    {appointment.status !== 'archived' && (
                      <Tooltip title="Archive">
                        <IconButton
                          onClick={() => handleArchive(appointment)}
                          disabled={loading}
                        >
                          <ArchiveIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Paper>
              </Fade>
            </Grid>
          ))}
        </Grid>
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