import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { SchedulerService, NoShowPrediction } from '@/services/schedulerService';

interface NoShowPredictionProps {
  appointmentId: string;
}

export const NoShowPrediction: React.FC<NoShowPredictionProps> = ({
  appointmentId,
}) => {
  const [prediction, setPrediction] = useState<NoShowPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reminderSent, setReminderSent] = useState(false);

  const schedulerService = SchedulerService.getInstance();

  useEffect(() => {
    fetchPrediction();
  }, [appointmentId]);

  const fetchPrediction = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await schedulerService.predictNoShow(appointmentId);
      setPrediction(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async () => {
    try {
      setLoading(true);
      setError(null);
      await schedulerService.sendReminder(appointmentId);
      setReminderSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
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

  if (!prediction) {
    return null;
  }

  const riskLevel = prediction.probability > 0.7 ? 'high' : prediction.probability > 0.4 ? 'medium' : 'low';

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        No-Show Risk Assessment
      </Typography>

      <Box mb={3}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Typography variant="subtitle1">Risk Level:</Typography>
          <Chip
            label={riskLevel.toUpperCase()}
            color={
              riskLevel === 'high'
                ? 'error'
                : riskLevel === 'medium'
                ? 'warning'
                : 'success'
            }
          />
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="body2" color="text.secondary">
            Probability:
          </Typography>
          <LinearProgress
            variant="determinate"
            value={prediction.probability * 100}
            sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
          />
          <Typography variant="body2" color="text.secondary">
            {(prediction.probability * 100).toFixed(1)}%
          </Typography>
        </Box>
      </Box>

      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom>
          Risk Factors
        </Typography>
        <List dense>
          {prediction.risk_factors.map((factor, index) => (
            <ListItem key={index}>
              <ListItemIcon>
                <WarningIcon color="warning" />
              </ListItemIcon>
              <ListItemText
                primary={factor.factor}
                secondary={`Impact: ${(factor.impact * 100).toFixed(1)}%`}
              />
            </ListItem>
          ))}
        </List>
      </Box>

      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom>
          Recommendations
        </Typography>
        <List dense>
          {prediction.recommendations.map((recommendation, index) => (
            <ListItem key={index}>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText primary={recommendation} />
            </ListItem>
          ))}
        </List>
      </Box>

      {!reminderSent && (
        <Box display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            color="primary"
            startIcon={<ScheduleIcon />}
            onClick={handleSendReminder}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Send Reminder'}
          </Button>
        </Box>
      )}

      {reminderSent && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Reminder sent successfully
        </Alert>
      )}
    </Paper>
  );
}; 