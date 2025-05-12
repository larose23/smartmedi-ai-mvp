import React, { useState, useEffect } from 'react';
import { FilterService, FilterPreset, FilterGroup, FilterCondition } from '../lib/services/filterService';
import { hipaaAuditLogger, PHICategory } from '../lib/security/hipaa/audit';

interface SmartViewsProps {
  userId: string;
  department: string;
  role: string;
  onViewChange: (filters: FilterPreset['filters']) => void;
}

interface DepartmentView {
  id: string;
  name: string;
  description: string;
  filters: FilterPreset['filters'];
  roles: string[];
  color?: string;
  tags?: string[];
}

export const SmartViews: React.FC<SmartViewsProps> = ({
  userId,
  department,
  role,
  onViewChange
}) => {
  const [views, setViews] = useState<DepartmentView[]>([]);
  const [selectedView, setSelectedView] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState<string | null>(null);

  useEffect(() => {
    loadSmartViews();
  }, [department, role]);

  const loadSmartViews = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would fetch from an API
      const departmentViews = getDepartmentViews(department);
      const roleFilteredViews = departmentViews.filter(view => 
        view.roles.includes(role) || view.roles.includes('all')
      );
      setViews(roleFilteredViews);

      // Log access for HIPAA compliance
      await hipaaAuditLogger.logAccess({
        userId,
        action: 'VIEW_SMART_VIEWS',
        resourceType: 'SMART_VIEWS',
        resourceId: department,
        details: {
          department,
          role,
          viewCount: roleFilteredViews.length
        },
        category: PHICategory.ACCESS
      });
    } catch (error) {
      console.error('Error loading smart views:', error);
      await hipaaAuditLogger.logError({
        userId,
        action: 'VIEW_SMART_VIEWS',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          department,
          role
        },
        category: PHICategory.ERROR
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewSelect = (viewId: string) => {
    setSelectedView(viewId);
    const view = views.find(v => v.id === viewId);
    if (view) {
      onViewChange(view.filters);
    }
  };

  // Visualization helper for complex filter conditions
  const renderFilterVisualization = (group: FilterGroup, level = 0) => {
    const padding = level * 20;
    
    return (
      <div className="mt-2">
        <div className="flex items-center mb-1" style={{ paddingLeft: `${padding}px` }}>
          <span className="text-sm font-medium text-gray-700 mr-2">
            {group.operator}
          </span>
        </div>
        
        <div className="border-l-2 border-gray-300 ml-2" style={{ paddingLeft: `${padding + 15}px` }}>
          {group.conditions.map((condition, index) => {
            if ('operator' in condition && !('field' in condition)) {
              // It's a nested group
              return (
                <div key={`group-${index}`} className="mb-2">
                  {renderFilterVisualization(condition as FilterGroup, level + 1)}
                </div>
              );
            } else {
              // It's a simple condition
              const { field, operator, value } = condition as FilterCondition;
              return (
                <div key={`condition-${index}`} className="flex items-center mb-2">
                  <span className="text-sm text-gray-600 mr-1">{field}</span>
                  <span className="text-sm text-gray-500 mx-1">{operator}</span>
                  <span className="text-sm text-gray-600 ml-1">{String(value)}</span>
                </div>
              );
            }
          })}
        </div>
      </div>
    );
  };

  // Helper function to get department-specific views
  const getDepartmentViews = (dept: string): DepartmentView[] => {
    const commonViews: DepartmentView[] = [
      {
        id: 'high-risk',
        name: 'High Risk Patients',
        description: 'View patients with high-risk conditions and medications',
        filters: {
          riskLevel: ['high'],
          complexConditions: {
            operator: 'AND',
            conditions: [
              { field: 'risk.riskLevel', operator: '=', value: 'high' },
              { field: 'medical.diagnosis', operator: 'CONTAINS', value: 'chronic' }
            ]
          }
        },
        roles: ['all'],
        color: '#EF4444', // Red color for high risk
        tags: ['Critical', 'Priority']
      },
      {
        id: 'recent-visits',
        name: 'Recent Visits',
        description: 'Patients who visited in the last 30 days',
        filters: {
          complexConditions: {
            operator: 'AND',
            conditions: [
              { field: 'patient.lastVisit', operator: '>', value: '30_days_ago' }
            ]
          }
        },
        roles: ['all'],
        color: '#3B82F6', // Blue
        tags: ['Recent']
      }
    ];

    const departmentSpecificViews: Record<string, DepartmentView[]> = {
      'cardiology': [
        {
          id: 'cardiac-followup',
          name: 'Cardiac Follow-ups',
          description: 'Patients requiring cardiac follow-up care',
          filters: {
            complexConditions: {
              operator: 'AND',
              conditions: [
                { 
                  field: 'medical.diagnosis', 
                  operator: 'IN', 
                  value: ['heart disease', 'hypertension', 'arrhythmia'] 
                },
                { field: 'patient.requiresFollowUp', operator: '=', value: true }
              ]
            }
          },
          roles: ['doctor', 'nurse'],
          color: '#10B981', // Green
          tags: ['Follow-up', 'Cardiology']
        },
        {
          id: 'cardiac-medications',
          name: 'Cardiac Medications',
          description: 'Patients on cardiac medications',
          filters: {
            complexConditions: {
              operator: 'AND',
              conditions: [
                { 
                  field: 'medications.category', 
                  operator: '=', 
                  value: 'cardiac'
                }
              ]
            }
          },
          roles: ['pharmacist', 'nurse'],
          color: '#8B5CF6', // Purple
          tags: ['Medication', 'Cardiology']
        }
      ],
      'neurology': [
        {
          id: 'neuro-followup',
          name: 'Neurology Follow-ups',
          description: 'Patients requiring neurological follow-up care',
          filters: {
            complexConditions: {
              operator: 'AND',
              conditions: [
                { 
                  field: 'medical.diagnosis', 
                  operator: 'IN', 
                  value: ['epilepsy', 'migraine', 'stroke'] 
                },
                { field: 'patient.requiresFollowUp', operator: '=', value: true }
              ]
            }
          },
          roles: ['doctor', 'nurse'],
          color: '#F59E0B', // Amber
          tags: ['Follow-up', 'Neurology']
        },
        {
          id: 'neuro-medications',
          name: 'Neurology Medications',
          description: 'Patients on neurological medications',
          filters: {
            complexConditions: {
              operator: 'AND',
              conditions: [
                { 
                  field: 'medications.category', 
                  operator: '=', 
                  value: 'neurological'
                }
              ]
            }
          },
          roles: ['pharmacist', 'nurse'],
          color: '#6366F1', // Indigo
          tags: ['Medication', 'Neurology']
        }
      ]
    };

    return [
      ...commonViews,
      ...(departmentSpecificViews[dept] || [])
    ];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Smart Views</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {views.map((view) => (
          <div
            key={view.id}
            className={`p-4 rounded-lg border-l-4 cursor-pointer transition-colors ${
              selectedView === view.id
                ? 'border-blue-500 bg-blue-50'
                : 'hover:border-blue-300'
            }`}
            style={{ borderLeftColor: view.color || '#3B82F6' }}
          >
            <div onClick={() => handleViewSelect(view.id)}>
              <h3 className="font-medium">{view.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{view.description}</p>
              <div className="mt-2 text-sm text-gray-600">
                <div>Available to: {view.roles.join(', ')}</div>
              </div>
              
              {/* Tags display */}
              {view.tags && view.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {view.tags.map(tag => (
                    <span 
                      key={tag} 
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Complex conditions preview */}
              {view.filters.complexConditions && (
                <div className="mt-2 text-xs text-gray-500">
                  <p>{view.filters.complexConditions.conditions.length} conditions</p>
                </div>
              )}
            </div>
            
            {/* View details button */}
            <div className="mt-3 flex justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetails(showDetails === view.id ? null : view.id);
                }}
                className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800"
              >
                {showDetails === view.id ? 'Hide details' : 'View details'}
              </button>
            </div>
            
            {/* Filter details panel */}
            {showDetails === view.id && view.filters.complexConditions && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Filter Conditions</h4>
                {renderFilterVisualization(view.filters.complexConditions)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}; 