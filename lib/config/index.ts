/**
 * Environment Configuration System for SmartMedi AI
 * 
 * This module provides centralized access to environment variables and feature flags
 * with type safety and defaults. It also supports runtime configuration updates.
 */

import { z } from 'zod';

// Environment types
export type Environment = 'development' | 'staging' | 'production';

// Feature flags schema with validation
const featureFlagsSchema = z.object({
  AI_TRIAGE: z.boolean().default(false),
  APPOINTMENT_BOOKING: z.boolean().default(true),
  ARCHIVE_SYSTEM: z.boolean().default(true),
  NOTIFICATIONS: z.boolean().default(true),
});

export type FeatureFlags = z.infer<typeof featureFlagsSchema>;

// App config schema with validation
const appConfigSchema = z.object({
  ENV: z.enum(['development', 'staging', 'production']).default('development'),
  URL: z.string().url().default('http://localhost:3009'),
  NAME: z.string().default('SmartMedi AI'),
  DEBUG_MODE: z.boolean().default(false),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'verbose']).default('info'),
});

export type AppConfig = z.infer<typeof appConfigSchema>;

// External services config schema with validation
const servicesConfigSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().optional(),
});

export type ServicesConfig = z.infer<typeof servicesConfigSchema>;

// Security config schema with validation
const securityConfigSchema = z.object({
  SESSION_SECRET: z.string().optional(),
  SESSION_SECURE: z.boolean().default(false),
  SESSION_HTTP_ONLY: z.boolean().default(true),
  AUTH_MAX_AGE: z.number().default(3600), // 1 hour
});

export type SecurityConfig = z.infer<typeof securityConfigSchema>;

// Complete config type
export interface Config {
  app: AppConfig;
  features: FeatureFlags;
  services: ServicesConfig;
  security: SecurityConfig;
}

// Default feature flags - can be overridden at runtime
const defaultFeatureFlags: FeatureFlags = {
  AI_TRIAGE: getEnvBoolean('NEXT_PUBLIC_FEATURE_AI_TRIAGE', false),
  APPOINTMENT_BOOKING: getEnvBoolean('NEXT_PUBLIC_FEATURE_APPOINTMENT_BOOKING', true),
  ARCHIVE_SYSTEM: getEnvBoolean('NEXT_PUBLIC_FEATURE_ARCHIVE_SYSTEM', true),
  NOTIFICATIONS: getEnvBoolean('NEXT_PUBLIC_FEATURE_NOTIFICATIONS', true),
};

// Helper function to parse boolean environment variables
function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
}

// Helper function to get environment variables with defaults
function getEnvString(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}

// Helper function to get environment variables as numbers
function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Initialize configuration with environment variables and defaults
const config: Config = {
  app: {
    ENV: (getEnvString('NEXT_PUBLIC_APP_ENV', 'development') as Environment) || 'development',
    URL: getEnvString('NEXT_PUBLIC_APP_URL', 'http://localhost:3009'),
    NAME: getEnvString('NEXT_PUBLIC_APP_NAME', 'SmartMedi AI'),
    DEBUG_MODE: getEnvBoolean('NEXT_PUBLIC_DEBUG_MODE', false),
    LOG_LEVEL: (getEnvString('NEXT_PUBLIC_LOG_LEVEL', 'info') as AppConfig['LOG_LEVEL']) || 'info',
  },
  features: { ...defaultFeatureFlags },
  services: {
    SUPABASE_URL: getEnvString('NEXT_PUBLIC_SUPABASE_URL', ''),
    SUPABASE_ANON_KEY: getEnvString('NEXT_PUBLIC_SUPABASE_ANON_KEY', ''),
    OPENAI_API_KEY: getEnvString('OPENAI_API_KEY'),
  },
  security: {
    SESSION_SECRET: getEnvString('SESSION_SECRET'),
    SESSION_SECURE: getEnvBoolean('SESSION_SECURE', process.env.NEXT_PUBLIC_APP_ENV === 'production'),
    SESSION_HTTP_ONLY: getEnvBoolean('SESSION_HTTP_ONLY', true),
    AUTH_MAX_AGE: getEnvNumber('AUTH_MAX_AGE', 3600),
  },
};

// Store subscribers for runtime updates
type ConfigSubscriber = (config: Config) => void;
const subscribers: ConfigSubscriber[] = [];

/**
 * Update feature flags at runtime
 * Useful for A/B testing or gradual feature rollouts
 */
export function updateFeatureFlags(newFlags: Partial<FeatureFlags>): void {
  config.features = {
    ...config.features,
    ...newFlags,
  };
  
  // Notify subscribers
  subscribers.forEach(subscriber => subscriber(config));
}

/**
 * Update app configuration at runtime
 */
export function updateAppConfig(newConfig: Partial<AppConfig>): void {
  config.app = {
    ...config.app,
    ...newConfig,
  };
  
  // Notify subscribers
  subscribers.forEach(subscriber => subscriber(config));
}

/**
 * Subscribe to configuration changes
 */
export function subscribeToConfigChanges(callback: ConfigSubscriber): () => void {
  subscribers.push(callback);
  
  // Return unsubscribe function
  return () => {
    const index = subscribers.indexOf(callback);
    if (index > -1) {
      subscribers.splice(index, 1);
    }
  };
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(featureKey: keyof FeatureFlags): boolean {
  return config.features[featureKey];
}

/**
 * Get the current environment
 */
export function getEnvironment(): Environment {
  return config.app.ENV;
}

/**
 * Check if we're in development environment
 */
export function isDevelopment(): boolean {
  return config.app.ENV === 'development';
}

/**
 * Check if we're in production environment
 */
export function isProduction(): boolean {
  return config.app.ENV === 'production';
}

/**
 * Get the complete configuration
 */
export function getConfig(): Config {
  return { ...config };
}

/**
 * Get service configuration
 */
export function getServiceConfig(): ServicesConfig {
  return { ...config.services };
}

// Export default configuration
export default config; 