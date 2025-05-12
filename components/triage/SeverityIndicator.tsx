import React from 'react';
import { Box, Paper, Typography, Chip, Tooltip } from '@mui/material';
import { TriageDecisionService, SeverityLevel } from '@/services/triageDecisionService';

interface SeverityIndicatorProps {
  severity: SeverityLevel;
  confidence: number;
  explanation: string;
}

export const SeverityIndicator: React.FC<SeverityIndicatorProps> = ({
  severity,
  confidence,
  explanation,
}) => {
  const triageService = TriageDecisionService.getInstance();
  const severityColor = triageService.getSeverityColor(severity);

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        borderLeft: `4px solid ${severityColor}`,
        backgroundColor: `${severityColor}10`,
      }}
    >
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Typography variant="h6" component="div">
          Severity Assessment
        </Typography>
        <Chip
          label={severity.toUpperCase()}
          sx={{
            backgroundColor: severityColor,
            color: 'white',
            fontWeight: 'bold',
          }}
        />
        <Tooltip title={`Confidence: ${(confidence * 100).toFixed(1)}%`}>
          <Chip
            label={`${(confidence * 100).toFixed(1)}% Confidence`}
            variant="outlined"
            sx={{ borderColor: severityColor, color: severityColor }}
          />
        </Tooltip>
      </Box>
      <Typography variant="body1" color="text.secondary">
        {explanation}
      </Typography>
    </Paper>
  );
}; 