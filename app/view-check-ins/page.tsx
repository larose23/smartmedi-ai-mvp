'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

interface CheckIn {
  id: string;
  patient_id: string;
  symptoms: any;
  triage_score?: string;
  suggested_department?: string;
  created_at: string;
  [key: string]: any;
}

export default function ViewCheckIns() {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCheckIns();
  }, []);

  const fetchCheckIns = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/check-ins');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch check-ins');
      }

      setCheckIns(data);
    } catch (err) {
      console.error('Error fetching check-ins:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      toast.error('Failed to load check-ins');
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

  const formatSymptoms = (symptoms: any) => {
    if (typeof symptoms === 'string') {
      return symptoms;
    }
    
    if (symptoms?.text) {
      return symptoms.text;
    }
    
    try {
      return JSON.stringify(symptoms);
    } catch (e) {
      return 'Unable to display symptoms';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Check-Ins</h1>
        <button
          onClick={fetchCheckIns}
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
        <div className="text-center p-8">Loading check-ins...</div>
      ) : checkIns.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded">
          No check-ins found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient ID
                </th>
                <th className="px-4 py-2 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Symptoms
                </th>
                <th className="px-4 py-2 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Triage
                </th>
                <th className="px-4 py-2 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-4 py-2 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created At
                </th>
              </tr>
            </thead>
            <tbody>
              {checkIns.map((checkIn) => (
                <tr key={checkIn.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border-b border-gray-200 text-sm">
                    {checkIn.patient_id}
                  </td>
                  <td className="px-4 py-2 border-b border-gray-200 text-sm">
                    {formatSymptoms(checkIn.symptoms)}
                  </td>
                  <td className="px-4 py-2 border-b border-gray-200 text-sm">
                    {checkIn.triage_score || 'N/A'}
                  </td>
                  <td className="px-4 py-2 border-b border-gray-200 text-sm">
                    {checkIn.suggested_department || 'N/A'}
                  </td>
                  <td className="px-4 py-2 border-b border-gray-200 text-sm">
                    {formatDateTime(checkIn.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 