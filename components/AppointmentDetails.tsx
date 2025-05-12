import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AppointmentDetailsProps {
  appointment: any;
  patient?: any;
  staffMember?: any;
  onClose?: () => void;
  onUpdate?: (status: 'completed' | 'cancelled' | 'no-show') => void;
  onBookFollow?: () => void;
}

export default function AppointmentDetails({
  appointment,
  patient,
  staffMember,
  onClose,
  onUpdate,
  onBookFollow
}: AppointmentDetailsProps) {
  const [patientInfo, setPatientInfo] = useState({
    name: 'Not Available',
    dob: 'Not Available',
    gender: 'Not Available',
    contact: 'Not Available'
  });
  
  useEffect(() => {
    // Try multiple sources for patient info
    let foundPatientInfo = { ...patientInfo };
    let infoFound = false;
    
    // Method 1: Try from appointment.patient_* properties
    if (appointment?.patient_name) {
      foundPatientInfo.name = appointment.patient_name;
      infoFound = true;
    }
    if (appointment?.patient_dob) {
      foundPatientInfo.dob = appointment.patient_dob;
      infoFound = true;
    }
    if (appointment?.patient_gender) {
      foundPatientInfo.gender = appointment.patient_gender;
      infoFound = true;
    }
    if (appointment?.patient_contact) {
      foundPatientInfo.contact = appointment.patient_contact;
      infoFound = true;
    }
    
    // Method 2: Try from localStorage
    if (appointment?.id) {
      try {
        const storedData = localStorage.getItem(`appointment_${appointment.id}_patient`);
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          if (parsedData.name) foundPatientInfo.name = parsedData.name;
          if (parsedData.dob) foundPatientInfo.dob = parsedData.dob;
          if (parsedData.gender) foundPatientInfo.gender = parsedData.gender;
          if (parsedData.contact) foundPatientInfo.contact = parsedData.contact;
          infoFound = true;
          console.log('Patient info found in localStorage:', parsedData);
        }
      } catch (e) {
        console.error('Error reading localStorage:', e);
      }
    }
    
    // Method 3: Try from patient prop
    if (patient) {
      if (patient.first_name || patient.last_name) {
        foundPatientInfo.name = `${patient.first_name || ''} ${patient.last_name || ''}`.trim();
        infoFound = true;
      } else if (patient.name) {
        foundPatientInfo.name = patient.name;
        infoFound = true;
      }
      
      if (patient.date_of_birth) {
        foundPatientInfo.dob = typeof patient.date_of_birth === 'string' ? 
          patient.date_of_birth.slice(0, 10) : 'Not Available';
        infoFound = true;
      }
      
      if (patient.gender) {
        foundPatientInfo.gender = patient.gender;
        infoFound = true;
      }
      
      if (patient.phone_number || patient.contact) {
        foundPatientInfo.contact = patient.phone_number || patient.contact;
        infoFound = true;
      }
    }
    
    // If no info found from any source, create default info from appointment ID
    if (!infoFound && appointment?.id) {
      // Generate placeholder info based on appointment ID
      const idFragment = appointment.id.slice(0, 8);
      foundPatientInfo = {
        name: `Patient ${idFragment}`,
        dob: 'Not Available',
        gender: 'Not Available',
        contact: 'Not Available'
      };
    }
    
    setPatientInfo(foundPatientInfo);
  }, [appointment, patient]);

  if (!appointment) return null;

  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 font-medium">Patient:</div>
        <div className="col-span-2">
          {patientInfo.name}
        </div>
        
        <div className="col-span-1 font-medium">Date of Birth:</div>
        <div className="col-span-2">
          {patientInfo.dob}
        </div>
        
        <div className="col-span-1 font-medium">Gender:</div>
        <div className="col-span-2">
          {patientInfo.gender}
        </div>
        
        <div className="col-span-1 font-medium">Contact:</div>
        <div className="col-span-2">
          {patientInfo.contact}
        </div>
        
        <div className="col-span-1 font-medium">Date:</div>
        <div className="col-span-2">
          {appointment.appointment_date ? new Date(appointment.appointment_date).toLocaleString() : 'Not Available'}
        </div>
        
        <div className="col-span-1 font-medium">Status:</div>
        <div className="col-span-2">
          <span className={cn(
            "px-2 py-1 rounded text-xs font-medium",
            appointment?.status === 'scheduled' && "bg-blue-100 text-blue-800",
            appointment?.status === 'completed' && "bg-green-100 text-green-800",
            appointment?.status === 'cancelled' && "bg-red-100 text-red-800",
            appointment?.status === 'no-show' && "bg-yellow-100 text-yellow-800",
            appointment?.status === 'in-progress' && "bg-purple-100 text-purple-800"
          )}>
            {appointment?.status || 'scheduled'}
          </span>
        </div>
        
        <div className="col-span-1 font-medium">Department:</div>
        <div className="col-span-2">{appointment?.department || 'General'}</div>
        
        <div className="col-span-1 font-medium">Notes:</div>
        <div className="col-span-2">{appointment?.notes || ''}</div>
        
        {appointment?.recurrence && appointment.recurrence !== 'none' && (
          <>
            <div className="col-span-1 font-medium">Recurrence:</div>
            <div className="col-span-2">{appointment.recurrence}</div>
          </>
        )}
        
        <div className="col-span-1 font-medium">Provider:</div>
        <div className="col-span-2">
          {staffMember ? 
            `${staffMember.first_name || ''} ${staffMember.last_name || ''} (${staffMember.job_title || ''}, ${staffMember.department || ''})`.trim() 
            : 'Not Available'}
        </div>
      </div>

      {onClose || onUpdate || onBookFollow ? (
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          {onClose && (
            <Button
              variant="outline"
              onClick={onClose}
              className="sm:order-1"
            >
              Close
            </Button>
          )}
          
          {(onUpdate || onBookFollow) && (
            <div className="flex flex-wrap gap-2 justify-between w-full sm:w-auto sm:order-2">
              {onBookFollow && (
                <Button
                  variant="default"
                  onClick={onBookFollow}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Book Follow-up
                </Button>
              )}
              
              {onUpdate && (
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => onUpdate('cancelled')}
                    disabled={appointment?.status === 'cancelled' || appointment?.status === 'completed'}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onUpdate('no-show')}
                    disabled={appointment?.status === 'no-show' || appointment?.status === 'completed'}
                  >
                    No-Show
                  </Button>
                  <Button
                    onClick={() => onUpdate('completed')}
                    disabled={appointment?.status === 'completed'}
                  >
                    Complete
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
} 