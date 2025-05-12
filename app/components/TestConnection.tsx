'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface TableData {
  patients: any[];
  staff: any[];
  appointments: any[];
  emergency_alerts: any[];
}

export default function TestConnection() {
  const [connectionStatus, setConnectionStatus] = useState<string>('Loading...')
  const [data, setData] = useState<TableData>({
    patients: [],
    staff: [],
    appointments: [],
    emergency_alerts: []
  })

  useEffect(() => {
    async function loadData() {
      try {
        // Load data from each table
        const [patients, staff, appointments, alerts] = await Promise.all([
          supabase.from('patients').select('*').limit(5),
          supabase.from('staff').select('*').limit(5),
          supabase.from('appointments').select('*').limit(5),
          supabase.from('emergency_alerts').select('*').limit(5)
        ])

        setData({
          patients: patients.data || [],
          staff: staff.data || [],
          appointments: appointments.data || [],
          emergency_alerts: alerts.data || []
        })

        setConnectionStatus('Data loaded successfully!')
      } catch (error) {
        setConnectionStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    loadData()
  }, [])

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-2">Supabase Connection Test</h2>
        <p className="text-gray-700">{connectionStatus}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-2">Patients ({data.patients.length})</h3>
          <ul className="space-y-2">
            {data.patients.map(patient => (
              <li key={patient.id} className="text-sm">
                {patient.name}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-2">Staff ({data.staff.length})</h3>
          <ul className="space-y-2">
            {data.staff.map(staff => (
              <li key={staff.id} className="text-sm">
                {staff.name} ({staff.role})
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-2">Appointments ({data.appointments.length})</h3>
          <ul className="space-y-2">
            {data.appointments.map(appointment => (
              <li key={appointment.id} className="text-sm">
                {new Date(appointment.appointment_date).toLocaleDateString()} - {appointment.status}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-2">Emergency Alerts ({data.emergency_alerts.length})</h3>
          <ul className="space-y-2">
            {data.emergency_alerts.map(alert => (
              <li key={alert.id} className="text-sm">
                {alert.alert_type} - {alert.severity}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
} 