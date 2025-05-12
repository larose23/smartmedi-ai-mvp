import { useEffect, Suspense } from 'react';
import Head from 'next/head';
import StatusTransitionDashboard from '../../components/monitoring/StatusTransitionDashboard';
import ArchiveSuccessDashboard from '../../components/monitoring/ArchiveSuccessDashboard';
import LoadingState from '../../components/monitoring/LoadingState';
import ErrorBoundary from '../../components/monitoring/ErrorBoundary';
import { monitoring } from '../../lib/monitoring';

export default function MonitoringDashboard() {
  useEffect(() => {
    // Track page view
    monitoring.trackPerformance('monitoring_dashboard_load', Date.now() - performance.now());
  }, []);

  return (
    <>
      <Head>
        <title>Monitoring Dashboard - SmartMedi AI</title>
        <meta name="description" content="System monitoring and analytics dashboard" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">System Monitoring</h1>
            
            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Status Transitions</h2>
                <ErrorBoundary>
                  <Suspense fallback={<LoadingState />}>
                    <StatusTransitionDashboard />
                  </Suspense>
                </ErrorBoundary>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Archive Operations</h2>
                <ErrorBoundary>
                  <Suspense fallback={<LoadingState />}>
                    <ArchiveSuccessDashboard />
                  </Suspense>
                </ErrorBoundary>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 