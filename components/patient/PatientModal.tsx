import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  Box,
  IconButton,
  Typography,
  useTheme,
  useMediaQuery,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DemographicsTab from './tabs/DemographicsTab';
import TriageResultsTab from './tabs/TriageResultsTab';
import MedicalHistoryTab from './tabs/MedicalHistoryTab';
import AppointmentTab from './tabs/AppointmentTab';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { usePatientStore } from '../../store/patientStore';

interface PatientModalProps {
  open: boolean;
  onClose: () => void;
  patientId: string;
  caseId: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`patient-tabpanel-${index}`}
      aria-labelledby={`patient-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function PatientModal({ open, onClose, patientId, caseId }: PatientModalProps) {
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const { fetchPatientData, fetchMedicalHistory, fetchAppointments, loading } = usePatientStore();

  useEffect(() => {
    if (open) {
      fetchPatientData(patientId);
      fetchMedicalHistory(patientId);
      fetchAppointments(caseId);
    }
  }, [open, patientId, caseId, fetchPatientData, fetchMedicalHistory, fetchAppointments]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const isLoading = loading.patient || loading.history || loading.appointments;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: fullScreen ? '100%' : '80vh',
          maxHeight: fullScreen ? '100%' : '90vh',
        },
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Patient Information</Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="patient information tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Demographics" id="patient-tab-0" />
          <Tab label="Triage Results" id="patient-tab-1" />
          <Tab label="Medical History" id="patient-tab-2" />
          <Tab label="Appointment" id="patient-tab-3" />
        </Tabs>
      </Box>

      <DialogContent dividers sx={{ p: 0, overflow: 'auto', position: 'relative' }}>
        {isLoading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="400px"
          >
            <CircularProgress />
          </Box>
        ) : (
          <ErrorBoundary>
            <TabPanel value={tabValue} index={0}>
              <DemographicsTab patientId={patientId} />
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              <TriageResultsTab caseId={caseId} />
            </TabPanel>
            <TabPanel value={tabValue} index={2}>
              <MedicalHistoryTab patientId={patientId} />
            </TabPanel>
            <TabPanel value={tabValue} index={3}>
              <AppointmentTab caseId={caseId} />
            </TabPanel>
          </ErrorBoundary>
        )}
      </DialogContent>
    </Dialog>
  );
} 