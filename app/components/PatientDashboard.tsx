'use client';

import React from 'react';
import FeatureFlag, { FeatureFlags } from '@/components/FeatureFlag';
import AITriageButton from './AITriageButton';

/**
 * PatientDashboard Component - Demonstrates how to use the FeatureFlag component
 * Shows different components based on feature flags
 */
export default function PatientDashboard() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Patient Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic patient information - always shown */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h2 className="text-lg font-medium mb-3">Patient Information</h2>
          <p>This section is always visible regardless of feature flags.</p>
        </div>
        
        {/* Using FeatureFlag for conditional rendering */}
        <FeatureFlag feature="APPOINTMENT_BOOKING">
          {/* This content only shows if APPOINTMENT_BOOKING is enabled */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h2 className="text-lg font-medium mb-3">Appointment Booking</h2>
            <p>This feature is enabled and available.</p>
            <button className="mt-2 px-4 py-2 bg-green-600 text-white rounded">
              Book Appointment
            </button>
          </div>
        </FeatureFlag>
        
        {/* Using FeatureFlag with a fallback */}
        <FeatureFlag 
          feature="AI_TRIAGE" 
          fallback={
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-medium mb-3">Manual Triage</h2>
              <p>AI Triage is currently disabled. Using standard triage system.</p>
              <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded">
                Start Manual Triage
              </button>
            </div>
          }
        >
          <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-200">
            <h2 className="text-lg font-medium mb-3">AI Triage System</h2>
            <p>Our advanced AI system will help prioritize your case.</p>
            <AITriageButton />
          </div>
        </FeatureFlag>
        
        {/* Using FeatureFlags to check multiple feature flags */}
        <FeatureFlags 
          features={['ARCHIVE_SYSTEM', 'NOTIFICATIONS']} 
          fallback={
            <div className="bg-white p-4 rounded-lg shadow-sm opacity-50">
              <h2 className="text-lg font-medium mb-3">Notifications</h2>
              <p>This feature requires both archiving and notifications to be enabled.</p>
            </div>
          }
        >
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h2 className="text-lg font-medium mb-3">Patient Archive Notifications</h2>
            <p>Get notified when your records are archived.</p>
            <div className="flex items-center mt-2">
              <input type="checkbox" id="notify" className="mr-2" />
              <label htmlFor="notify">Enable archive notifications</label>
            </div>
          </div>
        </FeatureFlags>
      </div>
    </div>
  );
} 