import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trackStatusTransition } from '@/monitoring/config';
import { monitoring } from '../../lib/monitoring';

interface StatusTransition {
  fromStatus: string;
  toStatus: string;
  count: number;
  success: boolean;
}

interface StatusTransitionStats {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
}

export default function StatusTransitionDashboard() {
  const [transitions, setTransitions] = useState<StatusTransition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransitions = async () => {
      try {
        const response = await fetch('/api/monitoring/status-transitions');
        if (!response.ok) {
          throw new Error('Failed to fetch status transitions');
        }
        const data = await response.json();
        setTransitions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        monitoring.trackError(err instanceof Error ? err : new Error('Failed to fetch status transitions'));
      } finally {
        setLoading(false);
      }
    };

    fetchTransitions();
    const interval = setInterval(fetchTransitions, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="p-4">Loading status transitions...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  const chartData = transitions.map(transition => ({
    name: `${transition.fromStatus} → ${transition.toStatus}`,
    successful: transition.success ? transition.count : 0,
    failed: !transition.success ? transition.count : 0,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Transitions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transitions.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Successful</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{transitions.filter(t => t.success).length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{transitions.filter(t => !t.success).length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((transitions.filter(t => t.success).length / transitions.length) * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status Transition Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="successful" name="Successful" fill="#4CAF50" />
                <Bar dataKey="failed" name="Failed" fill="#F44336" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transitions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transitions.slice(0, 10).map((transition, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <div className="font-medium">
                    {transition.fromStatus} → {transition.toStatus}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(transition.timestamp).toLocaleString()}
                  </div>
                </div>
                <Badge
                  variant={transition.success ? 'success' : 'destructive'}
                >
                  {transition.success ? 'Success' : 'Failed'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 