import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
  Paper,
  Chip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';

interface PatientTimelineProps {
  patient: {
    id: string;
    patientId: string;
    triageScore: number;
    department: string;
    checkInDate: Date;
    followUpDate: Date | null;
    outcome: string;
    riskFactors: string[];
    statusTransitions: {
      status: string;
      timestamp: Date;
      source: string;
    }[];
  };
  open: boolean;
  onClose: () => void;
}

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'archived':
      return <CheckCircleIcon color="success" />;
    case 'in_progress':
    case 'scheduled':
      return <AccessTimeIcon color="primary" />;
    case 'warning':
      return <WarningIcon color="warning" />;
    case 'error':
      return <ErrorIcon color="error" />;
    default:
      return <AccessTimeIcon color="action" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'archived':
      return 'success';
    case 'in_progress':
    case 'scheduled':
      return 'primary';
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    default:
      return 'default';
  }
};

export const PatientTimeline: React.FC<PatientTimelineProps> = ({
  patient,
  open,
  onClose,
}) => {
  const sortedTransitions = [...patient.statusTransitions].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Patient Journey Timeline
          </Typography>
          <Chip
            label={`Triage Score: ${patient.triageScore}`}
            color={patient.triageScore > 7 ? 'error' : patient.triageScore > 4 ? 'warning' : 'success'}
          />
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box mb={3}>
          <Typography variant="subtitle2" gutterBottom>
            Patient Information
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Chip label={`ID: ${patient.patientId}`} />
            <Chip label={`Department: ${patient.department}`} />
            <Chip label={`Outcome: ${patient.outcome}`} />
          </Box>
        </Box>

        <Box mb={3}>
          <Typography variant="subtitle2" gutterBottom>
            Risk Factors
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            {patient.riskFactors.map((factor) => (
              <Chip
                key={factor}
                label={factor}
                color="default"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>

        <Timeline>
          {sortedTransitions.map((transition, index) => (
            <TimelineItem key={index}>
              <TimelineOppositeContent color="text.secondary">
                {transition.timestamp.toLocaleString()}
              </TimelineOppositeContent>
              <TimelineSeparator>
                <TimelineDot color={getStatusColor(transition.status)}>
                  {getStatusIcon(transition.status)}
                </TimelineDot>
                {index < sortedTransitions.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              <TimelineContent>
                <Paper elevation={3} sx={{ p: 2 }}>
                  <Typography variant="subtitle2">
                    {transition.status}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Source: {transition.source}
                  </Typography>
                </Paper>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>

        {patient.followUpDate && (
          <Box mt={3}>
            <Typography variant="subtitle2" gutterBottom>
              Follow-up Information
            </Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body2">
                Scheduled Follow-up: {patient.followUpDate.toLocaleDateString()}
              </Typography>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}; 