import * as Sentry from '@sentry/nextjs';
import { datadogRum } from '@datadog/browser-rum';
import { datadogLogs } from '@datadog/browser-logs';

// Initialize Sentry
export const initSentry = () => {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 1.0,
      integrations: [
        new Sentry.BrowserTracing(),
        new Sentry.Replay(),
      ],
    });
  }
};

// Initialize Datadog RUM
export const initDatadogRUM = () => {
  if (process.env.NEXT_PUBLIC_DATADOG_APPLICATION_ID && process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN) {
    datadogRum.init({
      applicationId: process.env.NEXT_PUBLIC_DATADOG_APPLICATION_ID,
      clientToken: process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN,
      site: 'datadoghq.com',
      service: 'smartmedi-ai',
      env: process.env.NODE_ENV,
      sessionSampleRate: 100,
      sessionReplaySampleRate: 20,
      trackUserInteractions: true,
      trackResources: true,
      trackLongTasks: true,
      defaultPrivacyLevel: 'mask-user-input',
    });
  }
};

// Initialize Datadog Logs
export const initDatadogLogs = () => {
  if (process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN) {
    datadogLogs.init({
      clientToken: process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN,
      site: 'datadoghq.com',
      forwardErrorsToLogs: true,
      sampleRate: 100,
    });
  }
};

// Performance monitoring
export const trackPerformance = (metric: string, value: number) => {
  if (process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN) {
    datadogRum.addTiming(metric, value);
  }
};

// Error tracking
export const trackError = (error: Error, context?: Record<string, any>) => {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
    });
  }
  if (process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN) {
    datadogLogs.logger.error('Error occurred', {
      error: error.message,
      stack: error.stack,
      ...context,
    });
  }
};

// Status transition monitoring
export const trackStatusTransition = (
  fromStatus: string,
  toStatus: string,
  success: boolean,
  metadata?: Record<string, any>
) => {
  if (process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN) {
    datadogLogs.logger.info('Status transition', {
      fromStatus,
      toStatus,
      success,
      ...metadata,
    });
  }
};

// Archive success rate tracking
export const trackArchiveSuccess = (
  patientId: string,
  success: boolean,
  metadata?: Record<string, any>
) => {
  if (process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN) {
    datadogLogs.logger.info('Archive operation', {
      patientId,
      success,
      ...metadata,
    });
  }
};

// SLO monitoring
export const trackSLO = (metric: string, value: number) => {
  if (value > 300 && process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN) {
    datadogLogs.logger.warn('SLO violation', {
      metric,
      value,
      threshold: 300,
    });
  }
}; 