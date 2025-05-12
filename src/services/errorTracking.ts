import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

// Initialize Sentry
export const initializeErrorTracking = () => {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    integrations: [new BrowserTracing()],
    tracesSampleRate: 1.0,
    environment: process.env.NODE_ENV,
    beforeSend(event) {
      // Don't send events in development
      if (process.env.NODE_ENV === 'development') {
        return null;
      }
      return event;
    },
  });

  // Set up global error handlers
  window.addEventListener('error', (event) => {
    captureException(event.error || new Error(event.message), {
      type: 'unhandledError',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    captureException(event.reason || new Error('Unhandled Promise Rejection'), {
      type: 'unhandledRejection',
    });
  });
};

// Custom error boundary component
export const ErrorBoundary = Sentry.ErrorBoundary;

// Error tracking functions
export const captureException = (error: Error, context?: Record<string, any>) => {
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    Sentry.captureException(error);
  });
};

export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  Sentry.captureMessage(message, level);
};

// Performance monitoring
export const startTransaction = (name: string, op: string) => {
  return Sentry.startTransaction({
    name,
    op,
  });
};

// User context
export const setUserContext = (user: { id: string; email?: string; username?: string }) => {
  Sentry.setUser(user);
};

// Clear user context
export const clearUserContext = () => {
  Sentry.setUser(null);
};

// Add custom tags
export const setTag = (key: string, value: string) => {
  Sentry.setTag(key, value);
};

// Add custom context
export const setContext = (name: string, context: Record<string, any>) => {
  Sentry.setContext(name, context);
}; 