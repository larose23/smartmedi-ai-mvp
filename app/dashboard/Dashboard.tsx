'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppState } from '../../app/context/StateContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CalendarPlus } from 'lucide-react';
import ViewDetailsModal from '@/components/ViewDetailsModal';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
  // Use our centralized state
  const {
    state,
    fetchCheckIns,
    fetchArchivedPatients,
    fetchStaff,
    getFilteredPatients,
    selectPatient,
    setDashboardFilter,
    showPatientDetails,
    addNotification,
    archivePatient
  } = useAppState();
  
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Set up data fetching on component mount
  useEffect(() => {
    // Fetch initial data
    fetchCheckIns();
    fetchArchivedPatients();
    fetchStaff();
    
    // Set up polling interval for fresh data
    const intervalId = setInterval(() => {
      fetchCheckIns();
      setLastUpdate(new Date());
    }, 120000); // 2 minutes
    
    return () => clearInterval(intervalId);
  }, [fetchCheckIns, fetchArchivedPatients, fetchStaff]);

  // Calculate filtered patients using memoized selector
  const filteredPatients = useMemo(() => {
    return getFilteredPatients();
  }, [getFilteredPatients]);

  // Handle opening patient details
  const handleViewDetails = useCallback((patient) => {
    selectPatient(patient);
    setIsModalOpen(true);
    showPatientDetails(true);
  }, [selectPatient, showPatientDetails]);

  // Handle marking a patient as seen (archive)
  const handleMarkAsSeen = useCallback(async (patientId) => {
    try {
      await archivePatient(patientId);
      addNotification('Patient marked as seen', 'success');
    } catch (error: any) {
      console.error('Error marking patient as seen:', error);
      addNotification(`Failed to mark patient as seen: ${error.message}`, 'error');
    }
  }, [archivePatient, addNotification]);

  // Helper function for calculating age
  const calculateAge = useCallback((dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }, []);

  // Helper function for time ago
  const getTimeAgo = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  }, []);

  return (
    <div>
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <h2 className="text-xl font-bold mb-2">Patient Dashboard</h2>
        <p className="text-gray-600">
          Managing {state.patients.checkIns.length} patient check-ins • Last updated{' '}
          {getTimeAgo(lastUpdate.toISOString())}
        </p>
      </div>

      {/* Patient table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient Name</TableHead>
                <TableHead>Triage</TableHead>
                <TableHead>Primary Symptom</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.patients.loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredPatients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    No patients found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPatients.map((patient) => (
                  <TableRow 
                    key={patient.id} 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleViewDetails(patient)}
                  >
                    <TableCell className="font-medium">
                      <div>{patient.full_name}</div>
                      <div className="text-sm text-gray-500">
                        {calculateAge(patient.date_of_birth)} • {patient.gender?.charAt(0) || ''}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          patient.triage_score === 'High' ? 'destructive' : 
                          patient.triage_score === 'Medium' ? 'default' : 
                          'secondary'
                        }
                      >
                        {patient.triage_score}
                      </Badge>
                    </TableCell>
                    <TableCell>{patient.primary_symptom || 'Not specified'}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(patient);
                          }}
                        >
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsSeen(patient.id);
                          }}
                        >
                          Seen
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* View Details Modal */}
      {isModalOpen && state.patients.selectedPatient && (
        <ViewDetailsModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            showPatientDetails(false);
          }}
          patient={state.patients.selectedPatient}
          onAppointmentBooked={() => fetchCheckIns()}
        />
      )}
    </div>
  );
} 