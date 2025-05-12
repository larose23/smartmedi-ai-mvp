import React, { useState, useEffect } from 'react';
import { Appointment, Provider, Patient } from '@/types/scheduling';
import { SCHEDULING_CONSTANTS } from '@/lib/constants/scheduling';
import { NoShowAnalysis } from '@/lib/services/NoShowAnalysis';
import { WaitlistService } from '@/lib/services/WaitlistService';
import { LoadingSpinner } from './LoadingSpinner';

interface AppointmentDetailsModalProps {
  appointment: Appointment;
  provider: Provider;
  patient: Patient;
  onClose: () => void;
  onCancel?: () => void;
  onReschedule?: () => void;
}

interface NoShowPrediction {
  probability: number;
  riskLevel: 'low' | 'medium' | 'high';
  factors: string[];
}

const AppointmentDetailsModal: React.FC<AppointmentDetailsModalProps> = ({
  appointment,
  provider,
  patient,
  onClose,
  onCancel,
  onReschedule
}) => {
  const [loading, setLoading] = useState(true);
  const [noShowPrediction, setNoShowPrediction] = useState<NoShowPrediction | null>(null);
  const [waitlistCount, setWaitlistCount] = useState(0);

  useEffect(() => {
    loadNoShowPrediction();
    loadWaitlistCount();
  }, [appointment]);

  const loadNoShowPrediction = async () => {
    try {
      const prediction = await NoShowAnalysis.predictNoShow(appointment, patient);
      setNoShowPrediction(prediction);
    } catch (error) {
      console.error('Error loading no-show prediction:', error);
    }
  };

  const loadWaitlistCount = async () => {
    try {
      const waitlist = await WaitlistService.getWaitlistForSlot(appointment.start_time, provider.id);
      setWaitlistCount(waitlist.length);
    } catch (error) {
      console.error('Error loading waitlist count:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <LoadingSpinner size="large" text="Loading appointment details..." />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="p-6">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-medium text-gray-900">
              Appointment Details
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500">Time</h4>
              <p className="mt-1 text-sm text-gray-900">
                {formatDate(appointment.start_time)}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500">Provider</h4>
              <p className="mt-1 text-sm text-gray-900">{provider.name}</p>
              <p className="text-xs text-gray-500">
                {provider.specialties.join(', ')}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500">Patient</h4>
              <p className="mt-1 text-sm text-gray-900">{patient.name}</p>
              <p className="text-xs text-gray-500">{patient.email}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500">Status</h4>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                appointment.status === SCHEDULING_CONSTANTS.APPOINTMENT_STATUS.COMPLETED
                  ? 'bg-green-100 text-green-800'
                  : appointment.status === SCHEDULING_CONSTANTS.APPOINTMENT_STATUS.CANCELLED
                  ? 'bg-red-100 text-red-800'
                  : appointment.status === SCHEDULING_CONSTANTS.APPOINTMENT_STATUS.NO_SHOW
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {appointment.status}
              </span>
            </div>

            {noShowPrediction && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">No-Show Risk</h4>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskLevelColor(noShowPrediction.riskLevel)}`}>
                    {noShowPrediction.riskLevel.toUpperCase()} RISK
                  </span>
                  <p className="mt-1 text-xs text-gray-500">
                    {Math.round(noShowPrediction.probability * 100)}% probability
                  </p>
                  {noShowPrediction.factors.length > 0 && (
                    <ul className="mt-2 text-xs text-gray-500 list-disc list-inside">
                      {noShowPrediction.factors.map((factor, index) => (
                        <li key={index}>{factor}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {waitlistCount > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Waitlist</h4>
                <p className="mt-1 text-sm text-gray-900">
                  {waitlistCount} {waitlistCount === 1 ? 'patient' : 'patients'} waiting for this slot
                </p>
              </div>
            )}

            {appointment.notes && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Notes</h4>
                <p className="mt-1 text-sm text-gray-900">{appointment.notes}</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            {appointment.status === SCHEDULING_CONSTANTS.APPOINTMENT_STATUS.SCHEDULED && (
              <>
                <button
                  onClick={onReschedule}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Reschedule
                </button>
                <button
                  onClick={onCancel}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Cancel Appointment
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetailsModal; 