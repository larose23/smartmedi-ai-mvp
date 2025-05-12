import React, { useState, useEffect } from 'react';
import { PopulationAnalyticsService, Cohort, DiseasePattern, GeospatialHealthTrend, GeospatialDataPoint } from '../lib/services/populationAnalyticsService';
import GeospatialMap from './GeospatialMap';
import { hipaaAuditLogger } from '../lib/services/hipaaAuditLogger';

interface PopulationAnalyticsProps {
  userId: string;
  department: string;
  role: string;
}

const PopulationAnalytics: React.FC<PopulationAnalyticsProps> = ({ userId, department, role }) => {
  const [activeTab, setActiveTab] = useState<'cohorts' | 'patterns' | 'geospatial'>('cohorts');
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [diseasePatterns, setDiseasePatterns] = useState<DiseasePattern[]>([]);
  const [geospatialTrends, setGeospatialTrends] = useState<GeospatialHealthTrend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewCohortForm, setShowNewCohortForm] = useState(false);
  const [newCohort, setNewCohort] = useState({
    name: '',
    description: '',
    criteria: {
      ageRange: { min: 0, max: 100 },
      gender: 'all',
      conditions: [],
      medications: [],
      timeRange: '1y'
    }
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cohortToDelete, setCohortToDelete] = useState<Cohort | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const service = PopulationAnalyticsService.getInstance();
      
      switch (activeTab) {
        case 'cohorts':
          const cohortData = await service.getCohorts(department);
          setCohorts(cohortData);
          break;
        case 'patterns':
          const patternData = await service.identifyDiseasePatterns(department);
          setDiseasePatterns(patternData);
          break;
        case 'geospatial':
          const trendData = await service.analyzeGeospatialTrends(department);
          setGeospatialTrends(trendData);
          break;
      }
      
      hipaaAuditLogger.logAccess({
        userId,
        action: `VIEW_${activeTab.toUpperCase()}`,
        resource: department,
        details: { role }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      hipaaAuditLogger.logError({
        userId,
        action: `VIEW_${activeTab.toUpperCase()}`,
        resource: department,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCohort = async () => {
    try {
      const service = PopulationAnalyticsService.getInstance();
      const newCohortData = await service.createCohort(department, newCohort);
      setCohorts([...cohorts, newCohortData]);
      setShowNewCohortForm(false);
      setNewCohort({
        name: '',
        description: '',
        criteria: {
          ageRange: { min: 0, max: 100 },
          gender: 'all',
          conditions: [],
          medications: [],
          timeRange: '1y'
        }
      });
      
      hipaaAuditLogger.logAccess({
        userId,
        action: 'CREATE_COHORT',
        resource: department,
        details: { role, cohortName: newCohort.name }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create cohort');
    }
  };

  const handleDeleteCohort = async () => {
    if (!cohortToDelete) return;

    try {
      const service = PopulationAnalyticsService.getInstance();
      await service.deleteCohort(cohortToDelete.id);
      setCohorts(cohorts.filter(c => c.id !== cohortToDelete.id));
      setShowDeleteConfirm(false);
      setCohortToDelete(null);
      
      hipaaAuditLogger.logAccess({
        userId,
        action: 'DELETE_COHORT',
        resource: department,
        details: { role, cohortName: cohortToDelete.name }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete cohort');
    }
  };

  const handleDataPointClick = (dataPoint: GeospatialDataPoint) => {
    // Handle data point click - could show more detailed information
    console.log('Data point clicked:', dataPoint);
  };

  const renderDeleteConfirmation = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Cohort</h3>
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete the cohort "{cohortToDelete?.name}"? This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => {
              setShowDeleteConfirm(false);
              setCohortToDelete(null);
            }}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteCohort}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );

  const renderCohortAnalysis = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Cohort Analysis</h2>
        <button
          onClick={() => setShowNewCohortForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Create New Cohort
        </button>
      </div>

      {showNewCohortForm && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Create New Cohort</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={newCohort.name}
                onChange={(e) => setNewCohort({ ...newCohort, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={newCohort.description}
                onChange={(e) => setNewCohort({ ...newCohort, description: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowNewCohortForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCohort}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cohorts.map((cohort) => (
          <div
            key={cohort.id}
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{cohort.name}</h3>
                <p className="mt-2 text-gray-600">{cohort.description}</p>
              </div>
              <button
                onClick={() => {
                  setCohortToDelete(cohort);
                  setShowDeleteConfirm(true);
                }}
                className="text-gray-400 hover:text-red-500"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-500">
                Size: {cohort.size.toLocaleString()} patients
              </p>
              <p className="text-sm text-gray-500">
                Created: {new Date(cohort.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
      {showDeleteConfirm && renderDeleteConfirmation()}
    </div>
  );

  const renderDiseasePatterns = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Disease Patterns</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {diseasePatterns.map((pattern) => (
          <div
            key={pattern.id}
            className="bg-white p-6 rounded-lg shadow-md"
          >
            <h3 className="text-lg font-semibold text-gray-900">{pattern.name}</h3>
            <p className="mt-2 text-gray-600">{pattern.description}</p>
            <div className="mt-4">
              <h4 className="font-medium text-gray-900">Key Indicators:</h4>
              <ul className="mt-2 space-y-1">
                {pattern.indicators.map((indicator, index) => (
                  <li key={index} className="text-sm text-gray-600">
                    • {indicator}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4">
              <h4 className="font-medium text-gray-900">Risk Factors:</h4>
              <ul className="mt-2 space-y-1">
                {pattern.riskFactors.map((factor, index) => (
                  <li key={index} className="text-sm text-gray-600">
                    • {factor}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderGeospatialTrends = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Geospatial Health Trends</h2>
      <div className="space-y-8">
        {geospatialTrends.map((trend) => (
          <div key={trend.id} className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-900">{trend.metric}</h3>
            <p className="mt-2 text-gray-600">{trend.description}</p>
            <div className="mt-4">
              <GeospatialMap
                trend={trend}
                onDataPointClick={handleDataPointClick}
              />
            </div>
            <div className="mt-4">
              <h4 className="font-medium text-gray-900">Key Insights:</h4>
              <ul className="mt-2 space-y-1">
                {trend.insights.map((insight, index) => (
                  <li key={index} className="text-sm text-gray-600">
                    • {insight}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('cohorts')}
            className={`${
              activeTab === 'cohorts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Cohort Analysis
          </button>
          <button
            onClick={() => setActiveTab('patterns')}
            className={`${
              activeTab === 'patterns'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Disease Patterns
          </button>
          <button
            onClick={() => setActiveTab('geospatial')}
            className={`${
              activeTab === 'geospatial'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Geospatial Trends
          </button>
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'cohorts' && renderCohortAnalysis()}
        {activeTab === 'patterns' && renderDiseasePatterns()}
        {activeTab === 'geospatial' && renderGeospatialTrends()}
      </div>
    </div>
  );
};

export default PopulationAnalytics; 