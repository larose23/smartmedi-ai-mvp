import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Chip,
  Avatar,
} from '@mui/material';
import { usePatientStore } from '../../../store/patientStore';

export default function DemographicsTab({ patientId }: { patientId: string }) {
  const { patientData, error, loading } = usePatientStore();

  if (loading.patient) {
    return null; // Loading is handled by the parent component
  }

  if (error.patient) {
    return null; // Error is handled by the error boundary
  }

  if (!patientData) {
    return null; // No data state is handled by the parent component
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  return (
    <Grid container spacing={3}>
      {/* Patient Header */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              width: 64,
              height: 64,
              bgcolor: 'primary.main',
              fontSize: '1.5rem',
            }}
          >
            {getInitials(patientData.first_name, patientData.last_name)}
          </Avatar>
          <Box>
            <Typography variant="h5">
              {patientData.first_name} {patientData.last_name}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              MRN: {patientData.medical_record_number}
            </Typography>
          </Box>
        </Paper>
      </Grid>

      {/* Basic Information */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Basic Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Age
              </Typography>
              <Typography variant="body1">
                {calculateAge(patientData.date_of_birth)} years
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Date of Birth
              </Typography>
              <Typography variant="body1">
                {new Date(patientData.date_of_birth).toLocaleDateString()}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Gender
              </Typography>
              <Typography variant="body1">{patientData.gender}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Ethnicity
              </Typography>
              <Typography variant="body1">{patientData.ethnicity}</Typography>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* Contact Information */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Contact Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">
                Address
              </Typography>
              <Typography variant="body1">
                {patientData.address.street}
                <br />
                {patientData.address.city}, {patientData.address.state} {patientData.address.zip}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Phone
              </Typography>
              <Typography variant="body1">{patientData.contact.phone}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Email
              </Typography>
              <Typography variant="body1">{patientData.contact.email}</Typography>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* Insurance Information */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Insurance Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">
                Provider
              </Typography>
              <Typography variant="body1">{patientData.insurance.provider}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Policy Number
              </Typography>
              <Typography variant="body1">{patientData.insurance.policy_number}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Group Number
              </Typography>
              <Typography variant="body1">{patientData.insurance.group_number}</Typography>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* Emergency Contact */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Emergency Contact
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">
                Name
              </Typography>
              <Typography variant="body1">{patientData.emergency_contact.name}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Relationship
              </Typography>
              <Typography variant="body1">{patientData.emergency_contact.relationship}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Phone
              </Typography>
              <Typography variant="body1">{patientData.emergency_contact.phone}</Typography>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* Last Visit */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Last Visit</Typography>
            <Chip
              label={new Date(patientData.last_visit).toLocaleDateString()}
              color="primary"
              variant="outlined"
            />
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
} 