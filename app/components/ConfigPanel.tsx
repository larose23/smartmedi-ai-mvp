import React, { useState } from 'react';
import { useConfig } from '@/lib/config/ConfigContext';
import { FeatureFlags } from '@/lib/config';

interface ConfigPanelProps {
  className?: string;
}

export default function ConfigPanel({ className = '' }: ConfigPanelProps) {
  const { config, updateFeatures, isDev, environment } = useConfig();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Create toggleable state for each feature flag
  const [featureState, setFeatureState] = useState<FeatureFlags>({
    ...config.features
  });
  
  // Handle feature flag toggle
  const handleFeatureToggle = (feature: keyof FeatureFlags) => {
    const newValue = !featureState[feature];
    
    // Update local state
    setFeatureState(prev => ({
      ...prev,
      [feature]: newValue
    }));
    
    // Update global config
    updateFeatures({
      [feature]: newValue
    });
  };
  
  // If not in development mode, only show limited info
  if (!isDev && environment !== 'staging') {
    return (
      <div className={`rounded-md bg-gray-100 p-2 text-xs ${className}`}>
        <p className="font-semibold">Environment: {environment}</p>
      </div>
    );
  }
  
  return (
    <div className={`rounded-md border border-gray-200 bg-white shadow-sm ${className}`}>
      <div 
        className="flex items-center justify-between px-4 py-3 cursor-pointer bg-gray-50 rounded-t-md"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="font-semibold">Configuration Panel</h3>
        <span className="text-xs bg-blue-100 text-blue-800 py-1 px-2 rounded">
          {environment}
        </span>
        <button className="text-gray-500">
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>
      
      {isExpanded && (
        <div className="p-4 space-y-4">
          <div>
            <h4 className="font-medium mb-2">Feature Flags</h4>
            <div className="space-y-2">
              {Object.entries(featureState).map(([feature, enabled]) => (
                <div key={feature} className="flex items-center justify-between">
                  <span className="text-sm">{feature}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={enabled}
                      onChange={() => handleFeatureToggle(feature as keyof FeatureFlags)}
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Application Configuration</h4>
            <div className="bg-gray-50 p-3 rounded text-xs font-mono whitespace-pre overflow-auto max-h-40">
              {JSON.stringify(config.app, null, 2)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 