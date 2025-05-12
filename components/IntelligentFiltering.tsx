import React, { useState, useEffect } from 'react';
import { AdvancedFiltering } from './AdvancedFiltering';
import { SmartViews } from './SmartViews';
import { FilterPreset, SearchResult, FilterGroup, FilterCondition } from '../lib/services/filterService';
import { hipaaAuditLogger, PHICategory } from '../lib/security/hipaa/audit';

interface IntelligentFilteringProps {
  userId: string;
  department: string;
  role: string;
  onFiltersChange: (filters: FilterPreset['filters']) => void;
  onSearchResults: (results: SearchResult[]) => void;
}

export const IntelligentFiltering: React.FC<IntelligentFilteringProps> = ({
  userId,
  department,
  role,
  onFiltersChange,
  onSearchResults
}) => {
  const [activeTab, setActiveTab] = useState<'smart' | 'advanced' | 'search'>('smart');
  const [combinedFilters, setCombinedFilters] = useState<FilterPreset['filters']>({});
  const [showFilterSummary, setShowFilterSummary] = useState(true);

  const handleSmartViewChange = (filters: FilterPreset['filters']) => {
    setCombinedFilters(filters);
    onFiltersChange(filters);
  };

  const handleAdvancedFilterChange = (filters: FilterPreset['filters']) => {
    setCombinedFilters(filters);
    onFiltersChange(filters);
  };

  const handleSearchResults = (results: SearchResult[]) => {
    onSearchResults(results);
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

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('smart')}
            className={`py-4 px-6 text-sm font-medium ${
              activeTab === 'smart'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Smart Views
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={`py-4 px-6 text-sm font-medium ${
              activeTab === 'advanced'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Advanced Filters
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`py-4 px-6 text-sm font-medium ${
              activeTab === 'search'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Natural Language Search
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'smart' && (
          <SmartViews
            userId={userId}
            department={department}
            role={role}
            onViewChange={handleSmartViewChange}
          />
        )}

        {activeTab === 'advanced' && (
          <AdvancedFiltering
            userId={userId}
            department={department}
            role={role}
            onFilterChange={handleAdvancedFilterChange}
            onSearch={handleSearchResults}
          />
        )}

        {activeTab === 'search' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Natural Language Search</h2>
            <p className="text-gray-600">
              Search across patient records using natural language. Examples:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>"Show me patients with high blood pressure who haven't visited in 3 months"</li>
              <li>"Find patients on warfarin who need INR monitoring"</li>
              <li>"List diabetic patients with recent A1C above 9"</li>
            </ul>
            <AdvancedFiltering
              userId={userId}
              department={department}
              role={role}
              onFilterChange={handleAdvancedFilterChange}
              onSearch={handleSearchResults}
            />
          </div>
        )}
      </div>

      {/* Active Filters Summary */}
      {Object.keys(combinedFilters).length > 0 && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-700">Active Filters:</h3>
            <button 
              onClick={() => setShowFilterSummary(!showFilterSummary)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showFilterSummary ? 'Hide Details' : 'Show Details'}
            </button>
          </div>
          
          {/* Basic filter chips */}
          <div className="flex flex-wrap gap-2 mb-2">
            {Object.entries(combinedFilters)
              .filter(([key]) => key !== 'complexConditions')
              .map(([key, value]) => (
                <span
                  key={key}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {key}: {Array.isArray(value) ? value.join(', ') : value}
                </span>
              ))}
          </div>
          
          {/* Complex conditions visualization */}
          {showFilterSummary && combinedFilters.complexConditions && (
            <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium mb-2">Complex Filter Conditions</h4>
              {renderFilterVisualization(combinedFilters.complexConditions)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 