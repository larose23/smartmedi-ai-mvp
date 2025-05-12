import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';

interface StatusValidationProps {
  totalPatients: number;
  unseenCount: number;
}

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  status: 'success' | 'warning' | 'error';
}

const StatusValidation = ({ totalPatients, unseenCount }: StatusValidationProps) => {
  const supabase = useSupabaseClient();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    fetchAuditLogs();
    // Subscribe to audit log updates
    const subscription = supabase
      .channel('audit_logs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'triage_audit_logs',
        },
        () => {
          fetchAuditLogs();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('triage_audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data) {
        setAuditLogs(data);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <AccessTimeIcon color="action" />;
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Status Validation
      </Typography>

      {/* Status Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle1">Total Patients</Typography>
            <Chip label={totalPatients} color="primary" />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1">Unseen Patients</Typography>
            <Chip
              label={unseenCount}
              color={unseenCount > 0 ? 'warning' : 'success'}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Recent Activity
          </Typography>
          <List>
            {auditLogs.map((log, index) => (
              <Box key={log.id}>
                <ListItem>
                  <ListItemIcon>{getStatusIcon(log.status)}</ListItemIcon>
                  <ListItemText
                    primary={log.action}
                    secondary={
                      <>
                        <Typography
                          component="span"
                          variant="body2"
                          color="textPrimary"
                        >
                          {new Date(log.timestamp).toLocaleString()}
                        </Typography>
                        {' — '}
                        {log.details}
                      </>
                    }
                  />
                </ListItem>
                {index < auditLogs.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};

export default StatusValidation; 