import React from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import { TriageDecisionService, RecommendedAction } from '@/services/triageDecisionService';

interface RecommendedActionsProps {
  actions: RecommendedAction[];
}

export const RecommendedActions: React.FC<RecommendedActionsProps> = ({ actions }) => {
  const triageService = TriageDecisionService.getInstance();

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Typography variant="h6" component="div" gutterBottom>
        Recommended Actions
      </Typography>
      <List>
        {actions.map((action) => (
          <ListItem
            key={action.id}
            sx={{
              borderLeft: `4px solid ${triageService.getTimeSensitivityColor(
                action.time_sensitivity
              )}`,
              mb: 1,
              backgroundColor: `${triageService.getTimeSensitivityColor(
                action.time_sensitivity
              )}10`,
            }}
          >
            <ListItemText
              primary={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="subtitle1">{action.action}</Typography>
                  <Chip
                    label={action.time_sensitivity.toUpperCase()}
                    size="small"
                    sx={{
                      backgroundColor: triageService.getTimeSensitivityColor(
                        action.time_sensitivity
                      ),
                      color: 'white',
                    }}
                  />
                </Box>
              }
              secondary={
                <Box mt={1}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {action.reasoning}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1} mt={1}>
                    <Typography variant="caption" color="text.secondary">
                      Priority:
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(action.priority / 10) * 100}
                      sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {action.priority}/10
                    </Typography>
                  </Box>
                  <Box mt={1}>
                    <Typography variant="caption" color="text.secondary">
                      Required Resources:
                    </Typography>
                    <Box display="flex" gap={0.5} mt={0.5} flexWrap="wrap">
                      {action.required_resources.map((resource) => (
                        <Chip
                          key={resource}
                          label={resource}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                  <Tooltip title="Estimated duration">
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mt: 1 }}
                    >
                      Estimated Duration: {action.estimated_duration} minutes
                    </Typography>
                  </Tooltip>
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}; 