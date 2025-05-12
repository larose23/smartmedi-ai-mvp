import React, { useEffect, useState } from 'react';
import { Box, Grid, CircularProgress, Alert } from '@mui/material';
import { TriageDecisionService } from '@/services/triageDecisionService';
import { SeverityIndicator } from './SeverityIndicator';
import { RecommendedActions } from './RecommendedActions';
import { PotentialDiagnoses } from './PotentialDiagnoses';
import { DepartmentSuggestions } from './DepartmentSuggestions';

interface TriageDecisionDisplayProps {
  caseId: string;
}

export const TriageDecisionDisplay: React.FC<TriageDecisionDisplayProps> = ({
  caseId,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triageDecision, setTriageDecision] = useState<any>(null);
  const [recommendedActions, setRecommendedActions] = useState<any[]>([]);
  const [potentialDiagnoses, setPotentialDiagnoses] = useState<any[]>([]);
  const [departmentSuggestions, setDepartmentSuggestions] = useState<any[]>([]);

  const triageService = TriageDecisionService.getInstance();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch triage decision
        const decision = await triageService.fetchTriageDecision(caseId);
        setTriageDecision(decision);

        // Fetch related data
        const [actions, diagnoses, suggestions] = await Promise.all([
          triageService.fetchRecommendedActions(decision.id),
          triageService.fetchPotentialDiagnoses(decision.id),
          triageService.fetchDepartmentSuggestions(decision.id),
        ]);

        setRecommendedActions(actions);
        setPotentialDiagnoses(diagnoses);
        setDepartmentSuggestions(suggestions);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [caseId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
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

  if (!triageDecision) {
    return (
      <Box p={2}>
        <Alert severity="warning">No triage decision found for this case.</Alert>
      </Box>
    );
  }

  return (
    <Box p={2}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <SeverityIndicator
            severity={triageDecision.severity}
            confidence={triageDecision.confidence}
            explanation={triageDecision.explanation}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <RecommendedActions actions={recommendedActions} />
        </Grid>
        <Grid item xs={12} md={6}>
          <PotentialDiagnoses diagnoses={potentialDiagnoses} />
        </Grid>
        <Grid item xs={12}>
          <DepartmentSuggestions suggestions={departmentSuggestions} />
        </Grid>
      </Grid>
    </Box>
  );
}; 