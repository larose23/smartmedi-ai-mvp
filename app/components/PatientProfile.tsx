'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Patient } from '../types'

interface PatientProfileProps {
  patient: Patient
  onClose: () => void
}

export default function PatientProfile({ patient, onClose }: PatientProfileProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Patient>(patient)
  const [loading, setLoading] = useState(false)
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadPatient()
  }, [patient.id])

  async function loadPatient() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patient.id)
        .single()

      if (error) throw error
      setFormData(data)
    } catch (err) {
      toast.error('Failed to load patient data')
      console.error('Error loading patient:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('patients')
        .update(formData)
        .eq('id', patient.id)

      if (error) throw error
      
      toast.success('Patient information updated successfully')
    } catch (err) {
      toast.error('Failed to update patient information')
      console.error('Error updating patient:', err)
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <p>Loading patient information...</p>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="p-4">
        <p>Patient not found</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Patient Profile</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            {isEditing ? (
              <input
                type="text"
                name="name"
                value={formData.name || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1">{patient.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
            {isEditing ? (
              <input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1">{new Date(patient.date_of_birth).toLocaleDateString()}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Gender</label>
            {isEditing ? (
              <select
                name="gender"
                value={formData.gender || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            ) : (
              <p className="mt-1">{patient.gender}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            {isEditing ? (
              <input
                type="tel"
                name="phone"
                value={formData.phone || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1">{patient.phone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            {isEditing ? (
              <input
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1">{patient.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            {isEditing ? (
              <input
                type="text"
                name="address"
                value={formData.address || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1">{patient.address}</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Emergency Contact</label>
            {isEditing ? (
              <input
                type="text"
                name="emergency_contact"
                value={formData.emergency_contact || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1">{patient.emergency_contact}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Insurance Provider</label>
            {isEditing ? (
              <input
                type="text"
                name="insurance_provider"
                value={formData.insurance_provider || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1">{patient.insurance_provider}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Insurance Number</label>
            {isEditing ? (
              <input
                type="text"
                name="insurance_number"
                value={formData.insurance_number || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1">{patient.insurance_number}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Allergies</label>
            {isEditing ? (
              <textarea
                name="allergies"
                value={formData.allergies || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={3}
              />
            ) : (
              <p className="mt-1 whitespace-pre-line">{patient.allergies}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Current Medications</label>
            {isEditing ? (
              <textarea
                name="medications"
                value={formData.medications || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={3}
              />
            ) : (
              <p className="mt-1 whitespace-pre-line">{patient.medications}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Medical Conditions</label>
            {isEditing ? (
              <textarea
                name="conditions"
                value={formData.conditions || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={3}
              />
            ) : (
              <p className="mt-1 whitespace-pre-line">{patient.conditions}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        {isEditing ? (
          <>
            <button
              onClick={() => {
                setIsEditing(false)
                setFormData(patient)
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Save Changes
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Edit Profile
          </button>
        )}
      </div>
    </div>
  )
} 