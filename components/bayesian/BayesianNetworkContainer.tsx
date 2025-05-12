import React, { useEffect, useState } from 'react';
import { Box, Grid, CircularProgress, Alert } from '@mui/material';
import { BayesianNetworkService, RiskFactor, DeteriorationProbability, ScenarioModel } from '../../services/bayesianNetworkService';
import RiskFactorGraph from './RiskFactorGraph';
import DeteriorationTimeline from './DeteriorationTimeline';
import ContributingFactors from './ContributingFactors';
import WhatIfScenario from './WhatIfScenario';

interface BayesianNetworkContainerProps {
  caseId: string;
}

export default function BayesianNetworkContainer({
  caseId,
}: BayesianNetworkContainerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riskFactors, setRiskFactors] = useState<RiskFactor[]>([]);
  const [deteriorationProbabilities, setDeteriorationProbabilities] = useState<DeteriorationProbability[]>([]);
  const [selectedFactorId, setSelectedFactorId] = useState<string | undefined>();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const service = BayesianNetworkService.getInstance();
        
        const [factors, probabilities] = await Promise.all([
          service.fetchRiskFactors(caseId),
          service.fetchDeteriorationProbabilities(caseId),
        ]);

        setRiskFactors(factors);
        setDeteriorationProbabilities(probabilities);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [caseId]);

  const handleFactorSelect = (factorId: string) => {
    setSelectedFactorId(factorId);
  };

  const handleSaveScenario = async (scenario: ScenarioModel) => {
    try {
      const service = BayesianNetworkService.getInstance();
      await service.saveScenarioModel(scenario);
      // Optionally refresh data or show success message
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save scenario');
    }
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
      <Grid item xs={12}>
        <RiskFactorGraph
          riskFactors={riskFactors}
          selectedFactorId={selectedFactorId}
          onFactorSelect={handleFactorSelect}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <DeteriorationTimeline probabilities={deteriorationProbabilities} />
      </Grid>

      <Grid item xs={12} md={6}>
        <ContributingFactors
          factors={riskFactors}
          contributingFactors={
            deteriorationProbabilities[0]?.contributingFactors || []
          }
        />
      </Grid>

      <Grid item xs={12}>
        <Box display="flex" justifyContent="flex-end">
          <WhatIfScenario
            riskFactors={riskFactors}
            onSaveScenario={handleSaveScenario}
          />
        </Box>
      </Grid>
    </Grid>
  );
} 