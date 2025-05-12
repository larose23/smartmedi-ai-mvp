import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { Appointment } from '@/services/appointmentService';

interface AppointmentModalProps {
  open: boolean;
  onClose: () => void;
  appointment: Appointment;
  onStatusChange: (appointment: Appointment, newStatus: Appointment['status']) => Promise<void>;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  open,
  onClose,
  appointment,
  onStatusChange,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = async (newStatus: Appointment['status']) => {
    try {
      setLoading(true);
      setError(null);
      await onStatusChange(appointment, newStatus);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getNextStatus = (currentStatus: Appointment['status']): Appointment['status'] | null => {
    switch (currentStatus) {
      case 'unseen':
        return 'scheduled';
      case 'scheduled':
        return 'seen';
      case 'seen':
        return 'archived';
      default:
        return null;
    }
  };

  const getStatusButtonProps = (status: Appointment['status']) => {
    switch (status) {
      case 'unseen':
        return {
          color: 'info' as const,
          icon: <ScheduleIcon />,
          label: 'Schedule',
        };
      case 'scheduled':
        return {
          color: 'success' as const,
          icon: <CheckCircleIcon />,
          label: 'Mark as Seen',
        };
      case 'seen':
        return {
          color: 'default' as const,
          icon: <InfoIcon />,
          label: 'Archive',
        };
      default:
        return null;
    }
  };

  const nextStatus = getNextStatus(appointment.status);
  const buttonProps = nextStatus ? getStatusButtonProps(appointment.status) : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <ScheduleIcon />
          <Typography variant="h6">Appointment Details</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Appointment Information
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="Date & Time"
                  secondary={new Date(appointment.start_time).toLocaleString()}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Department"
                  secondary={appointment.department}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Status"
                  secondary={
                    <Chip
                      label={appointment.status}
                      size="small"
                      color={
                        appointment.status === 'unseen'
                          ? 'warning'
                          : appointment.status === 'scheduled'
                          ? 'info'
                          : appointment.status === 'seen'
                          ? 'success'
                          : 'default'
                      }
                    />
                  }
                />
              </ListItem>
              {appointment.notes && (
                <ListItem>
                  <ListItemText
                    primary="Notes"
                    secondary={appointment.notes}
                  />
                </ListItem>
              )}
            </List>
          </Grid>

          {appointment.triage_context && (
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Triage Context
              </Typography>
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Urgency Score
                </Typography>
                <Chip
                  label={`${(appointment.triage_context.urgency_score * 100).toFixed(0)}%`}
                  color={
                    appointment.triage_context.urgency_score > 0.7
                      ? 'error'
                      : appointment.triage_context.urgency_score > 0.4
                      ? 'warning'
                      : 'success'
                  }
                />
              </Box>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Risk Factors
              </Typography>
              <List dense>
                {appointment.triage_context.risk_factors.map((factor, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <WarningIcon color="warning" />
                    </ListItemIcon>
                    <ListItemText primary={factor} />
                  </ListItem>
                ))}
              </List>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Recommendations
              </Typography>
              <List dense>
                {appointment.triage_context.recommendations.map((rec, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <InfoIcon color="info" />
                    </ListItemIcon>
                    <ListItemText primary={rec} />
                  </ListItem>
                ))}
              </List>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {buttonProps && (
          <Button
            variant="contained"
            color={buttonProps.color}
            startIcon={buttonProps.icon}
            onClick={() => handleStatusChange(nextStatus!)}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : buttonProps.label}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}; 