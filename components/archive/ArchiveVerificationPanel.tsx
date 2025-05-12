import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Fade,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { ArchiveVerificationService, ArchiveVerification, ArchiveTransaction } from '@/services/archiveVerificationService';

export const ArchiveVerificationPanel: React.FC = () => {
  const [verification, setVerification] = useState<ArchiveVerification | null>(null);
  const [transactions, setTransactions] = useState<ArchiveTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const archiveVerificationService = ArchiveVerificationService.getInstance();

  useEffect(() => {
    fetchVerification();
    fetchTransactions();
  }, []);

  const fetchVerification = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await archiveVerificationService.verifyArchiveIntegrity();
      setVerification(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await archiveVerificationService.getTransactionHistory();
      setTransactions(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([fetchVerification(), fetchTransactions()]);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusIcon = (status: ArchiveVerification['verification_status']) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return null;
    }
  };

  return (
    <Box>
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6">Archive Verification</Typography>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : verification ? (
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Verification Status
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  {getStatusIcon(verification.verification_status)}
                  <Typography variant="h6">
                    {verification.verification_status.toUpperCase()}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Last verified: {verification.last_verification.toLocaleString()}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Appointment Counts
                </Typography>
                <Box display="flex" flexDirection="column" gap={1}>
                  <Typography>
                    Total: {verification.total_appointments}
                  </Typography>
                  <Typography>
                    Archived: {verification.archived_appointments}
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Integrity Check
                </Typography>
                <Box display="flex" flexDirection="column" gap={1}>
                  <Typography>
                    Orphaned Records: {verification.orphaned_records}
                  </Typography>
                  <Chip
                    label={
                      verification.orphaned_records > 0
                        ? 'Integrity Issues Found'
                        : 'No Issues Found'
                    }
                    color={verification.orphaned_records > 0 ? 'error' : 'success'}
                    size="small"
                  />
                </Box>
              </Paper>
            </Grid>
          </Grid>
        ) : null}
      </Paper>

      <Paper elevation={3} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Transaction History
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>Appointment ID</TableCell>
                <TableCell>Patient ID</TableCell>
                <TableCell>Status Change</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Result</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((transaction) => (
                  <Fade in={true} key={transaction.id}>
                    <TableRow>
                      <TableCell>
                        {transaction.timestamp.toLocaleString()}
                      </TableCell>
                      <TableCell>{transaction.appointment_id}</TableCell>
                      <TableCell>{transaction.patient_id}</TableCell>
                      <TableCell>
                        <Chip
                          label={`${transaction.previous_status} → ${transaction.new_status}`}
                          size="small"
                          color={
                            transaction.new_status === 'archived'
                              ? 'success'
                              : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>{transaction.user_id}</TableCell>
                      <TableCell>
                        <Chip
                          label={transaction.success ? 'Success' : 'Failed'}
                          color={transaction.success ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  </Fade>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={transactions.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Box>
  );
}; 