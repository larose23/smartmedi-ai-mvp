import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Rating,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';
import { FeedbackService } from '@/services/feedbackService';

interface ClinicianFeedbackProps {
  patientId: string;
  appointmentId: string;
  triageScore: number;
  department: string;
  onFeedbackSubmitted: () => void;
}

type FeedbackType = 'positive' | 'negative' | 'neutral';
type OutcomeType = 'resolved' | 'referred' | 'follow_up' | 'admitted' | 'other';

export const ClinicianFeedback: React.FC<ClinicianFeedbackProps> = ({
  patientId,
  appointmentId,
  triageScore,
  department,
  onFeedbackSubmitted,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [feedback, setFeedback] = useState({
    type: 'neutral' as FeedbackType,
    outcome: 'resolved' as OutcomeType,
    notes: '',
    accuracy: 3,
    relevance: 3,
    override: false,
    overrideReason: '',
    demographicFactors: [] as string[],
  });

  const demographicOptions = [
    'Age',
    'Gender',
    'Ethnicity',
    'Language',
    'Socioeconomic Status',
    'Geographic Location',
  ];

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const feedbackService = FeedbackService.getInstance();
      await feedbackService.submitFeedback({
        patientId,
        appointmentId,
        triageScore,
        department,
        ...feedback,
        timestamp: new Date(),
      });

      setSuccess('Feedback submitted successfully');
      setTimeout(() => {
        onFeedbackSubmitted();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <PsychologyIcon color="primary" />
        <Typography variant="h6">Clinician Feedback</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Stack spacing={3}>
        <FormControl component="fieldset">
          <Typography variant="subtitle2" gutterBottom>
            Overall Assessment
          </Typography>
          <RadioGroup
            value={feedback.type}
            onChange={(e) => setFeedback(prev => ({ ...prev, type: e.target.value as FeedbackType }))}
          >
            <Box display="flex" gap={2}>
              <FormControlLabel
                value="positive"
                control={<Radio />}
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <ThumbUpIcon color="success" />
                    <Typography>Positive</Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="neutral"
                control={<Radio />}
                label="Neutral"
              />
              <FormControlLabel
                value="negative"
                control={<Radio />}
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <ThumbDownIcon color="error" />
                    <Typography>Negative</Typography>
                  </Box>
                }
              />
            </Box>
          </RadioGroup>
        </FormControl>

        <FormControl component="fieldset">
          <Typography variant="subtitle2" gutterBottom>
            Patient Outcome
          </Typography>
          <RadioGroup
            value={feedback.outcome}
            onChange={(e) => setFeedback(prev => ({ ...prev, outcome: e.target.value as OutcomeType }))}
          >
            <Box display="flex" gap={2} flexWrap="wrap">
              <FormControlLabel value="resolved" control={<Radio />} label="Resolved" />
              <FormControlLabel value="referred" control={<Radio />} label="Referred" />
              <FormControlLabel value="follow_up" control={<Radio />} label="Follow-up Required" />
              <FormControlLabel value="admitted" control={<Radio />} label="Admitted" />
              <FormControlLabel value="other" control={<Radio />} label="Other" />
            </Box>
          </RadioGroup>
        </FormControl>

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Triage Assessment
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="body2" gutterBottom>
                Accuracy Rating
              </Typography>
              <Rating
                value={feedback.accuracy}
                onChange={(_, value) => setFeedback(prev => ({ ...prev, accuracy: value || 0 }))}
              />
            </Box>
            <Box>
              <Typography variant="body2" gutterBottom>
                Relevance Rating
              </Typography>
              <Rating
                value={feedback.relevance}
                onChange={(_, value) => setFeedback(prev => ({ ...prev, relevance: value || 0 }))}
              />
            </Box>
          </Stack>
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Override Information
          </Typography>
          <FormControlLabel
            control={
              <Radio
                checked={feedback.override}
                onChange={(e) => setFeedback(prev => ({ ...prev, override: e.target.checked }))}
              />
            }
            label="Triage Score Override"
          />
          {feedback.override && (
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Override Reason"
              value={feedback.overrideReason}
              onChange={(e) => setFeedback(prev => ({ ...prev, overrideReason: e.target.value }))}
              sx={{ mt: 1 }}
            />
          )}
        </Box>

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Demographic Factors
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            {demographicOptions.map((factor) => (
              <Chip
                key={factor}
                label={factor}
                onClick={() => {
                  setFeedback(prev => ({
                    ...prev,
                    demographicFactors: prev.demographicFactors.includes(factor)
                      ? prev.demographicFactors.filter(f => f !== factor)
                      : [...prev.demographicFactors, factor],
                  }));
                }}
                color={feedback.demographicFactors.includes(factor) ? 'primary' : 'default'}
                variant={feedback.demographicFactors.includes(factor) ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        </Box>

        <TextField
          fullWidth
          multiline
          rows={4}
          label="Additional Notes"
          value={feedback.notes}
          onChange={(e) => setFeedback(prev => ({ ...prev, notes: e.target.value }))}
        />

        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          fullWidth
        >
          {loading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Submitting...
            </>
          ) : (
            'Submit Feedback'
          )}
        </Button>
      </Stack>
    </Paper>
  );
}; 