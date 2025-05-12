'use client';

import React from 'react';
import { useConfig } from '@/lib/config/ConfigContext';

/**
 * ConfigInfo Component - Demonstrates how to use the useConfig hook
 * Shows current environment information and config values
 */
export default function ConfigInfo() {
  // Use the useConfig hook to access configuration values
  const { config, environment, isDev, isProd } = useConfig();
  
  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold mb-3">Configuration Info</h2>
      
      <div className="grid gap-2 text-sm">
        <div className="flex justify-between">
          <span className="font-medium">Environment:</span>
          <span className={`px-2 py-0.5 rounded ${
            isDev ? 'bg-blue-100 text-blue-800' : 
            isProd ? 'bg-green-100 text-green-800' : 
            'bg-purple-100 text-purple-800'
          }`}>
            {environment}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-medium">App Name:</span>
          <span>{config.app.NAME}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-medium">Debug Mode:</span>
          <span>{config.app.DEBUG_MODE ? 'Enabled' : 'Disabled'}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-medium">Log Level:</span>
          <span>{config.app.LOG_LEVEL}</span>
        </div>
      </div>
      
      <div className="mt-4">
        <h3 className="font-medium mb-2">Feature Status</h3>
        <ul className="space-y-1 text-sm">
          {Object.entries(config.features).map(([feature, enabled]) => (
            <li key={feature} className="flex justify-between">
              <span>{feature}</span>
              <span className={`px-2 py-0.5 rounded ${
                enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {enabled ? 'Enabled' : 'Disabled'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 