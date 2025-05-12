'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DatabaseTest() {
  const [testResults, setTestResults] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    testConnection()
  }, [])

  async function testConnection() {
    const results: string[] = []
    
    try {
      // Test 1: Basic connection
      results.push('Testing basic connection...')
      const { data: testData, error: testError } = await supabase
        .from('appointments')
        .select('count')
        .limit(1)
      
      if (testError) {
        if (testError.code === '42P01') {
          results.push('❌ Error: appointments table does not exist')
        } else {
          results.push(`❌ Error: ${testError.message}`)
        }
      } else {
        results.push('✅ Basic connection successful')
      }

      // Test 2: Check tables
      results.push('\nChecking required tables...')
      const tables = ['patients', 'staff', 'appointments', 'check_ins', 'check_in_logs']
      
      for (const table of tables) {
        const { error: tableError } = await supabase
          .from(table)
          .select('id')
          .limit(1)
        
        if (tableError) {
          if (tableError.code === '42P01') {
            results.push(`❌ ${table} table does not exist`)
          } else {
            results.push(`❌ Error checking ${table} table: ${tableError.message}`)
          }
        } else {
          results.push(`✅ ${table} table exists`)
        }
      }

      // Test 3: Check sample data
      results.push('\nChecking for sample data...')
      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select('*')
      
      if (patientsError) {
        results.push(`❌ Error checking patients data: ${patientsError.message}`)
      } else {
        results.push(`✅ Found ${patients?.length || 0} patients`)
      }

      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('*')
      
      if (staffError) {
        results.push(`❌ Error checking staff data: ${staffError.message}`)
      } else {
        results.push(`✅ Found ${staff?.length || 0} staff members`)
      }

      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
      
      if (appointmentsError) {
        results.push(`❌ Error checking appointments data: ${appointmentsError.message}`)
      } else {
        results.push(`✅ Found ${appointments?.length || 0} appointments`)
      }

      // Test 4: Check check-ins system
      results.push('\nTesting check-ins functionality...')
      
      const { data: checkIns, error: checkInsError } = await supabase
        .from('check_ins')
        .select('*')
      
      if (checkInsError) {
        results.push(`❌ Error accessing check_ins: ${checkInsError.message}`)
      } else {
        results.push(`✅ Found ${checkIns?.length || 0} check-ins`)
      }
      
      const { data: checkInLogs, error: checkInLogsError } = await supabase
        .from('check_in_logs')
        .select('*')
      
      if (checkInLogsError) {
        results.push(`❌ Error accessing check_in_logs: ${checkInLogsError.message}`)
      } else {
        results.push(`✅ Found ${checkInLogs?.length || 0} check-in logs`)
      }
      
      // Test 5: Check stored procedures
      results.push('\nChecking stored procedures...')
      
      try {
        await supabase.rpc('create_check_ins_table_if_not_exists')
        results.push('✅ create_check_ins_table_if_not_exists procedure works')
      } catch (err) {
        results.push(`❌ Error with create_check_ins_table_if_not_exists: ${err instanceof Error ? err.message : String(err)}`)
      }
      
      try {
        await supabase.rpc('create_check_in_logs_table_if_not_exists')
        results.push('✅ create_check_in_logs_table_if_not_exists procedure works')
      } catch (err) {
        results.push(`❌ Error with create_check_in_logs_table_if_not_exists: ${err instanceof Error ? err.message : String(err)}`)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    }

    setTestResults(results)
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">Database Connection Test</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4">
        <pre className="whitespace-pre-wrap">
          {testResults.join('\n')}
        </pre>
      </div>

      <button
        onClick={testConnection}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Run Tests Again
      </button>
    </div>
  )
} 