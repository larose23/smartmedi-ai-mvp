import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Box
} from '@mui/material';
import { dataIntegrityManager } from '../../lib/database/integrity';

interface DashboardData {
  summary: {
    totalIssues: number;
    criticalIssues: number;
    warningIssues: number;
  };
  metrics: Record<string, {
    count: number;
    status: 'ok' | 'warning' | 'error';
  }>;
  recentIssues: Array<{
    metric: string;
    count: number;
    severity: string;
    timestamp: string;
  }>;
}

export default function DataQualityDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const dashboardData = await dataIntegrityManager.getDataQualityDashboard();
        setData(dashboardData);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000); // Refresh every 5 minutes

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
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Failed to load data quality metrics: {error}
      </Alert>
    );
  }

  if (!data) return null;

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Data Quality Dashboard
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Issues
              </Typography>
              <Typography variant="h4">
                {data.summary.totalIssues}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Critical Issues
              </Typography>
              <Typography variant="h4" color="error">
                {data.summary.criticalIssues}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Warning Issues
              </Typography>
              <Typography variant="h4" color="warning.main">
                {data.summary.warningIssues}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Metrics Table */}
      <Typography variant="h5" gutterBottom>
        Data Quality Metrics
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Metric</TableCell>
            <TableCell>Count</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(data.metrics).map(([name, metric]) => (
            <TableRow key={name}>
              <TableCell>{name}</TableCell>
              <TableCell>{metric.count}</TableCell>
              <TableCell>
                <Alert
                  severity={metric.status === 'error' ? 'error' : 'success'}
                  sx={{ py: 0 }}
                >
                  {metric.status.toUpperCase()}
                </Alert>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Recent Issues */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        Recent Issues
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Metric</TableCell>
            <TableCell>Count</TableCell>
            <TableCell>Severity</TableCell>
            <TableCell>Timestamp</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.recentIssues.map((issue, index) => (
            <TableRow key={index}>
              <TableCell>{issue.metric}</TableCell>
              <TableCell>{issue.count}</TableCell>
              <TableCell>
                <Alert
                  severity={issue.severity === 'high' ? 'error' : 'warning'}
                  sx={{ py: 0 }}
                >
                  {issue.severity.toUpperCase()}
                </Alert>
              </TableCell>
              <TableCell>
                {new Date(issue.timestamp).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 