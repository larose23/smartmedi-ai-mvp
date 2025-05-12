'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface ResourcePrediction {
  date: string
  predictedPatients: number
  recommendedStaff: {
    doctors: number
    nurses: number
    support: number
  }
  peakHours: string[]
  resourceNeeds: {
    beds: number
    equipment: string[]
  }
}

export default function ResourceOptimizer() {
  const [predictions, setPredictions] = useState<ResourcePrediction[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadPredictions()
  }, [])

  const loadPredictions = async () => {
    setLoading(true)
    try {
      // TODO: Integrate with actual AI model
      // For now, using mock data
      const mockPredictions: ResourcePrediction[] = [
        {
          date: new Date().toISOString().split('T')[0],
          predictedPatients: 120,
          recommendedStaff: {
            doctors: 8,
            nurses: 15,
            support: 6
          },
          peakHours: ['09:00-11:00', '14:00-16:00'],
          resourceNeeds: {
            beds: 45,
            equipment: ['ECG Machine', 'X-ray', 'Ultrasound']
          }
        }
      ]
      
      setPredictions(mockPredictions)
    } catch (error) {
      console.error('Error loading predictions:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Resource Optimization</h2>
      
      {loading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {predictions.map((prediction, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Patient Flow</h3>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Date: {prediction.date}</p>
                    <p className="text-sm text-gray-600">
                      Predicted Patients: <span className="font-bold">{prediction.predictedPatients}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Peak Hours: {prediction.peakHours.join(', ')}
                    </p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Staff Requirements</h3>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Doctors: <span className="font-bold">{prediction.recommendedStaff.doctors}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Nurses: <span className="font-bold">{prediction.recommendedStaff.nurses}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Support Staff: <span className="font-bold">{prediction.recommendedStaff.support}</span>
                    </p>
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <h3 className="text-lg font-semibold mb-2">Resource Needs</h3>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Required Beds: <span className="font-bold">{prediction.resourceNeeds.beds}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Equipment Needed: {prediction.resourceNeeds.equipment.join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 