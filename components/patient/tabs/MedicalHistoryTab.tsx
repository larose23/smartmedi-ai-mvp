import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from '@mui/material';
import { usePatientStore } from '../../../store/patientStore';

export default function MedicalHistoryTab({ patientId }: { patientId: string }) {
  const { medicalHistory, error, loading } = usePatientStore();

  if (loading.history) {
    return null; // Loading is handled by the parent component
  }

  if (error.history) {
    return null; // Error is handled by the error boundary
  }

  if (!medicalHistory) {
    return null; // No data state is handled by the parent component
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'error';
      case 'resolved':
        return 'success';
      case 'chronic':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe':
        return 'error';
      case 'moderate':
        return 'warning';
      case 'mild':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Grid container spacing={3}>
      {/* Active Conditions */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Active Conditions
          </Typography>
          <List>
            {medicalHistory.conditions
              .filter(condition => condition.status === 'active' || condition.status === 'chronic')
              .map((condition, index) => (
                <React.Fragment key={condition.id}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body1">{condition.name}</Typography>
                          <Chip
                            label={condition.status}
                            size="small"
                            color={getStatusColor(condition.status)}
                          />
                          <Chip
                            label={condition.severity}
                            size="small"
                            color={getSeverityColor(condition.severity)}
                          />
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" color="text.secondary">
                            Diagnosed: {new Date(condition.diagnosis_date).toLocaleDateString()}
                          </Typography>
                          {condition.notes && (
                            <Typography variant="body2" color="text.secondary">
                              Notes: {condition.notes}
                            </Typography>
                          )}
                        </>
                      }
                    />
                  </ListItem>
                  {index < medicalHistory.conditions.length - 1 && <Divider />}
                </React.Fragment>
              ))}
          </List>
        </Paper>
      </Grid>

      {/* Current Medications */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Current Medications
          </Typography>
          <List>
            {medicalHistory.medications
              .filter(med => med.status === 'active')
              .map((medication, index) => (
                <React.Fragment key={medication.id}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body1">{medication.name}</Typography>
                          <Chip label={medication.status} size="small" color="primary" />
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" color="text.secondary">
                            {medication.dosage} - {medication.frequency}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Prescribed by: {medication.prescribed_by}
                          </Typography>
                          {medication.notes && (
                            <Typography variant="body2" color="text.secondary">
                              Notes: {medication.notes}
                            </Typography>
                          )}
                        </>
                      }
                    />
                  </ListItem>
                  {index < medicalHistory.medications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
          </List>
        </Paper>
      </Grid>

      {/* Allergies */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Allergies
          </Typography>
          <List>
            {medicalHistory.allergies.map((allergy, index) => (
              <React.Fragment key={allergy.id}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body1">{allergy.allergen}</Typography>
                        <Chip
                          label={allergy.severity}
                          size="small"
                          color={getSeverityColor(allergy.severity)}
                        />
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" color="text.secondary">
                          Reaction: {allergy.reaction}
                        </Typography>
                        {allergy.notes && (
                          <Typography variant="body2" color="text.secondary">
                            Notes: {allergy.notes}
                          </Typography>
                        )}
                      </>
                    }
                  />
                </ListItem>
                {index < medicalHistory.allergies.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      </Grid>

      {/* Recent Procedures */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Recent Procedures
          </Typography>
          <Timeline>
            {medicalHistory.procedures
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 5)
              .map((procedure, index) => (
                <TimelineItem key={procedure.id}>
                  <TimelineSeparator>
                    <TimelineDot color="primary" />
                    {index < 4 && <TimelineConnector />}
                  </TimelineSeparator>
                  <TimelineContent>
                    <Typography variant="subtitle2">{procedure.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(procedure.date).toLocaleDateString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Provider: {procedure.provider}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Location: {procedure.location}
                    </Typography>
                    {procedure.notes && (
                      <Typography variant="body2" color="text.secondary">
                        Notes: {procedure.notes}
                      </Typography>
                    )}
                  </TimelineContent>
                </TimelineItem>
              ))}
          </Timeline>
        </Paper>
      </Grid>
    </Grid>
  );
} 