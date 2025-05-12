'use client';

import React from 'react';
import { useFeatureFlag } from '@/lib/config/ConfigContext';

/**
 * AITriageButton Component - Demonstrates how to use the useFeatureFlag hook
 * Only shows the AI Triage button if the feature is enabled
 */
export default function AITriageButton() {
  // Use the useFeatureFlag hook to check if a specific feature is enabled
  const isAITriageEnabled = useFeatureFlag('AI_TRIAGE');
  
  // Early return if the feature is disabled
  if (!isAITriageEnabled) {
    return (
      <button 
        className="px-4 py-2 bg-gray-100 text-gray-400 rounded cursor-not-allowed" 
        disabled
      >
        AI Triage Unavailable
      </button>
    );
  }
  
  // Only called if AI Triage is enabled
  const handleAITriage = () => {
    console.log('Starting AI Triage process...');
    // AI Triage functionality would be implemented here
  };
  
  return (
    <button 
      onClick={handleAITriage}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
    >
      Start AI Triage
    </button>
  );
} 