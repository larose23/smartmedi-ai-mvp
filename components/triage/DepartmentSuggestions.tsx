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
import { TriageDecisionService, DepartmentSuggestion } from '@/services/triageDecisionService';

interface DepartmentSuggestionsProps {
  suggestions: DepartmentSuggestion[];
}

export const DepartmentSuggestions: React.FC<DepartmentSuggestionsProps> = ({
  suggestions,
}) => {
  const triageService = TriageDecisionService.getInstance();

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Typography variant="h6" component="div" gutterBottom>
        Department Suggestions
      </Typography>
      <List>
        {suggestions.map((suggestion) => (
          <ListItem
            key={suggestion.id}
            sx={{
              borderLeft: `4px solid ${triageService.getCapacityStatusColor(
                suggestion.capacity_status
              )}`,
              mb: 1,
              backgroundColor: `${triageService.getCapacityStatusColor(
                suggestion.capacity_status
              )}10`,
            }}
          >
            <ListItemText
              primary={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="subtitle1">{suggestion.department}</Typography>
                  <Chip
                    label={suggestion.capacity_status.toUpperCase()}
                    size="small"
                    sx={{
                      backgroundColor: triageService.getCapacityStatusColor(
                        suggestion.capacity_status
                      ),
                      color: 'white',
                    }}
                  />
                </Box>
              }
              secondary={
                <Box mt={1}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {suggestion.reasoning}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1} mt={1}>
                    <Typography variant="caption" color="text.secondary">
                      Priority:
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(suggestion.priority / 10) * 100}
                      sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {suggestion.priority}/10
                    </Typography>
                  </Box>
                  <Box mt={1}>
                    <Typography variant="caption" color="text.secondary">
                      Required Specialists:
                    </Typography>
                    <Box display="flex" gap={0.5} mt={0.5} flexWrap="wrap">
                      {suggestion.required_specialists.map((specialist) => (
                        <Chip
                          key={specialist}
                          label={specialist}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                  <Box mt={1} display="flex" gap={2}>
                    <Tooltip title="Estimated wait time">
                      <Typography variant="caption" color="text.secondary">
                        Wait Time: {suggestion.estimated_wait_time} minutes
                      </Typography>
                    </Tooltip>
                    <Tooltip title="Current capacity status">
                      <Typography
                        variant="caption"
                        color={triageService.getCapacityStatusColor(suggestion.capacity_status)}
                      >
                        Capacity: {suggestion.capacity_status.toUpperCase()}
                      </Typography>
                    </Tooltip>
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