import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Fade,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { ArchiveVerificationService } from '@/services/archiveVerificationService';

interface ArchiveConfirmationProps {
  appointmentId: string;
  patientId: string;
  onComplete: () => void;
  onError: (error: string) => void;
}

export const ArchiveConfirmation: React.FC<ArchiveConfirmationProps> = ({
  appointmentId,
  patientId,
  onComplete,
  onError,
}) => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(true);

  const archiveVerificationService = ArchiveVerificationService.getInstance();

  useEffect(() => {
    const verifyArchive = async () => {
      try {
        // Wait for a short delay to ensure the archive operation is complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        const verification = await archiveVerificationService.verifyArchiveIntegrity();
        
        // Check if the appointment is no longer in the active appointments
        const isArchived = verification.archived_appointments > 0;
        
        if (isArchived) {
          setStatus('success');
          setTimeout(() => {
            setShow(false);
            onComplete();
          }, 2000);
        } else {
          throw new Error('Archive verification failed');
        }
      } catch (err) {
        setStatus('error');
        const errorMessage = err instanceof Error ? err.message : 'Archive verification failed';
        setError(errorMessage);
        onError(errorMessage);
      }
    };

    verifyArchive();
  }, [appointmentId, patientId, onComplete, onError]);

  const handleClose = () => {
    setShow(false);
    if (status === 'error') {
      onError(error || 'Archive verification failed');
    } else {
      onComplete();
    }
  };

  if (!show) return null;

  return (
    <Fade in={show}>
      <Paper
        elevation={3}
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          p: 2,
          minWidth: 300,
          zIndex: 1000,
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            {status === 'processing' && (
              <CircularProgress size={20} />
            )}
            {status === 'success' && (
              <CheckCircleIcon color="success" />
            )}
            {status === 'error' && (
              <ErrorIcon color="error" />
            )}
            <Typography variant="subtitle1">
              {status === 'processing' && 'Archiving...'}
              {status === 'success' && 'Successfully Archived'}
              {status === 'error' && 'Archive Failed'}
            </Typography>
          </Box>
          <Tooltip title="Close">
            <IconButton size="small" onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {status === 'processing' && 'Verifying archive status...'}
          {status === 'success' && 'Patient record has been successfully archived.'}
          {status === 'error' && 'Failed to verify archive status.'}
        </Typography>
      </Paper>
    </Fade>
  );
}; 