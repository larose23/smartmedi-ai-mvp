'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Staff {
  id: string
  name: string
  role: string
  department: string
  email: string
  phone: string
}

export default function StaffDashboard() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStaff()
  }, [])

  async function loadStaff() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('name')

      if (error) throw error
      setStaff(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load staff')
    } finally {
      setLoading(false)
    }
  }

  const departments = ['all', ...new Set(staff.map(s => s.department))]
  const filteredStaff = selectedDepartment === 'all'
    ? staff
    : staff.filter(s => s.department === selectedDepartment)

  const staffByRole = filteredStaff.reduce((acc, member) => {
    if (!acc[member.role]) {
      acc[member.role] = []
    }
    acc[member.role].push(member)
    return acc
  }, {} as Record<string, Staff[]>)

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Staff Dashboard</h2>
        <div className="flex items-center space-x-4">
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            {departments.map(dept => (
              <option key={dept} value={dept}>
                {dept.charAt(0).toUpperCase() + dept.slice(1)}
              </option>
            ))}
          </select>
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
        <div className="grid gap-6">
          {Object.entries(staffByRole).map(([role, members]) => (
            <div key={role} className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-4">{role}s</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map(member => (
                  <div key={member.id} className="border rounded-lg p-4">
                    <h4 className="font-medium">{member.name}</h4>
                    <p className="text-sm text-gray-600">{member.department}</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm">
                        <span className="text-gray-500">Email:</span> {member.email}
                      </p>
                      <p className="text-sm">
                        <span className="text-gray-500">Phone:</span> {member.phone}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 