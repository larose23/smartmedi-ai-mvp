'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface EmergencyAnalytics {
  total_alerts: number;
  average_response_time: number;
  acknowledgedWithin5min: number;
  department_breakdown: Array<{
    department: string;
    count: number;
    avg_response_time: number;
  }>;
}

export default function EmergencyAnalytics() {
  const [analytics, setAnalytics] = useState<EmergencyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Get total alerts and average response time
        const { data: alertsData, error: alertsError } = await supabase
          .from('emergency_alerts')
          .select('created_at, acknowledged_at, department')
          .not('acknowledged_at', 'is', null);

        if (alertsError) throw alertsError;

        // Calculate analytics
        const totalAlerts = alertsData.length;
        const responseTimes = alertsData.map(alert => 
          new Date(alert.acknowledged_at).getTime() - new Date(alert.created_at).getTime()
        );
        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / totalAlerts;
        const acknowledgedWithin5min = responseTimes.filter(time => time <= 5 * 60 * 1000).length;

        // Get department breakdown
        const departmentStats = alertsData.reduce((acc, alert) => {
          const dept = alert.department;
          if (!acc[dept]) {
            acc[dept] = { count: 0, totalTime: 0 };
          }
          acc[dept].count++;
          acc[dept].totalTime += new Date(alert.acknowledged_at).getTime() - new Date(alert.created_at).getTime();
          return acc;
        }, {} as Record<string, { count: number; totalTime: number }>);

        const departmentBreakdown = Object.entries(departmentStats).map(([department, stats]) => ({
          department,
          count: stats.count,
          avg_response_time: stats.totalTime / stats.count
        }));

        setAnalytics({
          total_alerts: totalAlerts,
          average_response_time: avgResponseTime,
          acknowledgedWithin5min,
          department_breakdown: departmentBreakdown
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();

    // Set up real-time subscription
    const subscription = supabase
      .channel('emergency-analytics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emergency_alerts',
        },
        () => fetchAnalytics()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  if (loading) return <div>Loading analytics...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!analytics) return <div>No data available</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold">Total Alerts</h3>
        <p className="text-2xl font-bold">{analytics.total_alerts}</p>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold">Avg Response Time</h3>
        <p className="text-2xl font-bold">{formatTime(analytics.average_response_time)}</p>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold">Within 5 Minutes</h3>
        <p className="text-2xl font-bold">{analytics.acknowledgedWithin5min}</p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">By Department</h3>
        <div className="space-y-2">
          {analytics.department_breakdown.map((dept) => (
            <div key={dept.department} className="flex justify-between">
              <span>{dept.department}</span>
              <span>{dept.count} ({formatTime(dept.avg_response_time)})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 