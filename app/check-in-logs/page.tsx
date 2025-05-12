'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

interface CheckInLog {
  id: number;
  patient_name: string;
  form_data: any;
  created_at: string;
}

export default function CheckInLogs() {
  const [logs, setLogs] = useState<CheckInLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/simple-check-ins');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch check-in logs');
      }

      setLogs(data);
    } catch (err) {
      console.error('Error fetching check-in logs:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      toast.error('Failed to load check-in logs');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch (e) {
      return dateStr;
    }
  };

  const formatFormData = (data: any) => {
    if (!data) return 'No data';
    
    try {
      // Format nested data for display
      const formatted = {
        patientName: data.patientName || 'N/A',
        painLevel: data.painLevel || 'N/A',
        painLocation: data.painLocation || 'N/A',
        characteristics: getSelectedItems(data.painCharacteristics),
        activities: getSelectedItems(data.impactOnActivities),
        medical: getSelectedItems(data.medicalHistory),
        symptoms: getSelectedItems(data.currentSymptoms)
      };
      
      return (
        <div className="space-y-1 text-sm">
          <div><strong>Pain Level:</strong> {formatted.painLevel}</div>
          <div><strong>Pain Location:</strong> {formatted.painLocation}</div>
          <div><strong>Characteristics:</strong> {formatted.characteristics}</div>
          <div><strong>Activities Affected:</strong> {formatted.activities}</div>
          <div><strong>Medical History:</strong> {formatted.medical}</div>
          <div><strong>Current Symptoms:</strong> {formatted.symptoms}</div>
        </div>
      );
    } catch (e) {
      console.error('Error formatting form data:', e);
      return 'Error parsing data';
    }
  };
  
  const getSelectedItems = (obj: Record<string, boolean> | undefined) => {
    if (!obj) return 'None';
    
    const selected = Object.entries(obj)
      .filter(([_, value]) => value)
      .map(([key, _]) => formatKey(key));
    
    return selected.length > 0 ? selected.join(', ') : 'None';
  };
  
  const formatKey = (key: string) => {
    // Convert camelCase to Title Case with spaces
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase());
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Check-In Logs</h1>
        <button
          onClick={fetchLogs}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center p-8">Loading check-in logs...</div>
      ) : logs.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded">
          No check-in logs found.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {logs.map((log) => (
            <div key={log.id} className="bg-white shadow rounded-lg overflow-hidden">
              <div className="bg-blue-50 px-4 py-2 border-b">
                <div className="font-bold">{log.patient_name}</div>
                <div className="text-xs text-gray-600">{formatDateTime(log.created_at)}</div>
              </div>
              <div className="p-4">
                {formatFormData(log.form_data)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 