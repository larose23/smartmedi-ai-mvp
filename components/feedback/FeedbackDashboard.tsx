import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { toast } from 'react-hot-toast';

interface FeedbackStats {
  totalFeedback: number;
  averageSatisfaction: number;
  featureRequests: {
    total: number;
    byStatus: Record<string, number>;
  };
}

export const FeedbackDashboard: React.FC = () => {
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFeedbackData();
  }, [filter]);

  const fetchFeedbackData = async () => {
    setIsLoading(true);
    try {
      // Fetch feedback
      const feedbackResponse = await fetch('/api/feedback');
      const feedbackData = await feedbackResponse.json();

      // Fetch satisfaction surveys
      const surveyResponse = await fetch('/api/satisfaction-survey');
      const surveyData = await surveyResponse.json();

      // Fetch feature requests
      const requestsResponse = await fetch('/api/feature-requests');
      const requestsData = await requestsResponse.json();

      // Calculate stats
      const stats: FeedbackStats = {
        totalFeedback: feedbackData.length,
        averageSatisfaction: parseFloat(surveyData.averageSatisfaction),
        featureRequests: {
          total: requestsData.length,
          byStatus: requestsData.reduce((acc: Record<string, number>, req: any) => {
            acc[req.status] = (acc[req.status] || 0) + 1;
            return acc;
          }, {}),
        },
      };

      setStats(stats);
      setFeedback(feedbackData);
    } catch (error) {
      toast.error('Failed to load feedback data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (feedbackId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      toast.success('Status updated successfully');
      fetchFeedbackData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading feedback data...</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-2">Total Feedback</h3>
          <p className="text-3xl font-bold">{stats?.totalFeedback}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-2">Average Satisfaction</h3>
          <p className="text-3xl font-bold">{stats?.averageSatisfaction}/5</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-2">Feature Requests</h3>
          <p className="text-3xl font-bold">{stats?.featureRequests.total}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-medium">Recent Feedback</h2>
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Feedback' },
              { value: 'bug', label: 'Bug Reports' },
              { value: 'feature', label: 'Feature Requests' },
              { value: 'improvement', label: 'Improvements' },
            ]}
          />
        </div>

        <div className="space-y-4">
          {feedback
            .filter((item) => filter === 'all' || item.category === filter)
            .map((item) => (
              <div
                key={item.id}
                className="border rounded p-4 space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{item.category}</h4>
                    <p className="text-sm text-gray-600">{item.feedback}</p>
                  </div>
                  <Select
                    value={item.status}
                    onChange={(e) => handleStatusUpdate(item.id, e.target.value)}
                    options={[
                      { value: 'new', label: 'New' },
                      { value: 'in_progress', label: 'In Progress' },
                      { value: 'resolved', label: 'Resolved' },
                      { value: 'closed', label: 'Closed' },
                    ]}
                  />
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(item.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}; 