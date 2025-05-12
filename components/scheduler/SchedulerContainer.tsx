import React, { useState } from 'react';
import { Box, Grid, Tabs, Tab, Paper } from '@mui/material';
import { AppointmentCalendar } from './AppointmentCalendar';
import { NoShowPrediction } from './NoShowPrediction';
import { SchedulerService, Appointment } from '@/services/schedulerService';

interface SchedulerContainerProps {
  patientId: string;
  department: string;
  urgencyScore?: number;
}

export const SchedulerContainer: React.FC<SchedulerContainerProps> = ({
  patientId,
  department,
  urgencyScore,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [currentAppointment, setCurrentAppointment] = useState<Appointment | null>(null);

  const handleAppointmentBooked = (appointment: Appointment) => {
    setCurrentAppointment(appointment);
    setActiveTab(1); // Switch to no-show prediction tab
  };

  return (
    <Box>
      <Paper elevation={3} sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
        >
          <Tab label="Schedule Appointment" />
          <Tab
            label="No-Show Prediction"
            disabled={!currentAppointment}
          />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <AppointmentCalendar
          patientId={patientId}
          department={department}
          urgencyScore={urgencyScore}
          onAppointmentBooked={handleAppointmentBooked}
        />
      )}

      {activeTab === 1 && currentAppointment && (
        <NoShowPrediction appointmentId={currentAppointment.id} />
      )}
    </Box>
  );
}; 