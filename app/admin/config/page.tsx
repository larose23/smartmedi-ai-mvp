'use client';

import React from 'react';
import ConfigPanel from '../../components/ConfigPanel';
import { ConfigContext } from '../../../../lib/config/ConfigContext';
import useConfig from '../../../../lib/config/useConfig';
import Link from 'next/link';

export default function ConfigurationPage() {
  const { config, environment } = useConfig();

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">System Configuration</h1>
        <Link 
          href="/admin" 
          className="px-4 py-2 bg-gray-100 rounded-md text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Back to Admin
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold mb-4">Environment Configuration</h2>
            <p className="mb-4 text-gray-600">
              Current environment: <span className="font-semibold">{environment}</span>
            </p>
            
            <div className="mb-6">
              <h3 className="text-md font-medium mb-2">Feature Management</h3>
              <ConfigPanel className="mt-2" />
            </div>
            
            <div className="border-t pt-4">
              <h3 className="text-md font-medium mb-2">Deployment Information</h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="flex justify-between py-1 border-b">
                  <dt className="text-gray-500">App Name</dt>
                  <dd>{config.app.NAME}</dd>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <dt className="text-gray-500">Debug Mode</dt>
                  <dd>{config.app.DEBUG_MODE ? 'Enabled' : 'Disabled'}</dd>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <dt className="text-gray-500">Log Level</dt>
                  <dd>{config.app.LOG_LEVEL}</dd>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <dt className="text-gray-500">App URL</dt>
                  <dd className="truncate max-w-[180px]">{config.app.URL}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
        
        <div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold mb-4">Configuration Help</h2>
            <div className="text-sm space-y-3 text-gray-600">
              <p>
                This page allows you to manage environment settings and feature flags for the SmartMedi AI platform.
              </p>
              <p>
                Changes to feature flags will take effect immediately without redeploying the application.
              </p>
              <p className="font-medium text-yellow-600">
                Note: In production environments, feature flag changes should be performed cautiously and tested thoroughly.
              </p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md mt-6">
            <h2 className="text-lg font-semibold mb-4">Documentation</h2>
            <ul className="text-sm space-y-2">
              <li>
                <Link 
                  href="/docs/ENVIRONMENT_CONFIG.md" 
                  className="text-blue-600 hover:underline"
                  target="_blank"
                >
                  Environment Configuration Guide
                </Link>
              </li>
              <li>
                <Link 
                  href="https://nextjs.org/docs/app/building-your-application/configuring/environment-variables" 
                  className="text-blue-600 hover:underline"
                  target="_blank"
                >
                  Next.js Environment Variables
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}