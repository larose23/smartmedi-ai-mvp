import * as Sentry from '@sentry/nextjs';
import { env } from './env';

// Initialize Sentry
Sentry.init({
  dsn: env.sentry.dsn,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === 'production',
  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: ['localhost', env.app.url],
    }),
    new Sentry.Replay(),
  ],
  beforeSend(event) {
    // Don't send events in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('Sentry event:', event);
      return null;
    }
    return event;
  },
});

// Helper to capture errors with context
export function captureError(error: Error, context?: Record<string, any>) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.withScope((scope) => {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }
      Sentry.captureException(error);
    });
  } else {
    console.error('Error:', error);
    if (context) {
      console.error('Context:', context);
    }
  }
}

// Helper to capture messages
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureMessage(message, level);
  } else {
    console.log(`[${level.toUpperCase()}] ${message}`);
  }
}

// Helper to set user context
export function setUserContext(user: { id: string; email?: string; name?: string }) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.setUser(user);
  } else {
    console.log('Set user context:', user);
  }
}

// Helper to clear user context
export function clearUserContext() {
  if (process.env.NODE_ENV === 'production') {
    Sentry.setUser(null);
  } else {
    console.log('Cleared user context');
  }
}

// Export Sentry for direct use if needed
export { Sentry }; 