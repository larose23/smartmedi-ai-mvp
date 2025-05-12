import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { FeedbackService, FeedbackMetrics } from '@/services/feedbackService';

export const PerformanceMetricsDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<FeedbackMetrics | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    fetchMetrics();
  }, [timeRange]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const startDate = new Date();
      switch (timeRange) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      const feedbackService = FeedbackService.getInstance();
      const result = await feedbackService.getFeedbackMetrics({
        startDate,
        endDate: new Date(),
      });

      setMetrics(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  const renderMetricCard = (
    title: string,
    value: number,
    icon: React.ReactNode,
    color: string
  ) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" color="text.secondary">
            {title}
          </Typography>
          {icon}
        </Box>
        <Typography variant="h4" sx={{ mt: 2, color }}>
          {value.toFixed(1)}
        </Typography>
      </CardContent>
    </Card>
  );

  const renderBiasChart = () => {
    if (!metrics) return null;

    const data = metrics.demographicBias.map(bias => ({
      factor: bias.factor,
      biasScore: bias.biasScore,
      sampleSize: bias.sampleSize,
    }));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="factor" />
          <YAxis />
          <RechartsTooltip />
          <Bar dataKey="biasScore" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderDepartmentPerformance = () => {
    if (!metrics) return null;

    return (
      <Stack spacing={2}>
        {metrics.departmentPerformance.map((dept) => (
          <Paper key={dept.department} sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle1">{dept.department}</Typography>
              <Chip
                label={`${(dept.overrideRate * 100).toFixed(1)}% Override Rate`}
                color={dept.overrideRate > 0.2 ? 'error' : 'default'}
              />
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Accuracy
                </Typography>
                <Typography variant="h6">
                  {(dept.accuracy * 100).toFixed(1)}%
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Relevance
                </Typography>
                <Typography variant="h6">
                  {(dept.relevance * 100).toFixed(1)}%
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        ))}
      </Stack>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Performance Metrics</Typography>
        <Box display="flex" gap={1}>
          <Chip
            label="Week"
            onClick={() => setTimeRange('week')}
            color={timeRange === 'week' ? 'primary' : 'default'}
          />
          <Chip
            label="Month"
            onClick={() => setTimeRange('month')}
            color={timeRange === 'month' ? 'primary' : 'default'}
          />
          <Chip
            label="Year"
            onClick={() => setTimeRange('year')}
            color={timeRange === 'year' ? 'primary' : 'default'}
          />
          <Tooltip title="Refresh">
            <IconButton onClick={fetchMetrics}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          {renderMetricCard(
            'Average Accuracy',
            metrics.averageAccuracy,
            <TrendingUpIcon color="success" />,
            'success.main'
          )}
        </Grid>
        <Grid item xs={12} md={3}>
          {renderMetricCard(
            'Average Relevance',
            metrics.averageRelevance,
            <TrendingUpIcon color="primary" />,
            'primary.main'
          )}
        </Grid>
        <Grid item xs={12} md={3}>
          {renderMetricCard(
            'Override Rate',
            metrics.overrideRate * 100,
            <WarningIcon color="warning" />,
            'warning.main'
          )}
        </Grid>
        <Grid item xs={12} md={3}>
          {renderMetricCard(
            'Positive Feedback',
            (metrics.positiveFeedback / metrics.totalFeedback) * 100,
            <TrendingUpIcon color="success" />,
            'success.main'
          )}
        </Grid>
      </Grid>

      <Box mt={4}>
        <Typography variant="h6" gutterBottom>
          Demographic Bias Analysis
        </Typography>
        {renderBiasChart()}
      </Box>

      <Box mt={4}>
        <Typography variant="h6" gutterBottom>
          Department Performance
        </Typography>
        {renderDepartmentPerformance()}
      </Box>
    </Box>
  );
}; 