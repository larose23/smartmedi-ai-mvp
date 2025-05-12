'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface TriageResult {
  priority: 'High' | 'Medium' | 'Low'
  suggestedDepartment: string
  predictedDiagnosis: string[]
  estimatedWaitTime: number
  recommendedActions: string[]
  riskFactors: string[]
}

interface SymptomPattern {
  keywords: string[]
  priority: 'High' | 'Medium' | 'Low'
  department: string
  diagnoses: string[]
  waitTime: number
  actions: string[]
  riskFactors: string[]
}

const SYMPTOM_PATTERNS: Record<string, SymptomPattern> = {
  // High Priority Patterns
  chestPain: {
    keywords: ['chest pain', 'chest tightness', 'heart pain', 'angina'],
    priority: 'High',
    department: 'Cardiology',
    diagnoses: ['Acute Coronary Syndrome', 'Myocardial Infarction', 'Angina'],
    waitTime: 5,
    actions: ['Immediate ECG', 'Cardiac enzymes', 'Oxygen therapy'],
    riskFactors: ['Age > 50', 'History of heart disease', 'High blood pressure']
  },
  stroke: {
    keywords: ['numbness', 'weakness', 'slurred speech', 'facial droop', 'stroke'],
    priority: 'High',
    department: 'Neurology',
    diagnoses: ['Stroke', 'TIA', 'Neurological emergency'],
    waitTime: 5,
    actions: ['CT scan', 'Neurological assessment', 'Blood pressure monitoring'],
    riskFactors: ['History of stroke', 'High blood pressure', 'Atrial fibrillation']
  },
  severeBleeding: {
    keywords: ['bleeding', 'hemorrhage', 'blood loss', 'uncontrolled bleeding'],
    priority: 'High',
    department: 'Emergency',
    diagnoses: ['Acute hemorrhage', 'Trauma', 'Gastrointestinal bleeding'],
    waitTime: 5,
    actions: ['Blood pressure monitoring', 'IV access', 'Blood type and crossmatch'],
    riskFactors: ['Anticoagulant use', 'Recent surgery', 'Trauma']
  },
  
  // Medium Priority Patterns
  fever: {
    keywords: ['fever', 'high temperature', 'chills'],
    priority: 'Medium',
    department: 'General Medicine',
    diagnoses: ['Infection', 'Viral illness', 'Bacterial infection'],
    waitTime: 30,
    actions: ['Temperature monitoring', 'Blood tests', 'Fluid management'],
    riskFactors: ['Immunocompromised', 'Recent travel', 'Contact with sick individuals']
  },
  abdominalPain: {
    keywords: ['abdominal pain', 'stomach pain', 'belly pain'],
    priority: 'Medium',
    department: 'Gastroenterology',
    diagnoses: ['Appendicitis', 'Gastritis', 'Gastroenteritis'],
    waitTime: 45,
    actions: ['Abdominal exam', 'Blood tests', 'Ultrasound if needed'],
    riskFactors: ['Recent food intake', 'History of GI issues', 'Medication use']
  },
  
  // Low Priority Patterns
  cold: {
    keywords: ['cold', 'cough', 'sore throat', 'runny nose'],
    priority: 'Low',
    department: 'Primary Care',
    diagnoses: ['Common cold', 'Upper respiratory infection'],
    waitTime: 60,
    actions: ['Symptom management', 'Rest', 'Fluid intake'],
    riskFactors: ['Recent exposure', 'Seasonal allergies']
  },
  minorInjury: {
    keywords: ['sprain', 'minor cut', 'bruise', 'minor injury'],
    priority: 'Low',
    department: 'Urgent Care',
    diagnoses: ['Soft tissue injury', 'Minor trauma'],
    waitTime: 60,
    actions: ['RICE protocol', 'Pain management', 'Wound care'],
    riskFactors: ['Recent activity', 'Previous injuries']
  }
}

export default function SmartTriage() {
  const [symptoms, setSymptoms] = useState('')
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClientComponentClient()

  const analyzeSymptoms = async () => {
    setLoading(true)
    try {
      const symptomText = symptoms.toLowerCase()
      let matchedPattern = null
      let severityScore = 0

      // Find matching pattern and calculate severity
      for (const [key, pattern] of Object.entries(SYMPTOM_PATTERNS)) {
        const matches = pattern.keywords.filter(keyword => 
          symptomText.includes(keyword)
        )
        if (matches.length > 0) {
          severityScore += matches.length
          if (!matchedPattern || severityScore > matchedPattern.matches) {
            matchedPattern = { ...pattern, matches: matches.length }
          }
        }
      }

      // Default to general assessment if no specific pattern matches
      if (!matchedPattern) {
        matchedPattern = {
          priority: 'Medium' as 'High' | 'Medium' | 'Low',
          department: 'General Medicine',
          diagnoses: ['General assessment required'],
          waitTime: 45,
          actions: ['Vital signs', 'General assessment'],
          riskFactors: ['Unknown']
        }
      }

      const result: TriageResult = {
        priority: matchedPattern.priority as 'High' | 'Medium' | 'Low',
        suggestedDepartment: matchedPattern.department,
        predictedDiagnosis: matchedPattern.diagnoses,
        estimatedWaitTime: matchedPattern.waitTime,
        recommendedActions: matchedPattern.actions,
        riskFactors: matchedPattern.riskFactors
      }
      
      setTriageResult(result)
      
      // Save to database
      await supabase.from('triage_assessments').insert({
        symptoms,
        priority: result.priority,
        suggested_department: result.suggestedDepartment,
        predicted_diagnosis: result.predictedDiagnosis,
        estimated_wait_time: result.estimatedWaitTime,
        recommended_actions: result.recommendedActions,
        risk_factors: result.riskFactors,
        created_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error analyzing symptoms:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Smart Triage System</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Describe Patient Symptoms
        </label>
        <textarea
          className="w-full p-2 border rounded-md"
          rows={4}
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          placeholder="Enter patient symptoms (e.g., chest pain, fever, difficulty breathing)..."
        />
      </div>

      <button
        onClick={analyzeSymptoms}
        disabled={loading || !symptoms.trim()}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300"
      >
        {loading ? 'Analyzing...' : 'Analyze Symptoms'}
      </button>

      {triageResult && (
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h3 className="text-lg font-semibold mb-2">Triage Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Priority Level</p>
              <p className={`font-bold ${
                triageResult.priority === 'High' ? 'text-red-600' :
                triageResult.priority === 'Medium' ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {triageResult.priority}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Suggested Department</p>
              <p className="font-bold">{triageResult.suggestedDepartment}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Estimated Wait Time</p>
              <p className="font-bold">{triageResult.estimatedWaitTime} minutes</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Potential Diagnoses</p>
              <ul className="list-disc list-inside">
                {triageResult.predictedDiagnosis.map((diagnosis, index) => (
                  <li key={index} className="text-sm">{diagnosis}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm text-gray-600">Recommended Actions</p>
              <ul className="list-disc list-inside">
                {triageResult.recommendedActions.map((action, index) => (
                  <li key={index} className="text-sm">{action}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm text-gray-600">Risk Factors</p>
              <ul className="list-disc list-inside">
                {triageResult.riskFactors.map((factor, index) => (
                  <li key={index} className="text-sm">{factor}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 