import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Box,
  Chip,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface FlowMetrics {
  department: string;
  currentLoad: number;
  averageWaitTime: number;
  throughput: number;
  bottleneckScore: number;
}

interface SurgePrediction {
  department: string;
  predictedLoad: number;
  confidence: number;
  timeWindow: string;
  factors: string[];
}

interface ResourceRecommendation {
  department: string;
  currentStaffing: number;
  recommendedStaffing: number;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
}

export default function ResourceOptimizationPanel() {
  const [flowMetrics, setFlowMetrics] = useState<FlowMetrics[]>([]);
  const [surgePredictions, setSurgePredictions] = useState<SurgePrediction[]>([]);
  const [recommendations, setRecommendations] = useState<ResourceRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metricsRes, predictionsRes, recommendationsRes] = await Promise.all([
          fetch('/api/triage/resource-optimization?type=flow-metrics'),
          fetch('/api/triage/resource-optimization?type=surge-predictions'),
          fetch('/api/triage/resource-optimization?type=resource-recommendations'),
        ]);

        if (!metricsRes.ok || !predictionsRes.ok || !recommendationsRes.ok) {
          throw new Error('Failed to fetch resource optimization data');
        }

        const [metrics, predictions, recs] = await Promise.all([
          metricsRes.json(),
          predictionsRes.json(),
          recommendationsRes.json(),
        ]);

        setFlowMetrics(metrics);
        setSurgePredictions(predictions);
        setRecommendations(recs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

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
      {/* Flow Metrics Chart */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Patient Flow Metrics
            </Typography>
            <Box height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={flowMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="currentLoad" name="Current Load" fill="#8884d8" />
                  <Bar dataKey="averageWaitTime" name="Avg Wait Time (min)" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Surge Predictions */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Surge Predictions
            </Typography>
            {surgePredictions.map((prediction) => (
              <Box key={prediction.department} mb={2}>
                <Typography variant="subtitle1">
                  {prediction.department}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Predicted Load: {prediction.predictedLoad.toFixed(1)} cases
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Confidence: {(prediction.confidence * 100).toFixed(0)}%
                </Typography>
                <Box mt={1}>
                  {prediction.factors.map((factor) => (
                    <Chip
                      key={factor}
                      label={factor}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>

      {/* Resource Recommendations */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Resource Recommendations
            </Typography>
            {recommendations.map((rec) => (
              <Box key={rec.department} mb={2}>
                <Typography variant="subtitle1">
                  {rec.department}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Current Staffing: {rec.currentStaffing}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Recommended: {rec.recommendedStaffing}
                </Typography>
                <Chip
                  label={rec.priority}
                  color={
                    rec.priority === 'high'
                      ? 'error'
                      : rec.priority === 'medium'
                      ? 'warning'
                      : 'success'
                  }
                  size="small"
                  sx={{ mt: 1 }}
                />
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  {rec.reasoning}
                </Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
} 