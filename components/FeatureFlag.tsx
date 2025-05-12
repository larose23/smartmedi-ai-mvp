import React, { ReactNode } from 'react';
import { useFeatureFlag } from '@/lib/config/ConfigContext';
import { FeatureFlags } from '@/lib/config';

interface FeatureFlagProps {
  feature: keyof FeatureFlags;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * FeatureFlag component - Conditionally renders content based on feature flags
 * 
 * Usage:
 * <FeatureFlag feature="AI_TRIAGE">
 *   <AITriageComponent />
 * </FeatureFlag>
 * 
 * With fallback:
 * <FeatureFlag feature="AI_TRIAGE" fallback={<LegacyTriageComponent />}>
 *   <AITriageComponent />
 * </FeatureFlag>
 */
export default function FeatureFlag({ feature, children, fallback = null }: FeatureFlagProps) {
  const isEnabled = useFeatureFlag(feature);
  
  if (isEnabled) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

/**
 * FeatureFlags component - Conditionally renders content based on multiple feature flags
 * All features must be enabled for the content to be shown
 * 
 * Usage:
 * <FeatureFlags features={['AI_TRIAGE', 'NOTIFICATIONS']}>
 *   <ComponentRequiringBothFeatures />
 * </FeatureFlags>
 */
export function FeatureFlags({ 
  features, 
  children, 
  fallback = null 
}: { 
  features: Array<keyof FeatureFlags>; 
  children: ReactNode; 
  fallback?: ReactNode;
}) {
  const { isFeatureEnabled } = useConfig();
  const allFeaturesEnabled = features.every(feature => isFeatureEnabled(feature));
  
  if (allFeaturesEnabled) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

// Import here to avoid circular dependency issues
import { useConfig } from '@/lib/config/ConfigContext'; 