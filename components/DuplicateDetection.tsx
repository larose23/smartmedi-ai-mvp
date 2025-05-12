import React, { useState, useEffect } from 'react';
import { PatientIdentificationService, PatientRecord, DuplicateMatch } from '../lib/services/patientIdentification';
import { hipaaAuditLogger, PHICategory } from '../lib/security/hipaa/audit';

interface DuplicateDetectionProps {
  patient: PatientRecord;
  userId: string;
  onMerge?: (patient1: PatientRecord, patient2: PatientRecord) => void;
}

export const DuplicateDetection: React.FC<DuplicateDetectionProps> = ({
  patient,
  userId,
  onMerge
}) => {
  const [potentialDuplicates, setPotentialDuplicates] = useState<DuplicateMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<DuplicateMatch | null>(null);
  const [mergeNotes, setMergeNotes] = useState('');
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergeHistory, setMergeHistory] = useState<{
    mergedFrom: string[];
    mergedInto?: string;
    mergeDate: Date;
    mergedBy: string;
    notes?: string;
  }[]>([]);
  const [showMergeHistory, setShowMergeHistory] = useState(false);

  useEffect(() => {
    loadPotentialDuplicates();
    loadMergeHistory();
  }, [patient]);

  const loadPotentialDuplicates = async () => {
    try {
      setLoading(true);
      setError(null);

      const service = PatientIdentificationService.getInstance();
      const duplicates = await service.findPotentialDuplicates(patient);
      setPotentialDuplicates(duplicates);

      await hipaaAuditLogger.logAccess(
        userId,
        'provider',
        PHICategory.PHI,
        'duplicate_detection_view',
        { patientId: patient.id },
        '127.0.0.1',
        'DuplicateDetection',
        true
      );
    } catch (error) {
      console.error('Error loading potential duplicates:', error);
      setError('Failed to load potential duplicates');
      await hipaaAuditLogger.logError(
        userId,
        'provider',
        PHICategory.PHI,
        'duplicate_detection_error',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        '127.0.0.1',
        'DuplicateDetection'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadMergeHistory = async () => {
    try {
      const service = PatientIdentificationService.getInstance();
      const history = await service.getMergeHistory(patient.id);
      setMergeHistory(history);
    } catch (error) {
      console.error('Error loading merge history:', error);
    }
  };

  const handleReview = async (match: DuplicateMatch, status: 'reviewed' | 'merged' | 'rejected') => {
    try {
      const service = PatientIdentificationService.getInstance();
      await service.updateDuplicateStatus(match, status, userId, mergeNotes);

      if (status === 'merged' && onMerge) {
        onMerge(match.patient1, match.patient2);
      }

      setPotentialDuplicates(prev =>
        prev.map(m =>
          m === match ? { ...m, status, reviewedBy: userId, reviewedAt: new Date(), mergeNotes } : m
        )
      );

      setShowMergeDialog(false);
      setSelectedMatch(null);
      setMergeNotes('');
    } catch (error) {
      console.error('Error updating duplicate status:', error);
      setError('Failed to update duplicate status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'reviewed':
        return 'bg-blue-100 text-blue-800';
      case 'merged':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
          <h2 className="text-xl font-semibold">Potential Duplicates</h2>
          <button
            onClick={() => setShowMergeHistory(!showMergeHistory)}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            {showMergeHistory ? 'Hide Merge History' : 'Show Merge History'}
          </button>
        </div>

        {showMergeHistory && mergeHistory.length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium mb-3">Merge History</h3>
            <div className="space-y-3">
              {mergeHistory.map((record, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="font-medium">Merged From:</span>{' '}
                      {record.mergedFrom.join(', ')}
                    </p>
                    {record.mergedInto && (
                      <p>
                        <span className="font-medium">Merged Into:</span>{' '}
                        {record.mergedInto}
                      </p>
                    )}
                    <p>
                      <span className="font-medium">Date:</span>{' '}
                      {record.mergeDate.toLocaleDateString()}
                    </p>
                    <p>
                      <span className="font-medium">By:</span> {record.mergedBy}
                    </p>
                    {record.notes && (
                      <p>
                        <span className="font-medium">Notes:</span> {record.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {potentialDuplicates.length === 0 ? (
          <p className="text-gray-500">No potential duplicates found.</p>
        ) : (
          <div className="space-y-4">
            {potentialDuplicates.map((match) => (
              <div
                key={`${match.patient1.id}-${match.patient2.id}`}
                className="border rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium">
                      Match Score: {Math.round(match.matchScore * 100)}%
                    </h3>
                    <div className="text-sm text-gray-500">
                      Status: <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(match.status)}`}>
                        {match.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  {match.status === 'pending' && (
                    <div className="space-x-2">
                      <button
                        onClick={() => {
                          setSelectedMatch(match);
                          setShowMergeDialog(true);
                        }}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                      >
                        Review
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-3">
                    <h4 className="font-medium mb-2">Patient 1</h4>
                    <div className="text-sm space-y-1">
                      <p>Name: {match.patient1.firstName} {match.patient1.lastName}</p>
                      <p>DOB: {match.patient1.dateOfBirth.toLocaleDateString()}</p>
                      <p>Address: {match.patient1.address.street}, {match.patient1.address.city}</p>
                      <p>Phone: {match.patient1.phoneNumber}</p>
                    </div>
                  </div>
                  <div className="border rounded-lg p-3">
                    <h4 className="font-medium mb-2">Patient 2</h4>
                    <div className="text-sm space-y-1">
                      <p>Name: {match.patient2.firstName} {match.patient2.lastName}</p>
                      <p>DOB: {match.patient2.dateOfBirth.toLocaleDateString()}</p>
                      <p>Address: {match.patient2.address.street}, {match.patient2.address.city}</p>
                      <p>Phone: {match.patient2.phoneNumber}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="font-medium mb-2">Match Factors</h4>
                  <div className="space-y-2">
                    {match.matchFactors.map((factor) => (
                      <div key={factor.name} className="text-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{factor.name}</span>
                          <span className="text-gray-500">
                            {Math.round(factor.score * 100)}%
                          </span>
                        </div>
                        <p className="text-gray-600 text-xs mt-1">{factor.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Merge Dialog */}
      {showMergeDialog && selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h3 className="text-xl font-semibold mb-4">Review Potential Duplicate</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={mergeNotes}
                onChange={(e) => setMergeNotes(e.target.value)}
                className="w-full border rounded-md p-2"
                rows={4}
                placeholder="Add notes about this duplicate review..."
              />
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowMergeDialog(false);
                  setSelectedMatch(null);
                  setMergeNotes('');
                }}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReview(selectedMatch, 'rejected')}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Reject
              </button>
              <button
                onClick={() => handleReview(selectedMatch, 'merged')}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                Merge Records
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 