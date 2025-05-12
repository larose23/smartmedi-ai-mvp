import React, { useState, useEffect } from 'react';
import { FilterService, FilterPreset, SearchResult, FilterCondition, FilterGroup, FilterOperator, ComparisonOperator } from '../lib/services/filterService';
import { hipaaAuditLogger, PHICategory } from '../lib/security/hipaa/audit';

interface AdvancedFilteringProps {
  userId: string;
  department?: string;
  role?: string;
  onFilterChange: (filters: FilterPreset['filters']) => void;
  onSearch: (results: SearchResult[]) => void;
}

export const AdvancedFiltering: React.FC<AdvancedFilteringProps> = ({
  userId,
  department,
  role,
  onFilterChange,
  onSearch
}) => {
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showNewPresetForm, setShowNewPresetForm] = useState(false);
  const [newPreset, setNewPreset] = useState<Partial<FilterPreset>>({
    name: '',
    description: '',
    filters: {},
    isShared: false,
    color: '#3B82F6', // Default blue color
    tags: []
  });
  const [editingPreset, setEditingPreset] = useState<FilterPreset | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  // New state for complex filtering
  const [showConditionBuilder, setShowConditionBuilder] = useState(false);
  const [complexConditions, setComplexConditions] = useState<FilterGroup>({
    operator: 'AND',
    conditions: []
  });
  const [availableFields, setAvailableFields] = useState<{category: string, fields: string[]}[]>([
    { category: 'Patient', fields: ['age', 'gender', 'name', 'dob'] },
    { category: 'Medical', fields: ['diagnosis', 'allergies', 'bloodType', 'height', 'weight', 'bmi'] },
    { category: 'Labs', fields: ['glucose', 'cholesterol', 'a1c', 'ldl', 'hdl', 'inr'] },
    { category: 'Medications', fields: ['current', 'past', 'dosage', 'frequency'] },
    { category: 'Risk', fields: ['riskScore', 'riskLevel', 'comorbidities', 'redFlags'] },
  ]);
  const [newCondition, setNewCondition] = useState<FilterCondition>({
    field: '',
    operator: '=',
    value: ''
  });
  const [newTag, setNewTag] = useState('');
  const [presetColor, setPresetColor] = useState('#3B82F6');

  useEffect(() => {
    loadPresets();
  }, [userId, department]);

  const loadPresets = async () => {
    try {
      const filterService = FilterService.getInstance();
      const availablePresets = await filterService.getPresets(userId, department);
      setPresets(availablePresets);
    } catch (error) {
      console.error('Error loading presets:', error);
    }
  };

  const handlePresetSelect = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      onFilterChange(preset.filters);
      
      // If the preset has complex conditions, load them into the state
      if (preset.filters.complexConditions) {
        setComplexConditions(preset.filters.complexConditions);
      }
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      const filterService = FilterService.getInstance();
      const results = await filterService.searchPatients(searchQuery, department, role);
      onSearch(results);
    } catch (error) {
      console.error('Error searching patients:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSavePreset = async () => {
    try {
      const filterService = FilterService.getInstance();
      
      // Prepare the preset with complex conditions if they exist
      const presetToSave = {
        ...newPreset,
        filters: {
          ...newPreset.filters,
          complexConditions: complexConditions.conditions.length > 0 ? complexConditions : undefined
        },
        createdBy: userId,
        department,
        color: presetColor
      };
      
      const savedPreset = await filterService.savePreset(presetToSave as Omit<FilterPreset, 'id' | 'lastUsed'>);

      setPresets([...presets, savedPreset]);
      setShowNewPresetForm(false);
      setNewPreset({
        name: '',
        description: '',
        filters: {},
        isShared: false,
        color: '#3B82F6',
        tags: []
      });
      setComplexConditions({ operator: 'AND', conditions: [] });
    } catch (error) {
      console.error('Error saving preset:', error);
    }
  };

  const handleEditPreset = (preset: FilterPreset) => {
    setEditingPreset(preset);
    
    // Load preset data into form state
    setNewPreset({
      name: preset.name,
      description: preset.description,
      filters: preset.filters,
      isShared: preset.isShared,
      color: preset.color || '#3B82F6',
      tags: preset.tags || []
    });
    
    setPresetColor(preset.color || '#3B82F6');
    
    // If the preset has complex conditions, load them
    if (preset.filters.complexConditions) {
      setComplexConditions(preset.filters.complexConditions);
    } else {
      setComplexConditions({ operator: 'AND', conditions: [] });
    }
    
    setShowNewPresetForm(true);
  };

  const handleDeletePreset = async (presetId: string) => {
    try {
      const filterService = FilterService.getInstance();
      await filterService.deletePreset(presetId, userId);
      setPresets(presets.filter(p => p.id !== presetId));
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting preset:', error);
    }
  };

  const handleUpdatePreset = async () => {
    if (!editingPreset) return;

    try {
      const filterService = FilterService.getInstance();
      
      // Prepare the updated filters with complex conditions
      const updatedFilters = {
        ...newPreset.filters,
        complexConditions: complexConditions.conditions.length > 0 ? complexConditions : undefined
      };
      
      const updatedPreset = await filterService.updatePreset(
        editingPreset.id,
        {
          name: newPreset.name,
          description: newPreset.description,
          filters: updatedFilters,
          isShared: newPreset.isShared,
          color: presetColor,
          tags: newPreset.tags
        },
        userId
      );

      setPresets(presets.map(p => p.id === updatedPreset.id ? updatedPreset : p));
      setShowNewPresetForm(false);
      setEditingPreset(null);
      setNewPreset({
        name: '',
        description: '',
        filters: {},
        isShared: false,
        color: '#3B82F6',
        tags: []
      });
      setComplexConditions({ operator: 'AND', conditions: [] });
    } catch (error) {
      console.error('Error updating preset:', error);
    }
  };
  
  // Add a new condition to the complex conditions
  const handleAddCondition = () => {
    if (!newCondition.field || !newCondition.operator) return;
    
    setComplexConditions({
      ...complexConditions,
      conditions: [...complexConditions.conditions, { ...newCondition }]
    });
    
    // Reset form for next condition
    setNewCondition({
      field: '',
      operator: '=',
      value: ''
    });
  };
  
  // Remove a condition from the complex conditions
  const handleRemoveCondition = (index: number) => {
    const updatedConditions = [...complexConditions.conditions];
    updatedConditions.splice(index, 1);
    setComplexConditions({
      ...complexConditions,
      conditions: updatedConditions
    });
  };
  
  // Change the operator (AND/OR/NOT) for the condition group
  const handleOperatorChange = (operator: FilterOperator) => {
    setComplexConditions({
      ...complexConditions,
      operator
    });
  };
  
  // Add a tag to the preset
  const handleAddTag = () => {
    if (!newTag.trim()) return;
    setNewPreset({
      ...newPreset,
      tags: [...(newPreset.tags || []), newTag.trim()]
    });
    setNewTag('');
  };
  
  // Remove a tag from the preset
  const handleRemoveTag = (tagToRemove: string) => {
    setNewPreset({
      ...newPreset,
      tags: newPreset.tags?.filter(tag => tag !== tagToRemove)
    });
  };
  
  // Render visualization of complex filter conditions
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
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patients using natural language..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Filter Presets */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Filter Presets</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowConditionBuilder(!showConditionBuilder)}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              {showConditionBuilder ? 'Hide Condition Builder' : 'Condition Builder'}
            </button>
            <button
              onClick={() => {
                setEditingPreset(null);
                setNewPreset({
                  name: '',
                  description: '',
                  filters: {},
                  isShared: false,
                  color: '#3B82F6',
                  tags: []
                });
                setComplexConditions({ operator: 'AND', conditions: [] });
                setShowNewPresetForm(true);
              }}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              New Preset
            </button>
          </div>
        </div>

        {/* Condition Builder */}
        {showConditionBuilder && (
          <div className="mb-6 p-4 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-medium mb-3">Build Complex Conditions</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Group Operator</label>
              <div className="flex space-x-4">
                {(['AND', 'OR', 'NOT'] as FilterOperator[]).map(op => (
                  <button
                    key={op}
                    onClick={() => handleOperatorChange(op)}
                    className={`px-3 py-1 rounded-md ${
                      complexConditions.operator === op 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {op}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Field</label>
                <select 
                  value={newCondition.field}
                  onChange={(e) => setNewCondition({ ...newCondition, field: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                  <option value="">Select field</option>
                  {availableFields.map(category => (
                    <optgroup key={category.category} label={category.category}>
                      {category.fields.map(field => (
                        <option key={`${category.category}.${field}`} value={`${category.category.toLowerCase()}.${field}`}>
                          {field}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
                <select 
                  value={newCondition.operator}
                  onChange={(e) => setNewCondition({ 
                    ...newCondition, 
                    operator: e.target.value as ComparisonOperator 
                  })}
                  className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                  <option value="=">=</option>
                  <option value="!=">!=</option>
                  <option value=">">{">"}</option>
                  <option value="<">{"<"}</option>
                  <option value=">=">{">="}</option>
                  <option value="<=">{"<="}</option>
                  <option value="CONTAINS">Contains</option>
                  <option value="STARTS_WITH">Starts with</option>
                  <option value="ENDS_WITH">Ends with</option>
                  <option value="IN">In list</option>
                  <option value="NOT_IN">Not in list</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                <input 
                  type="text"
                  value={
                    Array.isArray(newCondition.value) 
                      ? newCondition.value.join(', ') 
                      : newCondition.value
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    let formattedValue = value;
                    
                    // Handle list operators
                    if (newCondition.operator === 'IN' || newCondition.operator === 'NOT_IN') {
                      formattedValue = value.split(',').map(v => v.trim());
                    }
                    
                    setNewCondition({ ...newCondition, value: formattedValue });
                  }}
                  className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="Enter value"
                />
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={handleAddCondition}
                  disabled={!newCondition.field || !newCondition.operator}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  Add Condition
                </button>
              </div>
            </div>
            
            {/* Current Conditions Display */}
            {complexConditions.conditions.length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-md font-medium mb-2">Current Conditions</h4>
                {renderFilterVisualization(complexConditions)}
                
                <div className="mt-4">
                  <h4 className="text-md font-medium mb-2">Conditions List</h4>
                  {complexConditions.conditions.map((condition, index) => {
                    if ('field' in condition) {
                      const { field, operator, value } = condition;
                      return (
                        <div key={index} className="flex items-center justify-between py-1 px-2 mb-1 bg-white rounded border border-gray-200">
                          <span>
                            {field} {operator} {Array.isArray(value) ? value.join(', ') : value}
                          </span>
                          <button
                            onClick={() => handleRemoveCondition(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className={`p-4 rounded-lg border-l-4 cursor-pointer transition-colors ${
                selectedPreset === preset.id
                  ? 'border-blue-500 bg-blue-50'
                  : `border-l-4 hover:border-blue-300`
              }`}
              style={{ borderLeftColor: preset.color || '#3B82F6' }}
            >
              <div onClick={() => handlePresetSelect(preset.id)}>
                <h3 className="font-medium">{preset.name}</h3>
                {preset.description && (
                  <p className="text-sm text-gray-500 mt-1">{preset.description}</p>
                )}
                <div className="mt-2 text-sm text-gray-600">
                  <div>Created by: {preset.createdBy}</div>
                  <div>Last used: {preset.lastUsed.toLocaleDateString()}</div>
                  {preset.department && (
                    <div>Department: {preset.department}</div>
                  )}
                </div>
                
                {/* Tags */}
                {preset.tags && preset.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {preset.tags.map(tag => (
                      <span 
                        key={tag} 
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Condition visualizer preview (if complex conditions exist) */}
                {preset.filters.complexConditions && preset.filters.complexConditions.conditions.length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    <p>{preset.filters.complexConditions.conditions.length} conditions with {preset.filters.complexConditions.operator} operator</p>
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => handleEditPreset(preset)}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(preset.id)}
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New/Edit Preset Form */}
      {showNewPresetForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {editingPreset ? 'Edit Filter Preset' : 'Create New Filter Preset'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={newPreset.name}
                  onChange={(e) => setNewPreset({ ...newPreset, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newPreset.description}
                  onChange={(e) => setNewPreset({ ...newPreset, description: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>
              
              {/* Color Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Color</label>
                <div className="flex items-center mt-1">
                  <input
                    type="color"
                    value={presetColor}
                    onChange={(e) => setPresetColor(e.target.value)}
                    className="h-10 w-10 rounded-md border border-gray-300 cursor-pointer"
                  />
                  <span className="ml-2 text-sm text-gray-500">{presetColor}</span>
                </div>
              </div>
              
              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Tags</label>
                <div className="flex mt-1">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="block w-full border border-gray-300 rounded-l-md shadow-sm p-2"
                    placeholder="Add a tag"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
                {newPreset.tags && newPreset.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newPreset.tags.map(tag => (
                      <span 
                        key={tag} 
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {tag}
                        <button
                          type="button"
                          className="ml-1.5 text-blue-400 hover:text-blue-600"
                          onClick={() => handleRemoveTag(tag)}
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isShared"
                  checked={newPreset.isShared}
                  onChange={(e) => setNewPreset({ ...newPreset, isShared: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isShared" className="ml-2 block text-sm text-gray-700">
                  Share with department
                </label>
              </div>
              
              {/* Complex Conditions Display */}
              {complexConditions.conditions.length > 0 && (
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h3 className="text-md font-medium mb-2">Complex Conditions</h3>
                  {renderFilterVisualization(complexConditions)}
                </div>
              )}
              
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowNewPresetForm(false);
                    setEditingPreset(null);
                    setNewPreset({
                      name: '',
                      description: '',
                      filters: {},
                      isShared: false,
                      color: '#3B82F6',
                      tags: []
                    });
                    setComplexConditions({ operator: 'AND', conditions: [] });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={editingPreset ? handleUpdatePreset : handleSavePreset}
                  disabled={!newPreset.name}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {editingPreset ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Confirm Delete</h2>
            <p className="mb-4">Are you sure you want to delete this preset? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePreset(showDeleteConfirm)}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 