import React from 'react';
import { useTriageQueue } from '@/hooks/useTriageQueue';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  AccessTime as AccessTimeIcon,
  LocalHospital as HospitalIcon
} from '@mui/icons-material';

export function TriageQueue() {
  const {
    queue,
    loading,
    error,
    getRiskLevelColor,
    getAcuityColor,
    refreshQueue
  } = useTriageQueue();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Error loading triage queue: {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" component="h2">
          Triage Queue
        </Typography>
        <Tooltip title="Refresh Queue">
          <IconButton onClick={refreshQueue}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {queue.length === 0 ? (
        <Alert severity="info">No patients in queue</Alert>
      ) : (
        queue.map((item) => (
          <Card
            key={item.id}
            sx={{
              mb: 2,
              borderLeft: 6,
              borderColor: getAcuityColor(item.triageDecision.acuity)
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {item.patientDescription}
                  </Typography>
                  
                  <Box display="flex" gap={1} mb={1}>
                    <Chip
                      label={`Acuity ${item.triageDecision.acuity}`}
                      color={getAcuityColor(item.triageDecision.acuity) as any}
                      size="small"
                    />
                    <Chip
                      label={`Risk: ${Math.round(item.riskAssessment.overallRisk * 100)}%`}
                      color={getRiskLevelColor(item.riskAssessment.overallRisk) as any}
                      size="small"
                    />
                    <Chip
                      icon={<AccessTimeIcon />}
                      label={`${item.waitEstimate} min wait`}
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {item.triageDecision.explanation}
                  </Typography>

                  {item.clinicalValidation.warnings.length > 0 && (
                    <Box display="flex" alignItems="center" gap={1} mt={1}>
                      <WarningIcon color="warning" />
                      <Typography variant="body2" color="warning.main">
                        {item.clinicalValidation.warnings[0]}
                      </Typography>
                    </Box>
                  )}
                </Box>

                <Box display="flex" flexDirection="column" alignItems="flex-end">
                  <Typography variant="caption" color="text.secondary">
                    {new Date(item.createdAt).toLocaleTimeString()}
                  </Typography>
                  {item.triageDecision.recommendedActions.map((action, index) => (
                    <Chip
                      key={index}
                      icon={<HospitalIcon />}
                      label={action}
                      size="small"
                      sx={{ mt: 0.5 }}
                    />
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))
      )}
    </Box>
  );
} 