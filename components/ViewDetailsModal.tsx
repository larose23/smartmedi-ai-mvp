'use client';

import { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { analyzeDiagnosis } from '@/lib/diagnostic-system';
import { DiagnosticResult } from '@/lib/diagnostic-system';
import { CheckIn } from '@/types/triage';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { CalendarPlus, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

interface ViewDetailsModalProps {
  checkIn: CheckIn;
  onClose: () => void;
}

const formatDate = (dateString: string) => {
  if (!dateString) return 'Not provided';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export default function ViewDetailsModal({ checkIn, onClose }: ViewDetailsModalProps) {
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [suggestedAppointmentTime, setSuggestedAppointmentTime] = useState<Date | null>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const analyzePatient = async () => {
      try {
        setIsLoading(true);
        
        // Ensure checkIn has valid symptoms object to prevent errors
        const safeCheckIn = {
          ...checkIn,
          symptoms: checkIn.symptoms || {
            pain_level: 0,
            pain_location: '',
            impact_on_activities: '',
            medical_history: '',
            current_symptoms: ''
          }
        };
        
        const results = await analyzeDiagnosis(safeCheckIn);
        if (isMounted) {
          setDiagnosticResults(results);
          setError(null);
          
          // Suggest appointment time based on urgency
          const now = new Date();
          let suggestedDate = new Date();
          
          if (results.urgency === 'Immediate') {
            // Today
            suggestedDate.setHours(now.getHours() + 1, 0, 0, 0);
          } else if (results.urgency === 'Urgent') {
            // Within 24 hours
            suggestedDate.setDate(now.getDate() + 1);
            suggestedDate.setHours(10, 0, 0, 0);
          } else {
            // Routine - next week
            suggestedDate.setDate(now.getDate() + 7);
            suggestedDate.setHours(14, 0, 0, 0);
          }
          
          setSuggestedAppointmentTime(suggestedDate);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Analysis error:', err);
          setError(err instanceof Error ? err.message : 'An error occurred during analysis');
          
          // Create fallback diagnostic result when analysis fails
          setDiagnosticResults({
            primary_diagnosis: 'Analysis pending',
            differential_diagnoses: [],
            severity: 'Moderate',
            recommended_department: checkIn.department || 'General Medicine',
            urgency: 'Routine',
            recommended_actions: ['Consult with physician'],
            risk_factors: [],
            symptoms_analysis: {
              primary_symptom: checkIn.primary_symptom || 'Not specified',
              additional_symptoms: Array.isArray(checkIn.additional_symptoms) ? checkIn.additional_symptoms : [],
              pain_level: 'Not specified',
              pain_location: 'Not specified',
              impact_on_activities: 'Not specified'
            }
          });
          
          // Set default suggested time (1 week from now)
          const suggestedDate = new Date();
          suggestedDate.setDate(suggestedDate.getDate() + 7);
          suggestedDate.setHours(14, 0, 0, 0);
          setSuggestedAppointmentTime(suggestedDate);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    analyzePatient();

    return () => {
      isMounted = false;
    };
  }, [checkIn]);

  const handleClose = useCallback(() => {
    setDiagnosticResults(null);
    setIsLoading(true);
    setError(null);
    onClose();
  }, [onClose]);

  const handleBookAppointment = () => {
    // Store the patient info in localStorage to pre-fill the appointment form
    const patientData = {
      id: checkIn.id,
      first_name: checkIn.full_name.split(' ')[0],
      last_name: checkIn.full_name.split(' ').slice(1).join(' '),
      name: checkIn.full_name,
      contact: checkIn.contact_info,
      date_of_birth: checkIn.date_of_birth,
      gender: checkIn.gender || 'Not Specified'
    };
    
    // Ensure gender field is definitely set and saved
    console.log('Saving patient data with gender:', patientData.gender);
    localStorage.setItem('selectedPatient', JSON.stringify(patientData));
    
    // Also save recommended department and time
    if (diagnosticResults) {
      localStorage.setItem('appointmentRecommendation', JSON.stringify({
        department: diagnosticResults.recommended_department,
        suggestedTime: suggestedAppointmentTime?.toISOString(),
        reason: diagnosticResults.primary_diagnosis
      }));
    }
    
    router.push('/appointments');
    onClose();
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'destructive';
      case 'Severe':
        return 'destructive';
      case 'Moderate':
        return 'default';
      case 'Mild':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getUrgencyBadgeVariant = (urgency: string) => {
    switch (urgency) {
      case 'Immediate':
        return 'destructive';
      case 'Urgent':
        return 'default';
      case 'Routine':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-4">
          <h2 className="text-xl font-bold">Patient Details</h2>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleBookAppointment}
              className="flex items-center gap-2"
              variant="outline"
            >
              <CalendarPlus className="h-4 w-4" />
              Book Appointment
            </Button>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2">Analyzing patient data...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {/* Patient Information */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-semibold text-lg">Patient Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Full Name:</span> {checkIn.full_name || 'Not provided'}
                </div>
                <div>
                  <span className="font-medium">Date of Birth:</span> {formatDate(checkIn.date_of_birth)}
                </div>
                <div>
                  <span className="font-medium">Gender:</span> {checkIn.gender || 'Not Specified'}
                </div>
                <div>
                  <span className="font-medium">Contact:</span> {checkIn.contact_info || 'Not provided'}
                </div>
                <div>
                  <span className="font-medium">Check-in Date:</span> {formatDate(checkIn.created_at || '')}
                </div>
              </div>
            </div>

            {/* Symptoms and Diagnostics */}
            {diagnosticResults && (
              <>
                {/* Symptoms Information */}
                <div className="space-y-4 border-b pb-4">
                  <h3 className="font-semibold text-lg">Symptoms</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium">Primary Complaint:</span> {checkIn.primary_symptom || 'Not specified'}
                    </div>
                    {diagnosticResults.symptoms_analysis.pain_level && (
                      <div>
                        <span className="font-medium">Pain Level:</span> {diagnosticResults.symptoms_analysis.pain_level}
                      </div>
                    )}
                    {diagnosticResults.symptoms_analysis.pain_location && (
                      <div>
                        <span className="font-medium">Pain Location:</span> {diagnosticResults.symptoms_analysis.pain_location}
                      </div>
                    )}
                    {checkIn.symptoms?.impact_on_activities && (
                      <div>
                        <span className="font-medium">Impact on Activities:</span> {checkIn.symptoms.impact_on_activities}
                      </div>
                    )}
                  </div>

                  {/* Additional Symptoms */}
                  {diagnosticResults.symptoms_analysis.additional_symptoms && 
                   diagnosticResults.symptoms_analysis.additional_symptoms.length > 0 && (
                    <div className="mt-2">
                      <span className="font-medium">Additional Symptoms:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {diagnosticResults.symptoms_analysis.additional_symptoms.map((symptom, index) => (
                          <Badge key={index} variant="outline" className="mt-1">
                            {symptom}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Diagnostic Results */}
                <div className="space-y-4 border-b pb-4">
                  <h3 className="font-semibold text-lg">Diagnostic Assessment</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Primary Diagnosis:</span> {diagnosticResults.primary_diagnosis}
                      <Badge className="ml-2" variant={getSeverityBadgeVariant(diagnosticResults.severity)}>
                        {diagnosticResults.severity}
                      </Badge>
                    </div>
                    
                    {diagnosticResults.differential_diagnoses.length > 0 && (
                      <div>
                        <span className="font-medium">Differential Diagnoses:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {diagnosticResults.differential_diagnoses.map((diagnosis, index) => (
                            <Badge key={index} variant="outline" className="mt-1">
                              {diagnosis}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <span className="font-medium">Urgency:</span>{' '}
                      <Badge variant={getUrgencyBadgeVariant(diagnosticResults.urgency)}>
                        {diagnosticResults.urgency}
                      </Badge>
                    </div>
                    
                    <div>
                      <span className="font-medium">Recommended Department:</span> {diagnosticResults.recommended_department}
                    </div>
                  </div>
                </div>

                {/* Risk Factors */}
                {diagnosticResults.risk_factors && diagnosticResults.risk_factors.length > 0 && (
                  <div className="space-y-4 border-b pb-4">
                    <h3 className="font-semibold text-lg">Risk Factors</h3>
                    <div className="flex flex-wrap gap-1">
                      {diagnosticResults.risk_factors.map((factor, index) => (
                        <Badge key={index} variant="outline" className="mt-1">
                          {factor}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Actions */}
                {diagnosticResults.recommended_actions && diagnosticResults.recommended_actions.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Recommended Actions</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {diagnosticResults.recommended_actions.map((action, index) => (
                        <li key={index}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Appointment Recommendation */}
                {suggestedAppointmentTime && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-lg flex items-center">
                      <CalendarPlus className="h-5 w-5 mr-2 text-blue-600" />
                      Appointment Recommendation
                    </h3>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-blue-600" />
                        <span>
                          <span className="font-medium">Suggested time:</span> {format(suggestedAppointmentTime, "EEEE, MMMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Department:</span> {diagnosticResults.recommended_department}
                      </div>
                      <div className="mt-3">
                        <Button 
                          onClick={handleBookAppointment}
                          className="w-full flex items-center justify-center"
                        >
                          <CalendarPlus className="h-4 w-4 mr-2" />
                          Schedule Now
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
} 