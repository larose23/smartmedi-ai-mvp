import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Chip,
  Stack,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Download as DownloadIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { ArchiveVerificationService } from '@/services/archiveVerificationService';
import { PatientTimeline } from './PatientTimeline';
import { ArchiveExportDialog } from './ArchiveExportDialog';

interface ArchiveFilters {
  triageScoreRange: [number, number];
  department: string;
  dateRange: [Date | null, Date | null];
  riskFactors: string[];
}

interface ArchivedPatient {
  id: string;
  patientId: string;
  triageScore: number;
  department: string;
  checkInDate: Date;
  followUpDate: Date | null;
  outcome: string;
  riskFactors: string[];
  statusTransitions: {
    status: string;
    timestamp: Date;
    source: string;
  }[];
}

export const EnhancedArchiveInterface: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patients, setPatients] = useState<ArchivedPatient[]>([]);
  const [filters, setFilters] = useState<ArchiveFilters>({
    triageScoreRange: [0, 10],
    department: '',
    dateRange: [null, null],
    riskFactors: [],
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<ArchivedPatient | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const departments = [
    'Emergency',
    'Urgent Care',
    'Primary Care',
    'Specialty Care',
  ];

  const riskFactorOptions = [
    'High Blood Pressure',
    'Diabetes',
    'Heart Disease',
    'Respiratory Issues',
    'Mental Health',
  ];

  useEffect(() => {
    fetchArchivedPatients();
  }, [filters]);

  const fetchArchivedPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      // TODO: Implement API call to fetch archived patients with filters
      // This will be implemented in the ArchiveVerificationService
      const result = await ArchiveVerificationService.getInstance().getArchivedPatients(filters);
      setPatients(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: keyof ArchiveFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleExport = () => {
    setShowExportDialog(true);
  };

  const handleTimelineView = (patient: ArchivedPatient) => {
    setSelectedPatient(patient);
  };

  return (
    <Box>
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6">Enhanced Archive Interface</Typography>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Toggle Filters">
              <IconButton onClick={() => setShowFilters(!showFilters)}>
                <FilterListIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export Data">
              <IconButton onClick={handleExport}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {showFilters && (
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                label="Department"
                value={filters.department}
                onChange={(e) => handleFilterChange('department', e.target.value)}
              >
                <MenuItem value="">All Departments</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <DatePicker
                label="Start Date"
                value={filters.dateRange[0]}
                onChange={(date) => handleFilterChange('dateRange', [date, filters.dateRange[1]])}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <DatePicker
                label="End Date"
                value={filters.dateRange[1]}
                onChange={(date) => handleFilterChange('dateRange', [filters.dateRange[0], date])}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                label="Risk Factors"
                value={filters.riskFactors}
                onChange={(e) => handleFilterChange('riskFactors', e.target.value)}
                SelectProps={{
                  multiple: true,
                  renderValue: (selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  ),
                }}
              >
                {riskFactorOptions.map((factor) => (
                  <MenuItem key={factor} value={factor}>
                    {factor}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2}>
            {patients.map((patient) => (
              <Grid item xs={12} md={6} lg={4} key={patient.id}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle1">
                      Patient ID: {patient.patientId}
                    </Typography>
                    <Tooltip title="View Timeline">
                      <IconButton
                        size="small"
                        onClick={() => handleTimelineView(patient)}
                      >
                        <TimelineIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Department: {patient.department}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Triage Score: {patient.triageScore}
                  </Typography>
                  <Box mt={1}>
                    <Typography variant="body2" color="text.secondary">
                      Risk Factors:
                    </Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {patient.riskFactors.map((factor) => (
                        <Chip
                          key={factor}
                          label={factor}
                          size="small"
                          sx={{ mt: 0.5 }}
                        />
                      ))}
                    </Stack>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {selectedPatient && (
        <PatientTimeline
          patient={selectedPatient}
          open={!!selectedPatient}
          onClose={() => setSelectedPatient(null)}
        />
      )}

      <ArchiveExportDialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        patients={patients}
      />
    </Box>
  );
}; 