'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { format } from 'date-fns';
import { Loader2, AlertCircle, Clock } from 'lucide-react';

interface TriagePatient {
  id: string;
  full_name: string;
  triage_score: 'High' | 'Medium' | 'Low';
  suggested_department: string;
  estimated_wait_minutes: number;
  check_in_time: string;
  symptoms: {
    pain_level: number;
    pain_location: string;
    current_symptoms: string[];
  };
}

export default function TriageDashboard() {
  const [patients, setPatients] = useState<TriagePatient[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchPatients();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('triage-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'check_ins' },
        () => {
          fetchPatients();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('check_ins')
        .select('*')
        .order('check_in_time', { ascending: false });

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTriageColor = (score: string) => {
    switch (score) {
      case 'High':
        return 'bg-red-100 border-red-500';
      case 'Medium':
        return 'bg-yellow-100 border-yellow-500';
      case 'Low':
        return 'bg-green-100 border-green-500';
      default:
        return 'bg-gray-100 border-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Triage Dashboard</h1>
        <p className="mt-2 text-gray-600">Real-time patient monitoring and prioritization</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {patients.map((patient) => (
          <div
            key={patient.id}
            className={`p-6 rounded-lg border-2 ${getTriageColor(patient.triage_score)} shadow-sm`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{patient.full_name}</h2>
                <p className="text-sm text-gray-600">
                  {format(new Date(patient.check_in_time), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {patient.estimated_wait_minutes} min
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-700">Triage Score:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-sm font-medium
                  ${patient.triage_score === 'High' ? 'bg-red-200 text-red-800' :
                    patient.triage_score === 'Medium' ? 'bg-yellow-200 text-yellow-800' :
                    'bg-green-200 text-green-800'}`}>
                  {patient.triage_score}
                </span>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-700">Department:</span>
                <span className="ml-2 text-sm text-gray-600">{patient.suggested_department}</span>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-700">Pain Level:</span>
                <span className="ml-2 text-sm text-gray-600">{patient.symptoms.pain_level}/10</span>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-700">Location:</span>
                <span className="ml-2 text-sm text-gray-600">{patient.symptoms.pain_location}</span>
              </div>

              {patient.symptoms.current_symptoms.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Symptoms:</span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {patient.symptoms.current_symptoms.map((symptom, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600"
                      >
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {patients.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No patients in queue</h3>
          <p className="mt-1 text-sm text-gray-500">New check-ins will appear here automatically.</p>
        </div>
      )}
    </div>
  );
} 