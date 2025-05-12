import React, { useState, useEffect } from 'react';
import { RecordMatchingService, MatchResult, ExternalIdentifier, MasterPatientIndex } from '../lib/services/recordMatching';
import { PatientRecord } from '../lib/services/patientIdentification';
import { hipaaAuditLogger, PHICategory } from '../lib/security/hipaa/audit';
import { useAccessibility } from '@/lib/contexts/AccessibilityContext';

interface RecordMatchingProps {
  patient: PatientRecord;
  userId: string;
}

export const RecordMatching: React.FC<RecordMatchingProps> = ({
  patient,
  userId
}) => {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [masterIndex, setMasterIndex] = useState<MasterPatientIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);
  const [showMatchDialog, setShowMatchDialog] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMatchHistory, setShowMatchHistory] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const { highContrast, fontSize } = useAccessibility();

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    loadRecordMatchingData();
  }, [patient]);

  const loadRecordMatchingData = async () => {
    try {
      setLoading(true);
      setError(null);

      const service = RecordMatchingService.getInstance();
      const [matchResults, mpi] = await Promise.all([
        service.findMatches(patient, userId),
        service.getMasterPatientIndex(patient.id)
      ]);

      setMatches(matchResults);
      setMasterIndex(mpi);

      await hipaaAuditLogger.logAccess(
        userId,
        'provider',
        PHICategory.PHI,
        'record_matching_view',
        { patientId: patient.id },
        '127.0.0.1',
        'RecordMatching',
        true
      );
    } catch (error) {
      console.error('Error loading record matching data:', error);
      setError('Failed to load record matching data');
      await hipaaAuditLogger.logError(
        userId,
        'provider',
        PHICategory.PHI,
        'record_matching_error',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        '127.0.0.1',
        'RecordMatching'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMatch = async (match: MatchResult) => {
    try {
      setVerifying(true);
      const service = RecordMatchingService.getInstance();

      // Update master patient index with the verified match
      const externalIdentifier = match.externalIdentifiers[0];
      const updatedMpi = await service.updateMasterPatientIndex(
        patient.id,
        externalIdentifier,
        userId
      );

      setMasterIndex(updatedMpi);
      setShowMatchDialog(false);
      setSelectedMatch(null);

      await hipaaAuditLogger.logAccess(
        userId,
        'provider',
        PHICategory.PHI,
        'record_match_verify',
        {
          patientId: patient.id,
          matchId: match.patientId,
          systemId: externalIdentifier.systemId
        },
        '127.0.0.1',
        'RecordMatching',
        true
      );
    } catch (error) {
      console.error('Error verifying match:', error);
      setError('Failed to verify match');
    } finally {
      setVerifying(false);
    }
  };

  const getMatchStatusColor = (status: string) => {
    switch (status) {
      case 'matched':
        return 'bg-green-100 text-green-800';
      case 'potential':
        return 'bg-yellow-100 text-yellow-800';
      case 'unmatched':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredMatches = matches.filter(match => {
    const searchLower = searchQuery.toLowerCase();
    return (
      match.patientId.toLowerCase().includes(searchLower) ||
      match.externalIdentifiers.some(id => 
        id.externalId.toLowerCase().includes(searchLower) ||
        id.systemId.toLowerCase().includes(searchLower)
      ) ||
      match.matchFactors.some(factor =>
        factor.name.toLowerCase().includes(searchLower) ||
        factor.details.toLowerCase().includes(searchLower)
      )
    );
  });

  if (loading) {
    return (
      <div 
        className="flex items-center justify-center p-8"
        role="status"
        aria-label="Loading record matching data"
      >
        <div 
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"
          aria-hidden="true"
        ></div>
        <span className="sr-only">Loading record matching data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="p-4 bg-red-50 text-red-700 rounded-lg"
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-center gap-2">
          <svg 
            className="h-5 w-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`space-y-6 ${highContrast ? 'high-contrast' : ''}`}
      style={{ fontSize: `${fontSize}px` }}
    >
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h2 className="text-xl font-semibold" id="record-matching-title">Record Matching</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
            <div className="relative flex-grow sm:flex-grow-0">
              <label 
                htmlFor="search-matches" 
                className="block text-sm font-medium mb-1"
              >
                Search matches
              </label>
              <input
                id="search-matches"
                type="search"
                inputMode="search"
                placeholder="Search matches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Search matches"
                aria-describedby="search-description"
              />
              <span id="search-description" className="sr-only">
                Enter keywords to search through patient record matches
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Clear search"
                >
                  <span className="sr-only">Clear search</span>
                  ×
                </button>
              )}
            </div>
            <button
              onClick={loadRecordMatchingData}
              className="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px]"
              aria-label="Refresh matches"
            >
              Refresh Matches
            </button>
          </div>
        </div>

        {masterIndex && (
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
              <h3 className="text-lg font-medium">Master Patient Index</h3>
              <button
                onClick={() => setShowMatchHistory(!showMatchHistory)}
                className="text-sm text-blue-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
                aria-expanded={showMatchHistory}
                aria-controls="match-history"
              >
                {showMatchHistory ? 'Hide History' : 'Show History'}
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">Primary Record</h4>
                  <dl className="mt-2 space-y-1">
                    <div>
                      <dt className="sr-only">Name</dt>
                      <dd className="text-sm text-gray-600">
                        {masterIndex.primaryRecord.firstName} {masterIndex.primaryRecord.lastName}
                      </dd>
                    </div>
                    <div>
                      <dt className="sr-only">Date of Birth</dt>
                      <dd className="text-sm text-gray-600">
                        DOB: {masterIndex.primaryRecord.dateOfBirth.toLocaleDateString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="sr-only">Last Updated</dt>
                      <dd className="text-sm text-gray-600">
                        Last Updated: {masterIndex.lastUpdated.toLocaleDateString()}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h4 className="font-medium">External Identifiers</h4>
                  <ul className="mt-2 space-y-2" role="list">
                    {masterIndex.externalIdentifiers.map((identifier) => (
                      <li key={identifier.externalId} className="text-sm">
                        <span className="font-medium">{identifier.systemId}:</span>{' '}
                        {identifier.externalId}
                        <span className="ml-2 text-gray-500">
                          (Confidence: {Math.round(identifier.confidence * 100)}%)
                        </span>
                        <span className="ml-2 text-xs text-gray-400">
                          {identifier.source} - {identifier.verified ? 'Verified' : 'Unverified'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {showMatchHistory && masterIndex.matchResults.length > 0 && (
                <div id="match-history" className="mt-4 pt-4 border-t">
                  <h4 className="font-medium mb-2">Match History</h4>
                  <ul className="space-y-2" role="list">
                    {masterIndex.matchResults.map((result) => (
                      <li key={result.patientId} className="text-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div>
                            <span className="font-medium">Match ID:</span> {result.patientId}
                            <br />
                            <span className="font-medium">Score:</span>{' '}
                            {Math.round(result.matchScore * 100)}%
                          </div>
                          <span 
                            className={`px-2 py-1 rounded-full text-xs ${getMatchStatusColor(result.status)}`}
                            role="status"
                            aria-label={`Status: ${result.status}`}
                          >
                            {result.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="mt-1 text-gray-500">
                          Last Updated: {result.lastUpdated.toLocaleDateString()}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <div role="region" aria-labelledby="record-matching-title">
          {loading ? (
            <div 
              className="flex items-center justify-center h-64"
              role="status"
              aria-label="Loading matches"
            >
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div 
              className="text-red-500 text-center p-4"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          ) : matches.length === 0 ? (
            <div 
              className="text-center p-4 text-gray-500"
              role="status"
              aria-live="polite"
            >
              No matches found
            </div>
          ) : (
            <ul 
              className="space-y-4"
              role="list"
              aria-label="Patient record matches"
            >
              {matches.map((match) => (
                <li 
                  key={match.patientId} 
                  className="border rounded-lg p-4"
                  role="listitem"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                    <div>
                      <h4 className="font-medium">Match Score: {Math.round(match.matchScore * 100)}%</h4>
                      <p className="text-sm text-gray-500">
                        Last Updated: {match.lastUpdated.toLocaleDateString()}
                      </p>
                    </div>
                    <span 
                      className={`px-2 py-1 rounded-full text-xs ${getMatchStatusColor(match.status)}`}
                      role="status"
                      aria-label={`Status: ${match.status}`}
                    >
                      {match.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="mb-4">
                    <h5 className="font-medium mb-2">Match Factors</h5>
                    <ul 
                      className="space-y-2" 
                      role="list"
                      aria-label="Match factors"
                    >
                      {match.matchFactors.map((factor, index) => (
                        <li 
                          key={index} 
                          className="text-sm"
                          role="listitem"
                        >
                          <span className="font-medium">{factor.name}:</span>{' '}
                          {Math.round(factor.score * 100)}% - {factor.details}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {match.status === 'potential' && (
                    <button
                      onClick={() => {
                        setSelectedMatch(match);
                        setShowMatchDialog(true);
                      }}
                      className="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px]"
                      aria-label={`Review match with score ${Math.round(match.matchScore * 100)}%`}
                    >
                      Review Match
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Match Review Dialog */}
      {showMatchDialog && selectedMatch && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="match-review-title"
          aria-describedby="match-review-description"
        >
          <div 
            className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            role="document"
          >
            <h3 
              id="match-review-title" 
              className="text-xl font-semibold mb-4"
            >
              Review Potential Match
            </h3>
            <div 
              id="match-review-description"
              className="sr-only"
            >
              Review details of the potential patient record match
            </div>
            <div className="mb-6">
              <h4 className="font-medium mb-2">Match Details</h4>
              <dl className="space-y-2">
                <div>
                  <dt className="font-medium">Match Score:</dt>
                  <dd>{Math.round(selectedMatch.matchScore * 100)}%</dd>
                </div>
                <div>
                  <dt className="font-medium">External System:</dt>
                  <dd>{selectedMatch.externalIdentifiers[0].systemId}</dd>
                </div>
                <div>
                  <dt className="font-medium">External ID:</dt>
                  <dd>{selectedMatch.externalIdentifiers[0].externalId}</dd>
                </div>
              </dl>
            </div>

            <div className="mb-6">
              <h4 className="font-medium mb-2">Match Factors</h4>
              <ul className="space-y-2" role="list">
                {selectedMatch.matchFactors.map((factor, index) => (
                  <li key={index} className="text-sm">
                    <span className="font-medium">{factor.name}:</span>{' '}
                    {Math.round(factor.score * 100)}% - {factor.details}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-4">
              <button
                onClick={() => {
                  setShowMatchDialog(false);
                  setSelectedMatch(null);
                }}
                className="w-full sm:w-auto px-4 py-2 border rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px]"
                aria-label="Cancel match review"
              >
                Cancel
              </button>
              <button
                onClick={() => handleVerifyMatch(selectedMatch)}
                disabled={verifying}
                className="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 min-h-[44px]"
                aria-label="Verify match"
              >
                {verifying ? 'Verifying...' : 'Verify Match'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 