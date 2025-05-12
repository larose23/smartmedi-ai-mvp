import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import { HeatMap } from '@nivo/heatmap';
import { LineChart } from '@nivo/line';
import { useTheme } from '@mui/material/styles';

interface SymptomSeverity {
  symptom: string;
  severity: number;
  confidence: number;
}

interface SymptomRelationship {
  source: string;
  target: string;
  confidence: number;
  type: string;
}

interface FollowUpQuestion {
  question: string;
  relevance: number;
  context: string;
}

interface TemporalPattern {
  onset: string;
  duration: string;
  frequency: string;
  pattern: {
    x: string;
    y: number;
  }[];
}

interface TriageResults {
  severityHeatmap: SymptomSeverity[];
  relationships: SymptomRelationship[];
  followUpQuestions: FollowUpQuestion[];
  temporalPattern: TemporalPattern;
}

export default function TriageResultsTab({ caseId }: { caseId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<TriageResults | null>(null);
  const theme = useTheme();

  useEffect(() => {
    const fetchTriageResults = async () => {
      try {
        const response = await fetch(`/api/triage/results/${caseId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch triage results');
        }
        const data = await response.json();
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTriageResults();
  }, [caseId]);

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

  if (!results) {
    return <Alert severity="info">No triage results available</Alert>;
  }

  const heatmapData = results.severityHeatmap.map(item => ({
    symptom: item.symptom,
    severity: item.severity,
    confidence: item.confidence,
  }));

  return (
    <Grid container spacing={3}>
      {/* Symptom Severity Heatmap */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Symptom Severity Heatmap
          </Typography>
          <Box height={300}>
            <HeatMap
              data={heatmapData}
              keys={['severity']}
              indexBy="symptom"
              margin={{ top: 50, right: 90, bottom: 50, left: 90 }}
              forceSquare={true}
              axisTop={null}
              axisRight={null}
              colors={{
                type: 'sequential',
                scheme: 'reds',
              }}
              labelTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
              animate={true}
              motionConfig="wobbly"
              theme={{
                axis: {
                  ticks: {
                    text: {
                      fill: theme.palette.text.primary,
                    },
                  },
                },
              }}
            />
          </Box>
        </Paper>
      </Grid>

      {/* Symptom Relationships */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Symptom Relationships
          </Typography>
          <List>
            {results.relationships.map((rel, index) => (
              <React.Fragment key={index}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body1">
                          {rel.source} → {rel.target}
                        </Typography>
                        <Chip
                          label={`${Math.round(rel.confidence * 100)}%`}
                          size="small"
                          color="primary"
                        />
                      </Box>
                    }
                    secondary={rel.type}
                  />
                </ListItem>
                {index < results.relationships.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      </Grid>

      {/* Follow-up Questions */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Suggested Follow-up Questions
          </Typography>
          <List>
            {results.followUpQuestions.map((q, index) => (
              <React.Fragment key={index}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body1">{q.question}</Typography>
                        <Chip
                          label={`${Math.round(q.relevance * 100)}%`}
                          size="small"
                          color="secondary"
                        />
                      </Box>
                    }
                    secondary={q.context}
                  />
                </ListItem>
                {index < results.followUpQuestions.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      </Grid>

      {/* Temporal Pattern */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Temporal Pattern
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1">Onset</Typography>
              <Typography variant="body2">{results.temporalPattern.onset}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1">Duration</Typography>
              <Typography variant="body2">{results.temporalPattern.duration}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1">Frequency</Typography>
              <Typography variant="body2">{results.temporalPattern.frequency}</Typography>
            </Grid>
          </Grid>
          <Box height={300} mt={2}>
            <LineChart
              data={[
                {
                  id: 'symptom intensity',
                  data: results.temporalPattern.pattern,
                },
              ]}
              margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
              xScale={{ type: 'point' }}
              yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Time',
                legendOffset: 36,
                legendPosition: 'middle',
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Intensity',
                legendOffset: -40,
                legendPosition: 'middle',
              }}
              pointSize={10}
              pointColor={{ theme: 'background' }}
              pointBorderWidth={2}
              pointBorderColor={{ from: 'serieColor' }}
              pointLabelYOffset={-12}
              useMesh={true}
              theme={{
                axis: {
                  ticks: {
                    text: {
                      fill: theme.palette.text.primary,
                    },
                  },
                },
              }}
            />
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
} 