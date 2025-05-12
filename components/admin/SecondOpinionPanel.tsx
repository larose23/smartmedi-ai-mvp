import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Snackbar,
  IconButton,
  Pagination,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import CloseIcon from '@mui/icons-material/Close';
import { useSnackbar } from 'notistack';
import ConfirmationDialog from '../common/ConfirmationDialog';
import { websocketService } from '../../services/websocketService';

interface Specialist {
  id: string;
  name: string;
  specialty: string;
  email: string;
  phone?: string;
}

interface SecondOpinionRequest {
  id: string;
  case_id: string;
  requesting_staff_id: string;
  specialist_id?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reason: string;
  notes?: string;
}

interface Consultation {
  id: string;
  request_id: string;
  scheduled_time: string;
  duration_minutes: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
}

interface ConsultationFeedback {
  id: string;
  consultation_id: string;
  specialist_id: string;
  feedback_type: 'diagnosis' | 'treatment' | 'both';
  feedback: string;
  recommendations: string[];
}

export default function SecondOpinionPanel({ caseId }: { caseId: string }) {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const [requests, setRequests] = useState<SecondOpinionRequest[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // New request dialog state
  const [openRequestDialog, setOpenRequestDialog] = useState(false);
  const [newRequest, setNewRequest] = useState({
    priority: 'medium' as const,
    reason: '',
    notes: '',
  });

  // Consultation dialog state
  const [openConsultationDialog, setOpenConsultationDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SecondOpinionRequest | null>(null);
  const [selectedSpecialist, setSelectedSpecialist] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  // Feedback dialog state
  const [openFeedbackDialog, setOpenFeedbackDialog] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [feedback, setFeedback] = useState({
    type: 'both' as const,
    content: '',
    recommendations: [''],
  });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [cachedSpecialists, setCachedSpecialists] = useState<Record<string, Specialist[]>>({});
  const ITEMS_PER_PAGE = 5;

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    severity?: 'info' | 'warning' | 'error';
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showNotification = useCallback((message: string, variant: 'success' | 'error' | 'info') => {
    enqueueSnackbar(message, {
      variant,
      action: (key) => (
        <IconButton size="small" color="inherit" onClick={() => closeSnackbar(key)}>
          <CloseIcon />
        </IconButton>
      ),
    });
  }, [enqueueSnackbar, closeSnackbar]);

  const validateRequest = useCallback((request: typeof newRequest) => {
    if (!request.reason.trim()) {
      throw new Error('Reason is required');
    }
    if (request.reason.length < 10) {
      throw new Error('Reason must be at least 10 characters long');
    }
    if (request.reason.length > 500) {
      throw new Error('Reason must not exceed 500 characters');
    }
    if (request.notes && request.notes.length > 1000) {
      throw new Error('Notes must not exceed 1000 characters');
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [requestsRes, specialistsRes] = await Promise.all([
        fetch(`/api/triage/second-opinion?type=case-requests&caseId=${caseId}&page=${page}&limit=${ITEMS_PER_PAGE}`),
        fetch('/api/triage/second-opinion?type=specialists&specialty=general'),
      ]);

      if (!requestsRes.ok || !specialistsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [requestsData, specialistsData] = await Promise.all([
        requestsRes.json(),
        specialistsRes.json(),
      ]);

      setRequests(requestsData.requests);
      setTotalPages(Math.ceil(requestsData.total / ITEMS_PER_PAGE));
      
      // Cache specialists by specialty
      setCachedSpecialists(prev => ({
        ...prev,
        general: specialistsData
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [caseId, page, showNotification]);

  useEffect(() => {
    fetchData();

    // Subscribe to real-time updates
    const handleRequestUpdate = (payload: any) => {
      if (payload.new.case_id === caseId) {
        fetchData();
      }
    };

    const handleConsultationUpdate = (payload: any) => {
      if (payload.new.request_id && requests.some(r => r.id === payload.new.request_id)) {
        fetchData();
      }
    };

    const handleFeedbackUpdate = (payload: any) => {
      if (payload.new.consultation_id) {
        fetchData();
      }
    };

    websocketService.subscribe('second-opinion-requests', handleRequestUpdate);
    websocketService.subscribe('consultations', handleConsultationUpdate);
    websocketService.subscribe('consultation-feedback', handleFeedbackUpdate);

    return () => {
      websocketService.unsubscribe('second-opinion-requests', handleRequestUpdate);
      websocketService.unsubscribe('consultations', handleConsultationUpdate);
      websocketService.unsubscribe('consultation-feedback', handleFeedbackUpdate);
    };
  }, [caseId]);

  const handleCreateRequest = async () => {
    try {
      setActionLoading(true);
      validateRequest(newRequest);

      const response = await fetch('/api/triage/second-opinion?type=request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caseId,
          staffId: 'current-user-id', // Replace with actual user ID
          ...newRequest,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create request');
      }

      await fetchData();
      setOpenRequestDialog(false);
      setNewRequest({ priority: 'medium', reason: '', notes: '' });
      showNotification('Second opinion request created successfully', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      showNotification(errorMessage, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleScheduleConsultation = async () => {
    if (!selectedRequest || !selectedSpecialist || !scheduledTime) return;

    setConfirmDialog({
      open: true,
      title: 'Schedule Consultation',
      message: `Are you sure you want to schedule a consultation with ${specialists.find(s => s.id === selectedSpecialist)?.name} for ${new Date(scheduledTime).toLocaleString()}?`,
      onConfirm: async () => {
        try {
          setActionLoading(true);
          const response = await fetch('/api/triage/second-opinion?type=consultation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              requestId: selectedRequest.id,
              specialistId: selectedSpecialist,
              scheduledTime: scheduledTime.toISOString(),
              durationMinutes: 30,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to schedule consultation');
          }

          await fetchData();
          setOpenConsultationDialog(false);
          setSelectedRequest(null);
          setSelectedSpecialist('');
          setScheduledTime(null);
          showNotification('Consultation scheduled successfully', 'success');
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'An error occurred';
          showNotification(errorMessage, 'error');
        } finally {
          setActionLoading(false);
          setConfirmDialog(prev => ({ ...prev, open: false }));
        }
      },
    });
  };

  const handleSubmitFeedback = async () => {
    if (!selectedConsultation) return;

    setConfirmDialog({
      open: true,
      title: 'Submit Feedback',
      message: 'Are you sure you want to submit this feedback? This action cannot be undone.',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          if (!feedback.content.trim()) {
            throw new Error('Feedback content is required');
          }
          if (feedback.content.length < 10) {
            throw new Error('Feedback must be at least 10 characters long');
          }
          if (feedback.content.length > 1000) {
            throw new Error('Feedback must not exceed 1000 characters');
          }

          const response = await fetch('/api/triage/second-opinion?type=feedback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              consultationId: selectedConsultation.id,
              specialistId: selectedConsultation.specialist_id,
              feedbackType: feedback.type,
              feedback: feedback.content,
              recommendations: feedback.recommendations.filter(r => r.trim() !== ''),
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to submit feedback');
          }

          await fetchData();
          setOpenFeedbackDialog(false);
          setSelectedConsultation(null);
          setFeedback({ type: 'both', content: '', recommendations: [''] });
          showNotification('Feedback submitted successfully', 'success');
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'An error occurred';
          showNotification(errorMessage, 'error');
        } finally {
          setActionLoading(false);
          setConfirmDialog(prev => ({ ...prev, open: false }));
        }
      },
    });
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Grid container spacing={3}>
      {/* Second Opinion Requests */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Second Opinion Requests</Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setOpenRequestDialog(true)}
              >
                New Request
              </Button>
            </Box>

            {requests.map((request) => (
              <Box key={request.id} mb={2} p={2} border="1px solid #eee" borderRadius={1}>
                <Typography variant="subtitle1">
                  Request #{request.id.slice(0, 8)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Status: <Chip label={request.status} size="small" />
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Priority: <Chip label={request.priority} size="small" />
                </Typography>
                <Typography variant="body2">{request.reason}</Typography>
                {request.status === 'pending' && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setSelectedRequest(request);
                      setOpenConsultationDialog(true);
                    }}
                    sx={{ mt: 1 }}
                  >
                    Schedule Consultation
                  </Button>
                )}
              </Box>
            ))}

            {totalPages > 1 && (
              <Box display="flex" justifyContent="center" mt={3}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                />
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* New Request Dialog */}
      <Dialog open={openRequestDialog} onClose={() => setOpenRequestDialog(false)}>
        <DialogTitle>New Second Opinion Request</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Priority</InputLabel>
            <Select
              value={newRequest.priority}
              onChange={(e) =>
                setNewRequest({ ...newRequest, priority: e.target.value as any })
              }
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            margin="normal"
            label="Reason"
            multiline
            rows={4}
            value={newRequest.reason}
            onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Additional Notes"
            multiline
            rows={2}
            value={newRequest.notes}
            onChange={(e) => setNewRequest({ ...newRequest, notes: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRequestDialog(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateRequest}
            variant="contained"
            color="primary"
            disabled={actionLoading}
          >
            {actionLoading ? <CircularProgress size={24} /> : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schedule Consultation Dialog */}
      <Dialog open={openConsultationDialog} onClose={() => setOpenConsultationDialog(false)}>
        <DialogTitle>Schedule Consultation</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Specialist</InputLabel>
            <Select
              value={selectedSpecialist}
              onChange={(e) => setSelectedSpecialist(e.target.value)}
            >
              {specialists.map((specialist) => (
                <MenuItem key={specialist.id} value={specialist.id}>
                  {specialist.name} - {specialist.specialty}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DateTimePicker
              label="Scheduled Time"
              value={scheduledTime}
              onChange={(newValue) => setScheduledTime(newValue)}
              sx={{ mt: 2, width: '100%' }}
            />
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConsultationDialog(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleScheduleConsultation}
            variant="contained"
            color="primary"
            disabled={!selectedSpecialist || !scheduledTime || actionLoading}
          >
            {actionLoading ? <CircularProgress size={24} /> : 'Schedule'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={openFeedbackDialog} onClose={() => setOpenFeedbackDialog(false)}>
        <DialogTitle>Consultation Feedback</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Feedback Type</InputLabel>
            <Select
              value={feedback.type}
              onChange={(e) =>
                setFeedback({ ...feedback, type: e.target.value as any })
              }
            >
              <MenuItem value="diagnosis">Diagnosis</MenuItem>
              <MenuItem value="treatment">Treatment</MenuItem>
              <MenuItem value="both">Both</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            margin="normal"
            label="Feedback"
            multiline
            rows={4}
            value={feedback.content}
            onChange={(e) => setFeedback({ ...feedback, content: e.target.value })}
          />
          <Typography variant="subtitle2" sx={{ mt: 2 }}>
            Recommendations
          </Typography>
          {feedback.recommendations.map((rec, index) => (
            <TextField
              key={index}
              fullWidth
              margin="normal"
              value={rec}
              onChange={(e) => {
                const newRecs = [...feedback.recommendations];
                newRecs[index] = e.target.value;
                if (index === feedback.recommendations.length - 1 && e.target.value) {
                  newRecs.push('');
                }
                setFeedback({ ...feedback, recommendations: newRecs });
              }}
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFeedbackDialog(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitFeedback}
            variant="contained"
            color="primary"
            disabled={!feedback.content || actionLoading}
          >
            {actionLoading ? <CircularProgress size={24} /> : 'Submit Feedback'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
        severity={confirmDialog.severity}
      />
    </Grid>
  );
} 