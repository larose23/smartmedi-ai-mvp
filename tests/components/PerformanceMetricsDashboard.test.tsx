import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PerformanceMetricsDashboard } from '@/components/feedback/PerformanceMetricsDashboard';
import { FeedbackService } from '@/services/feedbackService';

// Mock the FeedbackService
jest.mock('@/services/feedbackService', () => ({
  FeedbackService: {
    getInstance: jest.fn(() => ({
      getFeedbackMetrics: jest.fn(),
    })),
  },
}));

describe('PerformanceMetricsDashboard', () => {
  const mockMetrics = {
    totalFeedback: 100,
    positiveFeedback: 75,
    negativeFeedback: 15,
    averageAccuracy: 4.2,
    averageRelevance: 4.0,
    overrideRate: 0.15,
    demographicBias: [
      { factor: 'Age', biasScore: 0.1, sampleSize: 50 },
      { factor: 'Gender', biasScore: -0.2, sampleSize: 45 },
      { factor: 'Ethnicity', biasScore: 0.05, sampleSize: 40 },
    ],
    departmentPerformance: [
      {
        department: 'Emergency',
        accuracy: 4.5,
        relevance: 4.3,
        overrideRate: 0.1,
      },
      {
        department: 'Urgent Care',
        accuracy: 3.8,
        relevance: 3.9,
        overrideRate: 0.2,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (FeedbackService.getInstance as jest.Mock).mockReturnValue({
      getFeedbackMetrics: jest.fn().mockResolvedValue(mockMetrics),
    });
  });

  it('renders all metric cards correctly', async () => {
    render(<PerformanceMetricsDashboard />);

    // Wait for metrics to load
    await waitFor(() => {
      expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
    });

    // Check metric cards
    expect(screen.getByText('Average Accuracy')).toBeInTheDocument();
    expect(screen.getByText('Average Relevance')).toBeInTheDocument();
    expect(screen.getByText('Override Rate')).toBeInTheDocument();
    expect(screen.getByText('Positive Feedback')).toBeInTheDocument();

    // Check values
    expect(screen.getByText('4.2')).toBeInTheDocument();
    expect(screen.getByText('4.0')).toBeInTheDocument();
    expect(screen.getByText('15.0')).toBeInTheDocument();
    expect(screen.getByText('75.0')).toBeInTheDocument();
  });

  it('renders demographic bias chart', async () => {
    render(<PerformanceMetricsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Demographic Bias Analysis')).toBeInTheDocument();
    });

    // Check for demographic factors
    expect(screen.getByText('Age')).toBeInTheDocument();
    expect(screen.getByText('Gender')).toBeInTheDocument();
    expect(screen.getByText('Ethnicity')).toBeInTheDocument();
  });

  it('renders department performance section', async () => {
    render(<PerformanceMetricsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Department Performance')).toBeInTheDocument();
    });

    // Check for departments
    expect(screen.getByText('Emergency')).toBeInTheDocument();
    expect(screen.getByText('Urgent Care')).toBeInTheDocument();

    // Check for performance metrics
    expect(screen.getByText('10.0% Override Rate')).toBeInTheDocument();
    expect(screen.getByText('20.0% Override Rate')).toBeInTheDocument();
  });

  it('handles time range selection', async () => {
    render(<PerformanceMetricsDashboard />);

    // Click on different time ranges
    fireEvent.click(screen.getByText('Week'));
    await waitFor(() => {
      expect(FeedbackService.getInstance().getFeedbackMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        })
      );
    });

    fireEvent.click(screen.getByText('Month'));
    await waitFor(() => {
      expect(FeedbackService.getInstance().getFeedbackMetrics).toHaveBeenCalledTimes(2);
    });

    fireEvent.click(screen.getByText('Year'));
    await waitFor(() => {
      expect(FeedbackService.getInstance().getFeedbackMetrics).toHaveBeenCalledTimes(3);
    });
  });

  it('handles refresh button click', async () => {
    render(<PerformanceMetricsDashboard />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
    });

    // Click refresh
    fireEvent.click(screen.getByLabelText('Refresh'));

    // Verify metrics are fetched again
    await waitFor(() => {
      expect(FeedbackService.getInstance().getFeedbackMetrics).toHaveBeenCalledTimes(2);
    });
  });

  it('handles loading state', () => {
    (FeedbackService.getInstance as jest.Mock).mockReturnValue({
      getFeedbackMetrics: jest.fn().mockImplementation(() => new Promise(() => {})),
    });

    render(<PerformanceMetricsDashboard />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('handles error state', async () => {
    const mockError = new Error('Failed to fetch metrics');
    (FeedbackService.getInstance as jest.Mock).mockReturnValue({
      getFeedbackMetrics: jest.fn().mockRejectedValue(mockError),
    });

    render(<PerformanceMetricsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch metrics')).toBeInTheDocument();
    });
  });

  it('updates metrics when time range changes', async () => {
    render(<PerformanceMetricsDashboard />);

    // Initial load
    await waitFor(() => {
      expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
    });

    // Change time range
    fireEvent.click(screen.getByText('Week'));

    // Verify new metrics are fetched
    await waitFor(() => {
      expect(FeedbackService.getInstance().getFeedbackMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        })
      );
    });
  });
}); 