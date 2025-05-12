import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Slider,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { RiskFactor, ScenarioModel } from '../../services/bayesianNetworkService';
import DeteriorationTimeline from './DeteriorationTimeline';
import ContributingFactors from './ContributingFactors';

interface WhatIfScenarioProps {
  riskFactors: RiskFactor[];
  onSaveScenario: (scenario: ScenarioModel) => void;
}

export default function WhatIfScenario({
  riskFactors,
  onSaveScenario,
}: WhatIfScenarioProps) {
  const [open, setOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [modifiedFactors, setModifiedFactors] = useState<Map<string, number>>(new Map());
  const [selectedFactor, setSelectedFactor] = useState<RiskFactor | null>(null);
  const [probability, setProbability] = useState(0);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setScenarioName('');
    setModifiedFactors(new Map());
    setSelectedFactor(null);
    setProbability(0);
  };

  const handleAddFactor = () => {
    if (!selectedFactor) return;

    setModifiedFactors(new Map(modifiedFactors.set(selectedFactor.id, probability)));
    setSelectedFactor(null);
    setProbability(0);
  };

  const handleRemoveFactor = (factorId: string) => {
    const newFactors = new Map(modifiedFactors);
    newFactors.delete(factorId);
    setModifiedFactors(newFactors);
  };

  const handleSave = () => {
    if (!scenarioName || modifiedFactors.size === 0) return;

    const scenario: ScenarioModel = {
      id: crypto.randomUUID(),
      name: scenarioName,
      baseFactors: riskFactors,
      modifiedFactors: Array.from(modifiedFactors.entries()).map(([factorId, probability]) => ({
        factorId,
        newProbability: probability,
      })),
      resultingProbabilities: [], // This will be calculated by the service
    };

    onSaveScenario(scenario);
    handleClose();
  };

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        startIcon={<AddIcon />}
        onClick={handleOpen}
      >
        Create What-If Scenario
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Create What-If Scenario</DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Scenario Name"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                margin="normal"
              />
            </Grid>

            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Modified Factors
                </Typography>
                <Box display="flex" gap={2} mb={2}>
                  <TextField
                    select
                    label="Select Factor"
                    value={selectedFactor?.id || ''}
                    onChange={(e) => {
                      const factor = riskFactors.find((f) => f.id === e.target.value);
                      setSelectedFactor(factor || null);
                      setProbability(factor?.probability || 0);
                    }}
                    fullWidth
                    SelectProps={{
                      native: true,
                    }}
                  >
                    <option value="">Select a factor</option>
                    {riskFactors.map((factor) => (
                      <option key={factor.id} value={factor.id}>
                        {factor.name}
                      </option>
                    ))}
                  </TextField>
                  <TextField
                    type="number"
                    label="Probability"
                    value={probability}
                    onChange={(e) => setProbability(Number(e.target.value))}
                    inputProps={{
                      min: 0,
                      max: 1,
                      step: 0.1,
                    }}
                    sx={{ width: 150 }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleAddFactor}
                    disabled={!selectedFactor}
                  >
                    Add
                  </Button>
                </Box>

                <List>
                  {Array.from(modifiedFactors.entries()).map(([factorId, prob]) => {
                    const factor = riskFactors.find((f) => f.id === factorId);
                    if (!factor) return null;

                    return (
                      <ListItem
                        key={factorId}
                        secondaryAction={
                          <IconButton
                            edge="end"
                            aria-label="delete"
                            onClick={() => handleRemoveFactor(factorId)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        }
                      >
                        <ListItemText
                          primary={factor.name}
                          secondary={`Probability: ${(prob * 100).toFixed(1)}%`}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              </Paper>
            </Grid>

            {modifiedFactors.size > 0 && (
              <>
                <Grid item xs={12}>
                  <DeteriorationTimeline
                    probabilities={[]} // This will be calculated by the service
                  />
                </Grid>
                <Grid item xs={12}>
                  <ContributingFactors
                    factors={riskFactors}
                    contributingFactors={[]} // This will be calculated by the service
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            color="primary"
            disabled={!scenarioName || modifiedFactors.size === 0}
          >
            Save Scenario
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 