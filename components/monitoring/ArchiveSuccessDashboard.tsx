import { useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { monitoring } from '../../lib/monitoring';

interface ArchiveStats {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
  recentFailures: Array<{
    patientId: string;
    timestamp: string;
    error: string;
  }>;
}

export default function ArchiveSuccessDashboard() {
  const [stats, setStats] = useState<ArchiveStats>({
    total: 0,
    successful: 0,
    failed: 0,
    successRate: 0,
    recentFailures: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/monitoring/archive-stats');
        if (!response.ok) {
          throw new Error('Failed to fetch archive stats');
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        monitoring.trackError(err instanceof Error ? err : new Error('Failed to fetch archive stats'));
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="p-4">Loading archive statistics...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  const pieData = [
    { name: 'Successful', value: stats.successful },
    { name: 'Failed', value: stats.failed },
  ];

  const COLORS = ['#4CAF50', '#F44336'];

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-xl font-semibold mb-4">Archive Success Rate</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">Overall Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">Total Archives</div>
                <div className="text-2xl font-bold">{stats.total}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">Success Rate</div>
                <div className="text-2xl font-bold text-green-600">
                  {stats.successRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
          {stats.recentFailures.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-2">Recent Failures</h3>
              <div className="space-y-2">
                {stats.recentFailures.map((failure, index) => (
                  <div key={index} className="bg-red-50 p-3 rounded">
                    <div className="text-sm font-medium">Patient ID: {failure.patientId}</div>
                    <div className="text-sm text-gray-600">
                      {new Date(failure.timestamp).toLocaleString()}
                    </div>
                    <div className="text-sm text-red-600">{failure.error}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 