import React, { useEffect, useState } from 'react';
import { AggregatedAlert, AlertAggregator } from '@/lib/services/AlertAggregator';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from './LoadingSpinner';
import { NotificationPriority } from '@/lib/services/NotificationService';

interface AggregatedAlertsHubProps {
  userId: string;
  userRole: string;
}

const AggregatedAlertsHub: React.FC<AggregatedAlertsHubProps> = ({
  userId,
  userRole
}) => {
  const [alerts, setAlerts] = useState<AggregatedAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    loadAlerts();
    const subscription = supabase
      .channel('aggregated_alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'aggregated_alerts' }, () => {
        loadAlerts();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [showResolved]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('aggregated_alerts')
        .select('*')
        .eq('status', showResolved ? 'resolved' : 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      await AlertAggregator.resolveAggregatedAlert(alertId);
      loadAlerts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve alert');
    }
  };

  const getSeverityColor = (severity: NotificationPriority) => {
    switch (severity) {
      case NotificationPriority.URGENT:
        return 'bg-red-100 text-red-800 border-red-200';
      case NotificationPriority.HIGH:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case NotificationPriority.MEDIUM:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case NotificationPriority.LOW:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading alerts</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Aggregated Alerts
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            {showResolved ? 'Resolved Alerts' : 'Active Alerts'}
          </p>
        </div>
        <button
          onClick={() => setShowResolved(!showResolved)}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {showResolved ? 'Show Active' : 'Show Resolved'}
        </button>
      </div>

      <div className="border-t border-gray-200">
        <ul className="divide-y divide-gray-200">
          {alerts.map((alert) => (
            <li key={alert.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(
                        alert.severity
                      )}`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-sm font-medium text-gray-900">
                      {alert.type}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {alert.count} occurrences
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">
                    First: {new Date(alert.first_occurrence).toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500">
                    Last: {new Date(alert.last_occurrence).toLocaleString()}
                  </span>
                  {!showResolved && alert.status === 'active' && (
                    <button
                      onClick={() => handleResolve(alert.id)}
                      className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
              {alert.metadata && (
                <div className="mt-2">
                  <pre className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    {JSON.stringify(alert.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </li>
          ))}
          {alerts.length === 0 && (
            <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
              No {showResolved ? 'resolved' : 'active'} alerts found
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default AggregatedAlertsHub; 