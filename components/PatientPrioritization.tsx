import React, { useState, useEffect } from 'react';
import { RiskAssessment } from '../lib/services/riskAssessment';
import { RiskAssessmentService } from '../lib/services/riskAssessment';
import { hipaaAuditLogger, PHICategory } from '../lib/security/hipaa/audit';

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  lastVisit: Date;
  assessment: RiskAssessment;
}

interface PatientPrioritizationProps {
  patients: Patient[];
  onPatientSelect: (patientId: string) => void;
}

export const PatientPrioritization: React.FC<PatientPrioritizationProps> = ({
  patients,
  onPatientSelect
}) => {
  const [sortedPatients, setSortedPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);

  useEffect(() => {
    const prioritizePatients = async () => {
      try {
        setLoading(true);
        // Sort patients by priority and risk level
        const sorted = [...patients].sort((a, b) => {
          // First by priority (1 is highest)
          if (a.assessment.priority !== b.assessment.priority) {
            return a.assessment.priority - b.assessment.priority;
          }
          
          // Then by risk level
          const riskOrder = { high: 0, medium: 1, low: 2 };
          if (riskOrder[a.assessment.overallRisk] !== riskOrder[b.assessment.overallRisk]) {
            return riskOrder[a.assessment.overallRisk] - riskOrder[b.assessment.overallRisk];
          }

          // Then by time since last visit (more recent visits get higher priority)
          const daysSinceLastVisitA = Math.floor((new Date().getTime() - a.lastVisit.getTime()) / (1000 * 60 * 60 * 24));
          const daysSinceLastVisitB = Math.floor((new Date().getTime() - b.lastVisit.getTime()) / (1000 * 60 * 60 * 24));
          
          // If last visit was more than 30 days ago, prioritize
          if (daysSinceLastVisitA > 30 && daysSinceLastVisitB <= 30) return -1;
          if (daysSinceLastVisitA <= 30 && daysSinceLastVisitB > 30) return 1;
          
          // Otherwise, sort by most recent
          return daysSinceLastVisitA - daysSinceLastVisitB;
        });
        setSortedPatients(sorted);
        setError(null);
      } catch (err) {
        setError(err.message);
        await hipaaAuditLogger.logError(
          'system',
          'provider',
          PHICategory.PHI,
          'patient_prioritization_error',
          { error: err.message },
          '127.0.0.1',
          'PatientPrioritization'
        );
      } finally {
        setLoading(false);
      }
    };

    prioritizePatients();
  }, [patients]);

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-red-100 text-red-800';
      case 2: return 'bg-orange-100 text-orange-800';
      case 3: return 'bg-yellow-100 text-yellow-800';
      case 4: return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p>Error prioritizing patients: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Patient Priority Queue</h2>
          <p className="text-sm text-gray-500 mt-1">
            Patients sorted by risk level and priority
          </p>
        </div>
        <div className="divide-y divide-gray-200">
          {sortedPatients.map((patient) => (
            <div
              key={patient.id}
              className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                selectedPatient === patient.id ? 'bg-blue-50' : ''
              }`}
              onClick={() => {
                setSelectedPatient(patient.id);
                onPatientSelect(patient.id);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      getPriorityColor(patient.assessment.priority)
                    }`}>
                      {patient.assessment.priority}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">{patient.name}</h3>
                    <p className="text-sm text-gray-500">
                      {patient.age} years • {patient.gender}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-500">
                    Last Visit: {patient.lastVisit.toLocaleDateString()}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`px-3 py-1 rounded-full ${getRiskColor(patient.assessment.overallRisk)} text-white text-sm`}>
                      {patient.assessment.overallRisk}
                    </div>
                    <div className="text-sm text-gray-500">
                      {(patient.assessment.confidence * 100).toFixed(0)}% confidence
                    </div>
                  </div>
                </div>
              </div>
              {selectedPatient === patient.id && (
                <div className="mt-4 pl-14">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Key Risk Factors</h4>
                    <div className="space-y-2">
                      {patient.assessment.riskFactors
                        .filter(factor => factor.severity === 'high')
                        .map(factor => (
                          <div key={factor.id} className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${getRiskColor(factor.severity)}`}></div>
                            <span className="text-sm">{factor.name}</span>
                          </div>
                        ))}
                    </div>
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Top Recommendations</h4>
                      <div className="space-y-2">
                        {patient.assessment.recommendations
                          .filter(rec => rec.urgency === 'high')
                          .slice(0, 2)
                          .map((rec, index) => (
                            <div key={index} className="text-sm text-gray-600">
                              • {rec.action}
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 