import { useEffect, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  CheckCircle as CheckCircleIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';

interface AnalyticsData {
  avgTriageTime: number;
  accuracyRate: number;
  throughput: number;
}

const AnalyticsWidgets = () => {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    avgTriageTime: 0,
    accuracyRate: 0,
    throughput: 0,
  });

  useEffect(() => {
    fetchAnalytics();
    // Set up real-time subscription for analytics updates
    const subscription = supabase
      .channel('analytics_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'triage_analytics',
        },
        () => {
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      // Fetch analytics data from Supabase
      const { data, error } = await supabase
        .from('triage_analytics')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        setAnalytics({
          avgTriageTime: data.avg_triage_time || 0,
          accuracyRate: data.accuracy_rate || 0,
          throughput: data.throughput || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const MetricCard = ({
    title,
    value,
    icon,
    unit,
  }: {
    title: string;
    value: number;
    icon: React.ReactNode;
    unit?: string;
  }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon}
          <Typography variant="h6" sx={{ ml: 1 }}>
            {title}
          </Typography>
        </Box>
        {loading ? (
          <CircularProgress size={24} />
        ) : (
          <Typography variant="h4">
            {value.toFixed(1)}
            {unit}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <MetricCard
          title="Average Triage Time"
          value={analytics.avgTriageTime}
          icon={<TimelineIcon color="primary" />}
          unit=" min"
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <MetricCard
          title="Accuracy Rate"
          value={analytics.accuracyRate}
          icon={<CheckCircleIcon color="success" />}
          unit="%"
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <MetricCard
          title="Throughput"
          value={analytics.throughput}
          icon={<SpeedIcon color="info" />}
          unit=" pts/hr"
        />
      </Grid>
    </Grid>
  );
};

export default AnalyticsWidgets; 