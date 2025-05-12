import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarPlus } from 'lucide-react';
import AppointmentBookingForm from './AppointmentBookingForm';
import { useAppState } from '@/context/StateContext';

interface ViewDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: any;
  onAppointmentBooked?: () => void;
}

const ViewDetailsModal: React.FC<ViewDetailsModalProps> = ({
  isOpen,
  onClose,
  patient,
  onAppointmentBooked,
}) => {
  // Use our centralized state
  const { archivePatient, addNotification, showAppointmentBooking } = useAppState();
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  if (!patient) return null;

  // Handle symptoms data which can be string or array
  const formatSymptomData = (data: string | string[] | undefined) => {
    if (!data) return 'None';
    if (typeof data === 'string') return data;
    return data.join(', ');
  };

  const handleBookAppointment = () => {
    setShowAppointmentForm(true);
    showAppointmentBooking(true);
  };

  const handleAppointmentSubmit = async (appointmentDetails: any) => {
    setIsBooking(true);
    try {
      // Import necessary function dynamically to avoid circular dependencies
      const { bookAppointmentAndArchive } = await import('@/lib/patient-flow');
      const result = await bookAppointmentAndArchive(patient.id, appointmentDetails);
      
      if (result.success) {
        addNotification('Appointment booked successfully', 'success');
        setShowAppointmentForm(false);
        showAppointmentBooking(false);
        if (onAppointmentBooked) {
          onAppointmentBooked();
        }
        onClose();
      } else {
        addNotification(result.error || 'Failed to book appointment', 'error');
      }
    } catch (error: any) {
      addNotification(error.message || 'An error occurred', 'error');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Patient Details</DialogTitle>
          <DialogDescription>
            View complete patient information and triage results
          </DialogDescription>
        </DialogHeader>

        {showAppointmentForm ? (
          <AppointmentBookingForm 
            patientId={patient.id} 
            patientName={patient.full_name}
            onSubmit={handleAppointmentSubmit}
            onCancel={() => {
              setShowAppointmentForm(false);
              showAppointmentBooking(false);
            }}
            isSubmitting={isBooking}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Patient Information</h3>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Name:</span>
                      <span>{patient.full_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Date of Birth:</span>
                      <span>{new Date(patient.date_of_birth).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Gender:</span>
                      <span>{patient.gender}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Contact:</span>
                      <span>{patient.contact_info || patient.contact_information}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium">Triage Information</h3>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Triage Score:</span>
                      <Badge
                        className={
                          patient.triage_score === 'High'
                            ? 'bg-red-500'
                            : patient.triage_score === 'Medium'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }
                      >
                        {patient.triage_score}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Department:</span>
                      <span>{patient.department || 'Not assigned'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Wait Time:</span>
                      <span>{patient.estimated_wait_minutes || 0} minutes</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Symptoms & Diagnosis</h3>
                  <div className="mt-2 space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Primary Symptoms:</span>
                      <p className="mt-1">{patient.primary_symptom || 'None recorded'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Additional Symptoms:</span>
                      <p className="mt-1">{formatSymptomData(patient.additional_symptoms)}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Potential Diagnoses:</span>
                      <ul className="mt-1 list-disc pl-5">
                        {patient.potential_diagnoses && patient.potential_diagnoses.length > 0 ? (
                          patient.potential_diagnoses.map((diagnosis: string, idx: number) => (
                            <li key={idx}>{diagnosis}</li>
                          ))
                        ) : (
                          <li>No diagnoses available</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium">Medical History</h3>
                  <p className="mt-1">
                    {patient.symptoms?.medical_history
                      ? formatSymptomData(patient.symptoms.medical_history)
                      : 'No medical history recorded'}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium">Recommended Actions</h3>
                  <ul className="mt-1 list-disc pl-5">
                    {patient.recommended_actions && patient.recommended_actions.length > 0 ? (
                      patient.recommended_actions.map((action: string, idx: number) => (
                        <li key={idx}>{action}</li>
                      ))
                    ) : (
                      <li>No recommended actions available</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {/* Risk factors */}
            <div className="mt-4">
              <h3 className="text-lg font-medium">Risk Factors</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {patient.risk_factors && patient.risk_factors.length > 0 ? (
                  patient.risk_factors.map((factor: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="bg-red-50">
                      {factor}
                    </Badge>
                  ))
                ) : (
                  <span className="text-gray-500">No risk factors identified</span>
                )}
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          {!showAppointmentForm && (
            <Button 
              onClick={handleBookAppointment} 
              className="bg-primary hover:bg-primary/90"
            >
              <CalendarPlus className="mr-2 h-4 w-4" />
              Book Appointment
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewDetailsModal; 