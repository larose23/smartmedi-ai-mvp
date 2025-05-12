# Monitoring System Setup Guide

This guide will help you set up the monitoring system for SmartMedi AI.

## Prerequisites

1. A Supabase account and project
2. A Sentry account
3. A Datadog account
4. Node.js and npm installed

## Step 1: Install Dependencies

Run the following command in your project root:

```bash
npm install @sentry/nextjs @datadog/browser-rum @datadog/browser-logs recharts @supabase/supabase-js
```

## Step 2: Set Up Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Monitoring Configuration
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
NEXT_PUBLIC_DATADOG_APPLICATION_ID=your_datadog_app_id
NEXT_PUBLIC_DATADOG_CLIENT_TOKEN=your_datadog_client_token
```

## Step 3: Set Up Database Tables

1. Go to your Supabase project dashboard
2. Open the SQL editor
3. Copy and paste the contents of `supabase/migrations/20240320000000_create_monitoring_tables.sql`
4. Run the SQL commands

## Step 4: Set Up Sentry

1. Go to [Sentry.io](https://sentry.io)
2. Create a new project
3. Choose "Next.js" as your platform
4. Follow the setup instructions to get your DSN
5. Add the DSN to your `.env.local` file

## Step 5: Set Up Datadog

1. Go to [Datadog](https://www.datadoghq.com)
2. Create a new application
3. Choose "Browser" as your platform
4. Get your Application ID and Client Token
5. Add them to your `.env.local` file

## Step 6: Using the Monitoring System

### Accessing the Dashboard

Visit `/monitoring` in your application to access the monitoring dashboard.

### Tracking Events

Use the following functions to track events in your code:

```typescript
import { trackStatusTransition, trackArchiveOperation } from '../lib/utils/statusTracking';

// Track a status transition
await trackStatusTransition('pending', 'processing', true, { patientId: '123' });

// Track an archive operation
await trackArchiveOperation('123', true);
```

### Monitoring Features

The monitoring system provides:

1. Real-time status transition tracking
2. Archive success rate monitoring
3. Error tracking and reporting
4. Performance monitoring
5. Automatic data refresh every minute

## Troubleshooting

If you encounter any issues:

1. Check that all environment variables are set correctly
2. Verify that the database tables were created successfully
3. Check the browser console for any errors
4. Verify that Sentry and Datadog are receiving events

## Support

If you need help, please:

1. Check the error logs in Sentry
2. Review the performance metrics in Datadog
3. Contact the development team 