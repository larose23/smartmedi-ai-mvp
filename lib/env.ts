import { z } from 'zod';

const envSchema = z.object({
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  // Application Configuration
  NEXT_PUBLIC_APP_ENV: z.enum(['development', 'staging', 'production']),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().min(1),

  // Feature Flags
  NEXT_PUBLIC_FEATURE_AI_TRIAGE: z.boolean(),
  NEXT_PUBLIC_FEATURE_APPOINTMENT_BOOKING: z.boolean(),
  NEXT_PUBLIC_FEATURE_ARCHIVE_SYSTEM: z.boolean(),
  NEXT_PUBLIC_FEATURE_NOTIFICATIONS: z.boolean(),

  // Debug Settings
  NEXT_PUBLIC_DEBUG_MODE: z.boolean(),
  NEXT_PUBLIC_LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']),

  // Security Settings
  SESSION_SECURE: z.boolean(),
  SESSION_HTTP_ONLY: z.boolean(),

  // Monitoring
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_DATADOG_APPLICATION_ID: z.string().optional(),
  NEXT_PUBLIC_DATADOG_CLIENT_TOKEN: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SENTRY_DSN',
  'NEXT_PUBLIC_APP_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
] as const;

type EnvVar = typeof requiredEnvVars[number];

interface ValidationResult {
  isValid: boolean;
  missing: EnvVar[];
  errors: string[];
}

export function validateEnv(): ValidationResult {
  const missing: EnvVar[] = [];
  const errors: string[] = [];

  // Check for missing variables
  requiredEnvVars.forEach((key) => {
    if (!process.env[key]) {
      missing.push(key);
      errors.push(`Missing required environment variable: ${key}`);
    }
  });

  // Validate Supabase URL format
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL');
  }

  // Validate app URL format
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl && !appUrl.startsWith('http')) {
    errors.push('NEXT_PUBLIC_APP_URL must be a valid URL');
  }

  return {
    isValid: missing.length === 0 && errors.length === 0,
    missing,
    errors
  };
}

export function validateEnvOrThrow(): void {
  const result = validateEnv();
  if (!result.isValid) {
    throw new Error(
      `Environment validation failed:\n${result.errors.join('\n')}`
    );
  }
}

// Helper to get typed environment variables
export function getEnvVar(key: EnvVar): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}

// Type-safe environment variable access
export const env = {
  supabase: {
    url: getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    serviceRoleKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY')
  },
  sentry: {
    dsn: getEnvVar('NEXT_PUBLIC_SENTRY_DSN')
  },
  app: {
    url: getEnvVar('NEXT_PUBLIC_APP_URL')
  }
} as const; 