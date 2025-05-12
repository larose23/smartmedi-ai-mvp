'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import config, { 
  Config,
  FeatureFlags, 
  updateFeatureFlags, 
  subscribeToConfigChanges,
  isFeatureEnabled,
  getEnvironment,
  isDevelopment,
  isProduction
} from './index';

// Context type definition
interface ConfigContextType {
  config: Config;
  updateFeatures: (newFlags: Partial<FeatureFlags>) => void;
  isFeatureEnabled: (featureKey: keyof FeatureFlags) => boolean;
  environment: string;
  isDev: boolean;
  isProd: boolean;
}

// Create the context with a default value
const ConfigContext = createContext<ConfigContextType>({
  config,
  updateFeatures: () => {},
  isFeatureEnabled: () => false,
  environment: 'development',
  isDev: true,
  isProd: false,
});

// Provider component for the configuration
export function ConfigProvider({ children }: { children: ReactNode }) {
  const [currentConfig, setCurrentConfig] = useState<Config>(config);
  
  useEffect(() => {
    // Subscribe to configuration changes
    const unsubscribe = subscribeToConfigChanges((newConfig) => {
      setCurrentConfig({ ...newConfig });
    });
    
    // Cleanup subscription
    return () => unsubscribe();
  }, []);
  
  // Update feature flags handler
  const updateFeatures = (newFlags: Partial<FeatureFlags>) => {
    updateFeatureFlags(newFlags);
  };
  
  // Create the context value
  const contextValue: ConfigContextType = {
    config: currentConfig,
    updateFeatures,
    isFeatureEnabled: (featureKey) => isFeatureEnabled(featureKey),
    environment: getEnvironment(),
    isDev: isDevelopment(),
    isProd: isProduction(),
  };
  
  return (
    <ConfigContext.Provider value={contextValue}>
      {children}
    </ConfigContext.Provider>
  );
}

// Custom hook for using the configuration
export function useConfig() {
  const context = useContext(ConfigContext);
  
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  
  return context;
}

// Custom hook for checking if a feature is enabled
export function useFeatureFlag(featureKey: keyof FeatureFlags): boolean {
  const { isFeatureEnabled } = useConfig();
  return isFeatureEnabled(featureKey);
}

// Export the context for direct usage if needed
export default ConfigContext; 