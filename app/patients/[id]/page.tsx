'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Calendar, Clock, User } from 'lucide-react';

interface PatientDetail {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  date_of_birth?: string;
  gender?: string;
  contact?: string;
  phone_number?: string;
  created_at?: string;
  archived_at?: string;
  appointment_id?: string;
  primary_symptom?: string;
  additional_symptoms?: any;
  triage_score?: string;
  suggested_department?: string;
  estimated_wait_minutes?: number;
  potential_diagnoses?: string[];
  recommended_actions?: string[];
  risk_factors?: string[];
  // Original check-in fields
  full_name?: string;
  contact_info?: string;
  department?: string;
  status?: string;
}

interface AppointmentDetail {
  id: string;
  patient_id: string;
  staff_id: string;
  appointment_date: string;
  status: string;
  notes: string;
  department: string;
  created_at: string;
  staff_name?: string;
}

export default function PatientDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [checkIn, setCheckIn] = useState<PatientDetail | null>(null);
  const [appointments, setAppointments] = useState<AppointmentDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPatientData = async () => {
      setIsLoading(true);
      try {
        // Fetch from the patients (archive) table first
        const { data: patientData, error: patientError } = await supabase
          .from('patients')
          .select('*')
          .eq('id', params.id)
          .maybeSingle();
          
        if (patientError && patientError.code !== 'PGRST116') {
          console.error('Error fetching patient:', patientError);
          toast.error('Failed to load patient data');
        }
        
        if (patientData) {
          setPatient(patientData);
          
          // If we found an archived patient, try to fetch associated appointments
          const { data: appointmentData, error: appointmentError } = await supabase
            .from('appointments')
            .select(`
              *,
              staff:staff_id (name)
            `)
            .eq('patient_id', params.id)
            .order('appointment_date', { ascending: false });
            
          if (appointmentError) {
            console.error('Error fetching appointments:', appointmentError);
          } else if (appointmentData) {
            const formattedAppointments = appointmentData.map(apt => ({
              ...apt,
              staff_name: apt.staff?.name || 'Unknown Staff'
            }));
            setAppointments(formattedAppointments);
          }
        }
        
        // Also check the check_ins table
        const { data: checkInData, error: checkInError } = await supabase
          .from('check_ins')
          .select('*')
          .eq('id', params.id)
          .maybeSingle();
          
        if (checkInError && checkInError.code !== 'PGRST116') {
          console.error('Error fetching check-in:', checkInError);
        }
        
        if (checkInData) {
          setCheckIn(checkInData);
        }
        
        // If we didn't find anything in either table
        if (!patientData && !checkInData) {
          toast.error('Patient not found');
          router.push('/patients-archive');
        }
      } catch (error) {
        console.error('Error in fetchPatientData:', error);
        toast.error('Failed to load patient data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPatientData();
  }, [params.id, router, supabase]);
  
  const handleArchivePatient = async () => {
    try {
      const loadingToast = toast.loading('Archiving patient...');
      
      const response = await fetch('/api/archive-patient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: params.id,
          appointmentId: appointments.length > 0 ? appointments[0].id : null
        }),
      });
      
      const result = await response.json();
      
      toast.dismiss(loadingToast);
      
      if (result.success) {
        toast.success('Patient archived successfully');
        // Refresh the data
        window.location.reload();
      } else {
        toast.error(`Failed to archive patient: ${result.error}`);
      }
    } catch (error) {
      console.error('Error archiving patient:', error);
      toast.error('Failed to archive patient');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  const getDisplayName = () => {
    if (patient?.name) return patient.name;
    if (patient?.first_name && patient?.last_name) return `${patient.first_name} ${patient.last_name}`;
    if (checkIn?.full_name) return checkIn.full_name;
    return 'Unknown Patient';
  };

  const getContactInfo = () => {
    return patient?.contact || patient?.phone_number || checkIn?.contact_info || 'Not Available';
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        
        <h1 className="text-2xl font-bold">Patient Details</h1>
        
        {checkIn && checkIn.status !== 'archived' && (
          <Button onClick={handleArchivePatient}>
            Archive Patient
          </Button>
        )}
      </div>
      
      {isLoading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-500" />
                {getDisplayName()}
              </CardTitle>
              <CardDescription>
                Patient ID: {params.id}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Date of Birth</p>
                  <p>{patient?.date_of_birth || checkIn?.date_of_birth || 'Not Available'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Gender</p>
                  <p>{patient?.gender || checkIn?.gender || 'Not Specified'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Contact</p>
                  <p>{getContactInfo()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Created At</p>
                  <p>{formatDate(patient?.created_at || checkIn?.created_at)}</p>
                </div>
                {patient?.archived_at && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Archived At</p>
                    <p>{formatDate(patient.archived_at)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Tabs defaultValue="info">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="info">Medical Info</TabsTrigger>
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="status">Archive Status</TabsTrigger>
            </TabsList>
            
            <TabsContent value="info">
              <Card>
                <CardHeader>
                  <CardTitle>Medical Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Primary Symptom</p>
                      <p>{patient?.primary_symptom || checkIn?.primary_symptom || 'None recorded'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Triage Score</p>
                      <p>{patient?.triage_score || checkIn?.triage_score || 'Not Available'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Department</p>
                      <p>{patient?.suggested_department || checkIn?.department || 'General'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Wait Time</p>
                      <p>{patient?.estimated_wait_minutes || checkIn?.estimated_wait_minutes || 'N/A'} minutes</p>
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  {(patient?.additional_symptoms || checkIn?.additional_symptoms) && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-500 mb-1">Additional Symptoms</p>
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        {typeof (patient?.additional_symptoms || checkIn?.additional_symptoms) === 'string' ? (
                          <p>{patient?.additional_symptoms || checkIn?.additional_symptoms}</p>
                        ) : (
                          <ul className="list-disc pl-5">
                            {Array.isArray(patient?.additional_symptoms || checkIn?.additional_symptoms) ? (
                              (patient?.additional_symptoms || checkIn?.additional_symptoms || []).map((symptom: string, i: number) => (
                                <li key={i}>{symptom}</li>
                              ))
                            ) : (
                              <li>Error displaying symptoms</li>
                            )}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {(patient?.potential_diagnoses && patient.potential_diagnoses.length > 0) && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-500 mb-1">Potential Diagnoses</p>
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        <ul className="list-disc pl-5">
                          {patient.potential_diagnoses.map((diagnosis, i) => (
                            <li key={i}>{diagnosis}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  {(patient?.recommended_actions && patient.recommended_actions.length > 0) && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-500 mb-1">Recommended Actions</p>
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        <ul className="list-disc pl-5">
                          {patient.recommended_actions.map((action, i) => (
                            <li key={i}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  {(patient?.risk_factors && patient.risk_factors.length > 0) && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Risk Factors</p>
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        <ul className="list-disc pl-5">
                          {patient.risk_factors.map((risk, i) => (
                            <li key={i}>{risk}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="appointments">
              <Card>
                <CardHeader>
                  <CardTitle>Appointments</CardTitle>
                  <CardDescription>
                    {appointments.length > 0 
                      ? `${appointments.length} appointment(s) found` 
                      : 'No appointments found'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {appointments.length > 0 ? (
                    <div className="space-y-4">
                      {appointments.map((appointment) => (
                        <div key={appointment.id} className="bg-gray-50 p-4 rounded">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center">
                              <Calendar className="h-5 w-5 text-blue-500 mr-2" />
                              <div>
                                <p className="font-medium">{formatDate(appointment.appointment_date)}</p>
                                <p className="text-sm text-gray-500">{appointment.department}</p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 text-gray-400 mr-1" />
                              <span className={`text-sm px-2 py-1 rounded ${
                                appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                appointment.status === 'no-show' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {appointment.status}
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-sm mb-2"><span className="font-medium">Staff:</span> {appointment.staff_name}</p>
                          
                          {appointment.notes && (
                            <div className="mt-2">
                              <p className="text-sm font-medium text-gray-500">Notes</p>
                              <p className="text-sm">{appointment.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                      <p>No appointments scheduled</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="status">
              <Card>
                <CardHeader>
                  <CardTitle>Archive Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Check-in Status</p>
                      <p className={`${checkIn?.status === 'archived' ? 'text-green-600' : 'text-amber-600'}`}>
                        {checkIn?.status || 'Unknown'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500">Patient Archive Record</p>
                      <p className={`${patient ? 'text-green-600' : 'text-red-600'}`}>
                        {patient ? 'Found in archive' : 'Not found in archive'}
                      </p>
                    </div>
                    
                    {patient?.archived_at && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Archived At</p>
                        <p>{formatDate(patient.archived_at)}</p>
                      </div>
                    )}
                    
                    {patient?.appointment_id && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Linked Appointment</p>
                        <p className="text-green-600">
                          Linked to appointment {patient.appointment_id}
                        </p>
                      </div>
                    )}
                    
                    {!patient?.appointment_id && appointments.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Appointment Status</p>
                        <p className="text-amber-600">
                          Has appointments but not linked in archive
                        </p>
                      </div>
                    )}
                    
                    {!checkIn && (
                      <div className="bg-blue-50 p-4 rounded">
                        <p className="font-medium text-blue-700">Patient exists only in archive</p>
                        <p className="text-sm text-blue-600">This patient has been completely transferred to the archive system.</p>
                      </div>
                    )}
                    
                    {checkIn && checkIn.status !== 'archived' && (
                      <div className="bg-amber-50 p-4 rounded">
                        <p className="font-medium text-amber-700">Patient not yet archived</p>
                        <p className="text-sm text-amber-600 mb-3">This patient exists in the check-in system but has not been archived.</p>
                        <Button onClick={handleArchivePatient} size="sm">
                          Archive Now
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
} 