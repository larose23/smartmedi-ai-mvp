import { useEffect, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Card, Grid, Typography, Box, Container } from '@mui/material';
import { styled } from '@mui/material/styles';
import QueuePanel from '../../components/triage/QueuePanel';
import AnalyticsWidgets from '../../components/triage/AnalyticsWidgets';
import StatusValidation from '../../components/triage/StatusValidation';
import { TriageCase } from '../../types/triage';

const DashboardContainer = styled(Container)(({ theme }) => ({
  padding: theme.spacing(3),
  height: '100vh',
  overflow: 'auto',
}));

const Dashboard = () => {
  const supabase = useSupabaseClient();
  const [triageCases, setTriageCases] = useState<TriageCase[]>([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [totalPatients, setTotalPatients] = useState(0);

  useEffect(() => {
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('triage_cases')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'triage_cases',
        },
        (payload) => {
          // Handle real-time updates
          console.log('Real-time update:', payload);
          fetchTriageCases();
        }
      )
      .subscribe();

    // Initial fetch
    fetchTriageCases();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchTriageCases = async () => {
    const { data, error } = await supabase
      .from('triage_cases')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching triage cases:', error);
      return;
    }

    setTriageCases(data || []);
    setTotalPatients(data?.length || 0);
    setUnseenCount(data?.filter(case_ => !case_.seen_by_staff)?.length || 0);
  };

  return (
    <DashboardContainer maxWidth="xl">
      <Typography variant="h4" gutterBottom>
        Triage Nurse Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {/* Analytics Widgets */}
        <Grid item xs={12}>
          <AnalyticsWidgets />
        </Grid>

        {/* Main Content */}
        <Grid item xs={12} md={8}>
          <QueuePanel cases={triageCases} onUpdate={fetchTriageCases} />
        </Grid>

        {/* Status Validation Sidebar */}
        <Grid item xs={12} md={4}>
          <StatusValidation 
            totalPatients={totalPatients}
            unseenCount={unseenCount}
          />
        </Grid>
      </Grid>
    </DashboardContainer>
  );
};

export default Dashboard; 