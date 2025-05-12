import React from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Link,
  LinearProgress,
  Collapse,
  IconButton,
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { PotentialDiagnosis } from '@/services/triageDecisionService';

interface PotentialDiagnosesProps {
  diagnoses: PotentialDiagnosis[];
}

export const PotentialDiagnoses: React.FC<PotentialDiagnosesProps> = ({ diagnoses }) => {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const handleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Typography variant="h6" component="div" gutterBottom>
        Potential Diagnoses
      </Typography>
      <List>
        {diagnoses.map((diagnosis) => (
          <ListItem
            key={diagnosis.id}
            sx={{
              borderLeft: '4px solid #2196f3',
              mb: 1,
              backgroundColor: '#2196f310',
            }}
          >
            <ListItemText
              primary={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="subtitle1">{diagnosis.diagnosis}</Typography>
                  <Chip
                    label={`${(diagnosis.probability * 100).toFixed(1)}% Probability`}
                    size="small"
                    sx={{
                      backgroundColor: '#2196f3',
                      color: 'white',
                    }}
                  />
                  <Chip
                    label={`${(diagnosis.confidence * 100).toFixed(1)}% Confidence`}
                    size="small"
                    variant="outlined"
                    sx={{
                      borderColor: '#2196f3',
                      color: '#2196f3',
                    }}
                  />
                </Box>
              }
              secondary={
                <Box mt={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="caption" color="text.secondary">
                      ICD-10 Codes:
                    </Typography>
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      {diagnosis.icd10_codes.map((code) => (
                        <Chip key={code} label={code} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Box>
                  <Box mt={1}>
                    <Typography variant="caption" color="text.secondary">
                      Related Symptoms:
                    </Typography>
                    <Box display="flex" gap={0.5} mt={0.5} flexWrap="wrap">
                      {diagnosis.symptoms.map(({ symptom, relevance }) => (
                        <Tooltip
                          key={symptom}
                          title={`Relevance: ${(relevance * 100).toFixed(1)}%`}
                        >
                          <Chip
                            label={symptom}
                            size="small"
                            variant="outlined"
                            sx={{
                              borderColor: `rgba(33, 150, 243, ${relevance})`,
                              color: `rgba(33, 150, 243, ${relevance})`,
                            }}
                          />
                        </Tooltip>
                      ))}
                    </Box>
                  </Box>
                  <Box mt={1}>
                    <Box
                      display="flex"
                      alignItems="center"
                      onClick={() => handleExpand(diagnosis.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        References
                      </Typography>
                      <IconButton size="small">
                        {expandedId === diagnosis.id ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </Box>
                    <Collapse in={expandedId === diagnosis.id}>
                      <List dense>
                        {diagnosis.references.map((reference, index) => (
                          <ListItem key={index}>
                            <ListItemText
                              primary={
                                <Link
                                  href={reference.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  color="primary"
                                >
                                  {reference.title}
                                </Link>
                              }
                              secondary={
                                <Typography variant="caption" color="text.secondary">
                                  {reference.type.replace('_', ' ').toUpperCase()}
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Collapse>
                  </Box>
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}; 