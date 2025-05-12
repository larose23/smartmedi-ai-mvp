import React, { useState, useEffect } from 'react';
import { ResourceAllocationService, PatientVolumePrediction, StaffAllocation, DepartmentLoad } from '../lib/services/resourceAllocation';
import { hipaaAuditLogger, PHICategory } from '../lib/security/hipaa/audit';

interface ResourceAllocationDashboardProps {
  department: string;
  userId: string;
}

interface VolumePredictionDisplay extends PatientVolumePrediction {
  factors: {
    name: string;
    impact: number;
  }[];
}

interface StaffAllocationDisplay extends StaffAllocation {
  currentStaff: {
    role: string;
    count: number;
  }[];
  adjustments: {
    role: string;
    change: number;
    reason: string;
  }[];
}

interface DepartmentLoadDisplay extends DepartmentLoad {
  recommendations: {
    action: string;
    impact: number;
    priority: 'high' | 'medium' | 'low';
    reason: string;
  }[];
}

export const ResourceAllocationDashboard: React.FC<ResourceAllocationDashboardProps> = ({
  department,
  userId
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [volumePredictions, setVolumePredictions] = useState<VolumePredictionDisplay[]>([]);
  const [staffAllocation, setStaffAllocation] = useState<StaffAllocationDisplay | null>(null);
  const [departmentLoads, setDepartmentLoads] = useState<DepartmentLoadDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [department, selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const service = ResourceAllocationService.getInstance();
      const startDate = new Date(selectedDate);
      const endDate = new Date(selectedDate);
      endDate.setDate(endDate.getDate() + 7); // Get predictions for the next week

      const [predictions, allocation, loads] = await Promise.all([
        service.predictPatientVolume(department, startDate, endDate),
        service.getStaffAllocationRecommendations(department, selectedDate),
        service.getDepartmentLoadBalancing(selectedDate)
      ]);

      setVolumePredictions(predictions);
      setStaffAllocation(allocation);
      setDepartmentLoads(loads);

      await hipaaAuditLogger.logAccess(
        userId,
        'provider',
        PHICategory.PHI,
        'resource_allocation_dashboard_access',
        { department, date: selectedDate },
        '127.0.0.1',
        'ResourceAllocationDashboard',
        true
      );
    } catch (error) {
      console.error('Error loading resource allocation data:', error);
      setError('Failed to load resource allocation data');
      await hipaaAuditLogger.logError(
        userId,
        'provider',
        PHICategory.PHI,
        'resource_allocation_dashboard_error',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        '127.0.0.1',
        'ResourceAllocationDashboard'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = () => {
    const exportData = {
      department,
      date: selectedDate,
      volumePredictions,
      staffAllocation,
      departmentLoads
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resource-allocation-${department}-${selectedDate.toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    hipaaAuditLogger.logAccess(
      userId,
      'provider',
      PHICategory.PHI,
      'resource_allocation_export',
      { department, date: selectedDate },
      '127.0.0.1',
      'ResourceAllocationDashboard',
      true
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
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
      {/* Date Selection, Refresh, and Export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Select Date:</label>
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>Export</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md ${
              refreshing
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {refreshing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                <span>Refreshing...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>Refresh</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Patient Volume Predictions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Patient Volume Predictions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {volumePredictions.map((prediction) => (
            <div
              key={prediction.date.toISOString()}
              className="p-4 border rounded-lg"
            >
              <div className="text-lg font-medium">
                {prediction.date.toLocaleDateString()}
              </div>
              <div className="text-2xl font-bold text-blue-600 mt-2">
                {prediction.predictedVolume} patients
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Confidence: {Math.round(prediction.confidence * 100)}%
              </div>
              <div className="mt-2">
                <div className="text-sm font-medium text-gray-700">Factors:</div>
                {prediction.factors.map((factor) => (
                  <div key={factor.name} className="text-sm text-gray-600">
                    {factor.name}: {Math.round(factor.impact * 100)}%
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Staff Allocation */}
      {staffAllocation && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Staff Allocation</h2>
          <div className="space-y-6">
            {/* Current Staff */}
            <div>
              <h3 className="text-lg font-medium mb-2">Current Staff</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {staffAllocation.currentStaff.map((staff) => (
                  <div key={staff.role} className="p-3 border rounded-lg">
                    <div className="font-medium">{staff.role}</div>
                    <div className="text-xl font-bold text-blue-600">
                      {staff.count}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Adjustments */}
            <div>
              <h3 className="text-lg font-medium mb-2">Recommended Adjustments</h3>
              <div className="space-y-2">
                {staffAllocation.adjustments.map((adjustment) => (
                  <div
                    key={adjustment.role}
                    className={`p-3 border rounded-lg ${
                      adjustment.change > 0
                        ? 'border-green-200 bg-green-50'
                        : adjustment.change < 0
                        ? 'border-red-200 bg-red-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{adjustment.role}</div>
                        <div className="text-sm text-gray-600">
                          {adjustment.reason}
                        </div>
                      </div>
                      <div
                        className={`text-lg font-bold ${
                          adjustment.change > 0
                            ? 'text-green-600'
                            : adjustment.change < 0
                            ? 'text-red-600'
                            : 'text-gray-600'
                        }`}
                      >
                        {adjustment.change > 0 ? '+' : ''}
                        {adjustment.change}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Department Load Balancing */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Department Load Balancing</h2>
        <div className="space-y-6">
          {departmentLoads.map((load) => (
            <div key={load.department} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium capitalize">
                  {load.department}
                </h3>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Current Load</div>
                  <div className="text-xl font-bold text-blue-600">
                    {load.currentLoad}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {load.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className={`p-3 border rounded-lg ${
                      rec.priority === 'high'
                        ? 'border-red-200 bg-red-50'
                        : rec.priority === 'medium'
                        ? 'border-yellow-200 bg-yellow-50'
                        : 'border-green-200 bg-green-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{rec.action}</div>
                        <div className="text-sm text-gray-600">
                          {rec.reason}
                        </div>
                      </div>
                      <div className={`text-sm font-medium ${getPriorityColor(rec.priority)}`}>
                        {rec.priority.toUpperCase()}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      Impact: {Math.round(rec.impact)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 