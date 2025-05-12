import React from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import { RiskFactor } from '../../services/bayesianNetworkService';

interface ContributingFactorsProps {
  factors: RiskFactor[];
  contributingFactors: {
    factorId: string;
    weight: number;
  }[];
}

export default function ContributingFactors({
  factors,
  contributingFactors,
}: ContributingFactorsProps) {
  // Sort factors by weight
  const sortedFactors = [...contributingFactors].sort((a, b) => b.weight - a.weight);

  // Calculate total weight for percentage
  const totalWeight = sortedFactors.reduce((sum, factor) => sum + factor.weight, 0);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Contributing Factors
      </Typography>
      <List>
        {sortedFactors.map(({ factorId, weight }) => {
          const factor = factors.find((f) => f.id === factorId);
          if (!factor) return null;

          const percentage = (weight / totalWeight) * 100;

          return (
            <ListItem key={factorId}>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body1">{factor.name}</Typography>
                    <Tooltip title={`Weight: ${weight.toFixed(2)}`}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 1 }}
                      >
                        ({percentage.toFixed(1)}%)
                      </Typography>
                    </Tooltip>
                  </Box>
                }
                secondary={
                  <Box sx={{ mt: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={percentage}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: 'rgba(0, 0, 0, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: 'primary.main',
                        },
                      }}
                    />
                  </Box>
                }
              />
            </ListItem>
          );
        })}
      </List>
    </Paper>
  );
} 