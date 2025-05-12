'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Patient {
  id: string
  name: string
  date_of_birth: string
  gender: string
  phone: string
  email: string
  address: string
  emergency_contact: string
  medical_history: string
}

export default function PatientManagement() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPatients()
  }, [])

  async function loadPatients() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('name')

      if (error) throw error
      setPatients(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load patients')
    } finally {
      setLoading(false)
    }
  }

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone.includes(searchTerm)
  )

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Patient Management</h2>
        <div className="relative">
          <input
            type="text"
            placeholder="Search patients..."
            className="pl-10 pr-4 py-2 border rounded-lg w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredPatients.map(patient => (
            <div key={patient.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{patient.name}</h3>
                  <p className="text-gray-600">
                    {new Date(patient.date_of_birth).toLocaleDateString()} • {patient.gender}
                  </p>
                  <p className="text-gray-600">{patient.email}</p>
                  <p className="text-gray-600">{patient.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Emergency Contact:</p>
                  <p className="text-sm">{patient.emergency_contact}</p>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-sm text-gray-500">Medical History:</p>
                <p className="text-sm">{patient.medical_history}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 