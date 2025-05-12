'use client';

import React from 'react';
import Link from 'next/link';
import { useConfig } from '../../lib/config/ConfigContext';

export default function ConfigDemoPage() {
  const { config, environment, isDev, isProd, updateFeatures } = useConfig();
  
  const toggleFeature = (feature: string) => {
    updateFeatures({
      [feature]: !config.features[feature as keyof typeof config.features]
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Configuration System Demo</h1>
        <p className="text-gray-600 mb-4">
          This page demonstrates the environment configuration system
        </p>
        <Link 
          href="/"
          className="text-blue-600 hover:underline"
        >
          ← Back to Home
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Current Configuration</h2>
          
          <div className="mb-4">
            <h3 className="font-medium">Environment: <span className="text-blue-600">{environment}</span></h3>
            <p className="text-sm text-gray-500">
              {isDev ? 'Development mode is active' : isProd ? 'Production mode is active' : 'Staging mode is active'}
            </p>
          </div>
          
          <div className="mb-4">
            <h3 className="font-medium mb-2">App Settings</h3>
            <ul className="text-sm space-y-1">
              <li>Name: {config.app.NAME}</li>
              <li>URL: {config.app.URL}</li>
              <li>Debug Mode: {config.app.DEBUG_MODE ? 'Enabled' : 'Disabled'}</li>
              <li>Log Level: {config.app.LOG_LEVEL}</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Feature Flags</h3>
            <ul className="space-y-2">
              {Object.entries(config.features).map(([feature, enabled]) => (
                <li key={feature} className="flex items-center justify-between">
                  <span>{feature}</span>
                  <button
                    onClick={() => toggleFeature(feature)} 
                    className={`px-3 py-1 rounded text-white text-sm ${enabled ? 'bg-green-500' : 'bg-gray-400'}`}
                  >
                    {enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">How It Works</h2>
          <p className="mb-4">
            This configuration system allows you to:
          </p>
          <ul className="list-disc pl-5 space-y-2 mb-4">
            <li>Manage environment-specific settings</li>
            <li>Toggle features on/off without code changes</li>
            <li>Access configuration values anywhere in your app</li>
            <li>Maintain type safety for all config values</li>
          </ul>
          <p className="text-sm text-gray-600">
            Try toggling some feature flags to see how the system works.
            Changes take effect immediately without reloading the page.
          </p>
        </div>
      </div>
    </div>
  );
} 