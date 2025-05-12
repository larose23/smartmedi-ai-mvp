'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Alert {
  id: string
  patient_id: string
  alert_type: string
  severity: string
  status: string
  location: string
  notes: string
  created_at: string
  patient?: {
    name: string
    emergency_contact: string
  }
}

export default function EmergencyAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAlerts()
    // Set up real-time subscription
    const subscription = supabase
      .channel('emergency_alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_alerts' }, 
        () => {
          loadAlerts()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function loadAlerts() {
    try {
      setLoading(true)
      const { data: alertsData, error: alertsError } = await supabase
        .from('emergency_alerts')
        .select('*')
        .order('created_at', { ascending: false })

      if (alertsError) throw alertsError

      // Get patient details for each alert
      const patientIds = alertsData.map(alert => alert.patient_id)
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select('id, name, emergency_contact')
        .in('id', patientIds)

      if (patientsError) throw patientsError

      // Combine alert and patient data
      const alertsWithPatients = alertsData.map(alert => ({
        ...alert,
        patient: patientsData.find(p => p.id === alert.patient_id)
      }))

      setAlerts(alertsWithPatients)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts')
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-red-500'
      case 'high':
        return 'bg-orange-500'
      case 'medium':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'text-red-600'
      case 'resolved':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Emergency Alerts</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Live Updates</span>
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
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
          {alerts.map(alert => (
            <div key={alert.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`w-3 h-3 rounded-full ${getSeverityColor(alert.severity)}`}></span>
                    <h3 className="text-lg font-semibold">{alert.alert_type}</h3>
                    <span className={`text-sm font-medium ${getStatusColor(alert.status)}`}>
                      {alert.status}
                    </span>
                  </div>
                  {alert.patient && (
                    <p className="text-gray-600 mt-1">
                      Patient: {alert.patient.name}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    Location: {alert.location}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Time:</p>
                  <p className="text-sm">
                    {new Date(alert.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-sm text-gray-500">Notes:</p>
                <p className="text-sm">{alert.notes}</p>
              </div>
              {alert.patient?.emergency_contact && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500">Emergency Contact:</p>
                  <p className="text-sm">{alert.patient.emergency_contact}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 