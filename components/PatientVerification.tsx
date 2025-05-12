import React, { useState, useEffect } from 'react';
import { PatientVerificationService, VerificationMethod, VerificationResult } from '../lib/services/patientVerification';
import { PatientRecord } from '../lib/services/patientIdentification';
import { hipaaAuditLogger, PHICategory } from '../lib/security/hipaa/audit';

interface PatientVerificationProps {
  patient: PatientRecord;
  userId: string;
}

export const PatientVerification: React.FC<PatientVerificationProps> = ({
  patient,
  userId
}) => {
  const [verificationStatus, setVerificationStatus] = useState<{
    isVerified: boolean;
    lastVerified: Date | null;
    confidenceScore: number;
    requiredMethods: VerificationMethod[];
    completedMethods: VerificationMethod[];
  } | null>(null);
  const [verificationHistory, setVerificationHistory] = useState<VerificationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<VerificationMethod | null>(null);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [verificationData, setVerificationData] = useState<any>({});
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    loadVerificationData();
  }, [patient]);

  const loadVerificationData = async () => {
    try {
      setLoading(true);
      setError(null);

      const service = PatientVerificationService.getInstance();
      const [status, history] = await Promise.all([
        service.getVerificationStatus(patient.id),
        service.getVerificationHistory(patient.id)
      ]);

      setVerificationStatus(status);
      setVerificationHistory(history);

      await hipaaAuditLogger.logAccess(
        userId,
        'provider',
        PHICategory.PHI,
        'verification_status_view',
        { patientId: patient.id },
        '127.0.0.1',
        'PatientVerification',
        true
      );
    } catch (error) {
      console.error('Error loading verification data:', error);
      setError('Failed to load verification data');
      await hipaaAuditLogger.logError(
        userId,
        'provider',
        PHICategory.PHI,
        'verification_data_error',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        '127.0.0.1',
        'PatientVerification'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!selectedMethod) return;

    try {
      setVerifying(true);
      const service = PatientVerificationService.getInstance();
      const result = await service.verifyPatientIdentity(
        patient,
        selectedMethod,
        userId,
        verificationData
      );

      setVerificationHistory(prev => [result, ...prev]);
      await loadVerificationData();

      setShowVerificationDialog(false);
      setSelectedMethod(null);
      setVerificationData({});
    } catch (error) {
      console.error('Error verifying patient:', error);
      setError('Failed to verify patient');
    } finally {
      setVerifying(false);
    }
  };

  const getMethodStatus = (method: VerificationMethod) => {
    if (!verificationStatus) return 'pending';
    return verificationStatus.completedMethods.some(m => m.id === method.id)
      ? 'completed'
      : 'pending';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderVerificationForm = (method: VerificationMethod) => {
    const service = PatientVerificationService.getInstance();
    const requirements = service.getVerificationRequirements(method);

    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-500 mb-4">{requirements.description}</p>
        {requirements.fields.map((field) => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.name.charAt(0).toUpperCase() + field.name.slice(1).replace(/([A-Z])/g, ' $1')}
            </label>
            {field.type === 'object' && method.id === 'knowledge_based' ? (
              <div className="space-y-3">
                {[
                  'What was your first car?',
                  'What is your mother\'s maiden name?',
                  'What was your childhood nickname?'
                ].map((question, index) => (
                  <div key={index}>
                    <p className="text-sm text-gray-600 mb-1">{question}</p>
                    <input
                      type="text"
                      className="w-full border rounded-md p-2"
                      value={verificationData.answers?.[index] || ''}
                      onChange={(e) =>
                        setVerificationData({
                          ...verificationData,
                          answers: {
                            ...verificationData.answers,
                            [index]: e.target.value
                          }
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            ) : (
              <input
                type={field.type}
                className="w-full border rounded-md p-2"
                value={verificationData[field.name] || ''}
                onChange={(e) =>
                  setVerificationData({ ...verificationData, [field.name]: e.target.value })
                }
                required={field.required}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Patient Verification</h2>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm ${
              verificationStatus?.isVerified
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {verificationStatus?.isVerified ? 'Verified' : 'Not Verified'}
            </span>
            <button
              onClick={() => {
                const service = PatientVerificationService.getInstance();
                const methods = service.getAvailableVerificationMethods();
                setSelectedMethod(methods[0]);
                setShowVerificationDialog(true);
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Verify Patient
            </button>
          </div>
        </div>

        {verificationStatus && (
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500">Confidence Score</h3>
                <p className="text-2xl font-semibold">
                  {Math.round(verificationStatus.confidenceScore * 100)}%
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500">Last Verified</h3>
                <p className="text-lg">
                  {verificationStatus.lastVerified
                    ? verificationStatus.lastVerified.toLocaleDateString()
                    : 'Never'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500">Verification Progress</h3>
                <p className="text-lg">
                  {verificationStatus.completedMethods.length} / {verificationStatus.requiredMethods.length}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Required Verification Methods</h3>
          <div className="space-y-3">
            {verificationStatus?.requiredMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <h4 className="font-medium">{method.name}</h4>
                  <p className="text-sm text-gray-500">{method.description}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  getMethodStatus(method) === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {getMethodStatus(method).toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-3">Verification History</h3>
          <div className="space-y-3">
            {verificationHistory.map((result) => (
              <div key={result.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium">{result.method.name}</h4>
                    <p className="text-sm text-gray-500">
                      {result.verifiedAt.toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(result.status)}`}>
                    {result.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="font-medium">Confidence Score:</span>{' '}
                    {Math.round(result.confidenceScore * 100)}%
                  </p>
                  <p>
                    <span className="font-medium">Verified By:</span> {result.verifiedBy}
                  </p>
                  {result.notes && (
                    <p>
                      <span className="font-medium">Notes:</span> {result.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Verification Dialog */}
      {showVerificationDialog && selectedMethod && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h3 className="text-xl font-semibold mb-4">
              Verify Patient - {selectedMethod.name}
            </h3>
            <div className="mb-4">
              {renderVerificationForm(selectedMethod)}
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowVerificationDialog(false);
                  setSelectedMethod(null);
                  setVerificationData({});
                }}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleVerify}
                disabled={verifying}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
              >
                {verifying ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 