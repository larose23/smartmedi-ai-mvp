import React, { useState, useEffect } from 'react';
import { RiskAssessment, RiskFactor } from '../lib/services/riskAssessment';
import { MedicalHistory } from '../lib/services/medicalHistory';
import { RiskAssessmentService } from '../lib/services/riskAssessment';
import { MedicalHistoryService } from '../lib/services/medicalHistory';
import { hipaaAuditLogger, PHICategory } from '../lib/security/hipaa/audit';

interface RiskAssessmentDashboardProps {
  patientId: string;
}

export const RiskAssessmentDashboard: React.FC<RiskAssessmentDashboardProps> = ({ patientId }) => {
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFactor, setSelectedFactor] = useState<RiskFactor | null>(null);

  useEffect(() => {
    const loadAssessment = async () => {
      try {
        setLoading(true);
        const medicalHistory = await MedicalHistoryService.getInstance().getMedicalHistory(patientId);
        const riskAssessment = await RiskAssessmentService.getInstance().assessPatientRisk(
          patientId,
          medicalHistory
        );
        setAssessment(riskAssessment);
        setError(null);
      } catch (err) {
        setError(err.message);
        await hipaaAuditLogger.logError(
          'system',
          'provider',
          PHICategory.PHI,
          'risk_assessment_dashboard_error',
          { patientId, error: err.message },
          '127.0.0.1',
          'RiskAssessmentDashboard'
        );
      } finally {
        setLoading(false);
      }
    };

    loadAssessment();
  }, [patientId]);

  const getRiskColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
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
        <p>Error loading risk assessment: {error}</p>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
        <p>No risk assessment available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Risk Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Risk Assessment Summary</h2>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              Confidence: <span className={getConfidenceColor(assessment.confidence)}>
                {(assessment.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Priority: <span className="font-semibold">Level {assessment.priority}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className={`px-4 py-2 rounded-full ${getRiskColor(assessment.overallRisk)} text-white`}>
            {assessment.overallRisk.toUpperCase()}
          </div>
          <div className="text-gray-600">
            Last updated: {assessment.timestamp.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Risk Factors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Risk Factors</h3>
          <div className="space-y-4">
            {assessment.riskFactors.map((factor) => (
              <div
                key={factor.id}
                className={`p-4 rounded-lg cursor-pointer transition-colors ${
                  selectedFactor?.id === factor.id
                    ? 'bg-blue-50 border-2 border-blue-500'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => setSelectedFactor(factor)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{factor.name}</h4>
                    <p className="text-sm text-gray-500">{factor.category}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full ${getRiskColor(factor.severity)} text-white text-sm`}>
                    {factor.severity}
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  Confidence: {(factor.confidence * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Factor Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Risk Factor Details</h3>
          {selectedFactor ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-lg">{selectedFactor.name}</h4>
                <p className="text-gray-500">{selectedFactor.category}</p>
              </div>
              
              <div>
                <h5 className="font-medium mb-2">Impact</h5>
                <div className="space-y-2">
                  {selectedFactor.impact.mortality !== undefined && (
                    <div className="flex items-center">
                      <span className="w-32">Mortality:</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded">
                        <div
                          className="h-2 bg-red-500 rounded"
                          style={{ width: `${selectedFactor.impact.mortality * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  {selectedFactor.impact.morbidity !== undefined && (
                    <div className="flex items-center">
                      <span className="w-32">Morbidity:</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded">
                        <div
                          className="h-2 bg-yellow-500 rounded"
                          style={{ width: `${selectedFactor.impact.morbidity * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  {selectedFactor.impact.qualityOfLife !== undefined && (
                    <div className="flex items-center">
                      <span className="w-32">Quality of Life:</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded">
                        <div
                          className="h-2 bg-green-500 rounded"
                          style={{ width: `${selectedFactor.impact.qualityOfLife * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h5 className="font-medium mb-2">Evidence</h5>
                <div className="space-y-2">
                  {selectedFactor.evidence.map((evidence, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{evidence.source}</span>
                        <span className={`px-2 py-1 rounded text-sm ${
                          evidence.strength === 'strong' ? 'bg-green-100 text-green-800' :
                          evidence.strength === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {evidence.strength}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{evidence.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              Select a risk factor to view details
            </div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">Recommendations</h3>
        <div className="space-y-4">
          {assessment.recommendations.map((rec, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                rec.urgency === 'high' ? 'border-red-200 bg-red-50' :
                rec.urgency === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                'border-green-200 bg-green-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{rec.action}</h4>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  rec.urgency === 'high' ? 'bg-red-500 text-white' :
                  rec.urgency === 'medium' ? 'bg-yellow-500 text-white' :
                  'bg-green-500 text-white'
                }`}>
                  {rec.urgency}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2">{rec.rationale}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 