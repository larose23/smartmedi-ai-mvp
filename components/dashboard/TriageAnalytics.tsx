import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from '@mui/lab';
import {
  TrendingUp,
  TrendingDown,
  Warning,
  Refresh,
  AccessTime,
  Person,
  Speed,
} from '@mui/icons-material';
import { useTriageAnalytics } from '@/hooks/useTriageAnalytics';

export function TriageAnalytics() {
  const {
    loading,
    error,
    queueAnalytics,
    clinicianPerformance,
    getCurrentMetrics,
    getTrendMetrics,
    getTopPerformers,
    getBottleneckMetrics,
    refreshAnalytics,
  } = useTriageAnalytics();

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

  const currentMetrics = getCurrentMetrics();
  const trendMetrics = getTrendMetrics();
  const bottleneckMetrics = getBottleneckMetrics();
  const topPerformers = getTopPerformers();

  const renderTrendIndicator = (value: number) => {
    if (value > 0) {
      return <TrendingUp color="error" />;
    } else if (value < 0) {
      return <TrendingDown color="success" />;
    }
    return null;
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Triage Analytics
        </Typography>
        <Tooltip title="Refresh Analytics">
          <IconButton onClick={refreshAnalytics}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        {/* Current Metrics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Current Metrics
              </Typography>
              {currentMetrics && (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box display="flex" alignItems="center">
                      <AccessTime sx={{ mr: 1 }} />
                      <Typography>
                        Avg Wait: {currentMetrics.avgWaitTime.toFixed(1)} min
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box display="flex" alignItems="center">
                      <Speed sx={{ mr: 1 }} />
                      <Typography>
                        Processing: {currentMetrics.avgProcessingTime.toFixed(1)} min
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography>
                      Total Cases: {currentMetrics.totalCases}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography>
                      Completed: {currentMetrics.completedCases}
                    </Typography>
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Trend Analysis */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Trends
              </Typography>
              {trendMetrics && (
                <Timeline>
                  <TimelineItem>
                    <TimelineSeparator>
                      <TimelineDot color={trendMetrics.waitTimeTrend > 0 ? 'error' : 'success'}>
                        {renderTrendIndicator(trendMetrics.waitTimeTrend)}
                      </TimelineDot>
                      <TimelineConnector />
                    </TimelineSeparator>
                    <TimelineContent>
                      <Typography>
                        Wait Time: {Math.abs(trendMetrics.waitTimeTrend).toFixed(1)} min
                        {trendMetrics.waitTimeTrend > 0 ? ' increase' : ' decrease'}
                      </Typography>
                    </TimelineContent>
                  </TimelineItem>
                  <TimelineItem>
                    <TimelineSeparator>
                      <TimelineDot color={trendMetrics.processingTimeTrend > 0 ? 'error' : 'success'}>
                        {renderTrendIndicator(trendMetrics.processingTimeTrend)}
                      </TimelineDot>
                      <TimelineConnector />
                    </TimelineSeparator>
                    <TimelineContent>
                      <Typography>
                        Processing Time: {Math.abs(trendMetrics.processingTimeTrend).toFixed(1)} min
                        {trendMetrics.processingTimeTrend > 0 ? ' increase' : ' decrease'}
                      </Typography>
                    </TimelineContent>
                  </TimelineItem>
                  <TimelineItem>
                    <TimelineSeparator>
                      <TimelineDot color={trendMetrics.caseVolumeTrend > 0 ? 'primary' : 'secondary'}>
                        {renderTrendIndicator(trendMetrics.caseVolumeTrend)}
                      </TimelineDot>
                    </TimelineSeparator>
                    <TimelineContent>
                      <Typography>
                        Case Volume: {Math.abs(trendMetrics.caseVolumeTrend)}
                        {trendMetrics.caseVolumeTrend > 0 ? ' increase' : ' decrease'}
                      </Typography>
                    </TimelineContent>
                  </TimelineItem>
                </Timeline>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Bottleneck Alerts */}
        {bottleneckMetrics && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  System Alerts
                </Typography>
                <Grid container spacing={2}>
                  {bottleneckMetrics.isHighWaitTime && (
                    <Grid item xs={12} sm={6} md={3}>
                      <Alert severity="warning" icon={<Warning />}>
                        High Wait Times
                      </Alert>
                    </Grid>
                  )}
                  {bottleneckMetrics.isHighProcessingTime && (
                    <Grid item xs={12} sm={6} md={3}>
                      <Alert severity="warning" icon={<Warning />}>
                        Slow Processing
                      </Alert>
                    </Grid>
                  )}
                  {bottleneckMetrics.isHighEscalationRate && (
                    <Grid item xs={12} sm={6} md={3}>
                      <Alert severity="error" icon={<Warning />}>
                        High Escalation Rate
                      </Alert>
                    </Grid>
                  )}
                  {bottleneckMetrics.isHighOverrideRate && (
                    <Grid item xs={12} sm={6} md={3}>
                      <Alert severity="error" icon={<Warning />}>
                        High Override Rate
                      </Alert>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Top Performers */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Performers
              </Typography>
              <Grid container spacing={2}>
                {topPerformers.map((performer, index) => (
                  <Grid item xs={12} sm={6} md={4} key={performer.assignedTo}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box display="flex" alignItems="center" mb={1}>
                          <Person sx={{ mr: 1 }} />
                          <Typography variant="subtitle1">
                            Clinician {index + 1}
                          </Typography>
                        </Box>
                        <Typography>
                          Cases: {performer.completedCases}
                        </Typography>
                        <Typography>
                          Avg Time: {performer.avgProcessingTime.toFixed(1)} min
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
} 