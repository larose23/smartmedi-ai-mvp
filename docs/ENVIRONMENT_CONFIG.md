# SmartMedi AI Environment Configuration System

This document describes the environment configuration system for SmartMedi AI, including environment variables, feature flags, and runtime configuration management.

## Overview

The SmartMedi AI platform uses a robust environment configuration system to support:

1. **Multiple Deployment Environments**: Development, Staging, Production
2. **Feature Flags**: Gradual rollout of features and A/B testing
3. **Runtime Configuration**: Settings that can be changed without redeploying the application

## Environment Variables

### Required Environment Variables

Create a `.env.local` file for your local development environment with the following variables:

```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI (for AI Triage feature)
OPENAI_API_KEY=your_openai_api_key

# Application Configuration
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3009
```

### Deployment-Specific Environments

For different environments, create the following files:
- `.env.development` - Local development settings
- `.env.staging` - Staging environment settings
- `.env.production` - Production environment settings

## Feature Flags

Feature flags allow enabling or disabling features without modifying code. The following feature flags are available:

| Flag | Description | Default |
|------|-------------|---------|
| AI_TRIAGE | Enables AI-powered patient triage | false |
| APPOINTMENT_BOOKING | Enables appointment booking functionality | true |
| ARCHIVE_SYSTEM | Enables the patient archiving system | true |
| NOTIFICATIONS | Enables the notification system | true |

### Using Feature Flags in Code

#### Conditional Rendering with Components

```tsx
import FeatureFlag from '@/components/FeatureFlag';

// Simple usage
<FeatureFlag feature="AI_TRIAGE">
  <AITriageComponent />
</FeatureFlag>

// With fallback
<FeatureFlag 
  feature="AI_TRIAGE" 
  fallback={<StandardTriageComponent />}
>
  <AITriageComponent />
</FeatureFlag>
```

#### Using Feature Flags in Business Logic

```tsx
import { useFeatureFlag } from '@/lib/config/ConfigContext';

function MyComponent() {
  const isAITriageEnabled = useFeatureFlag('AI_TRIAGE');
  
  // Use in conditional logic
  const handlePatientTriage = () => {
    if (isAITriageEnabled) {
      // Use AI triage
    } else {
      // Use standard triage
    }
  };
}
```

## Runtime Configuration

The configuration system supports runtime changes to feature flags and other settings. To access and modify configuration:

```tsx
import { useConfig } from '@/lib/config/ConfigContext';

function MyComponent() {
  const { config, updateFeatures, environment, isDev } = useConfig();
  
  // Toggle a feature flag at runtime
  const enableAITriage = () => {
    updateFeatures({
      AI_TRIAGE: true
    });
  };
}
```

## Configuration Admin Panel

A configuration panel is available for administrators to toggle feature flags at runtime. Add it to your admin pages:

```tsx
import ConfigPanel from '@/app/components/ConfigPanel';

function AdminPage() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <ConfigPanel className="mt-4" />
      {/* Other admin content */}
    </div>
  );
}
```

The panel is only fully functional in development and staging environments for security reasons.

## Environment-Specific Behavior

You can check the current environment in your code:

```tsx
import { useConfig } from '@/lib/config/ConfigContext';

function MyComponent() {
  const { isDev, isProd } = useConfig();
  
  // Conditional logic based on environment
  if (isDev) {
    // Only in development
  }
  
  if (isProd) {
    // Only in production
  }
}
```

## Security Considerations

- Never expose sensitive keys or tokens in `NEXT_PUBLIC_` variables
- Use environment-specific settings for security features
- In production, feature flags should be managed by authorized personnel only

## Best Practices

1. Always use the configuration system instead of direct `process.env` access
2. Use feature flags for any feature that may need to be toggled
3. Test your application with different feature flag combinations
4. Document all environment variables and feature flags

## Troubleshooting

If you encounter configuration issues:

1. Verify your `.env` files are properly set up
2. Check that the `ConfigProvider` is properly wrapping your application
3. Restart the development server to load new environment variables
4. Check the browser console for any configuration errors 