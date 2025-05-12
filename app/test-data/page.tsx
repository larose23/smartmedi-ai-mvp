'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Patient {
  id: number;
  full_name: string;
  priority_level: string;
  primary_symptom: string;
  status: string;
}

export default function TestData() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPatients() {
      try {
        const { data, error } = await supabase
          .from('check_ins')
          .select('id, full_name, priority_level, primary_symptom, status')
          .order('priority_level', { ascending: true });

        if (error) throw error;
        setPatients(data || []);
      } catch (error) {
        console.error('Error fetching patients:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPatients();
  }, []);

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <h1 className="text-2xl font-bold mb-6">Test Patients</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid gap-4">
          {patients.map((patient) => (
            <div key={patient.id} className="bg-white p-4 rounded-lg shadow">
              <h2 className="font-semibold">{patient.full_name}</h2>
              <p>Priority: {patient.priority_level}</p>
              <p>Symptom: {patient.primary_symptom}</p>
              <p>Status: {patient.status}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 