import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClinicianFeedback } from '@/components/feedback/ClinicianFeedback';
import { FeedbackService } from '@/services/feedbackService';

// Mock the FeedbackService
jest.mock('@/services/feedbackService', () => ({
  FeedbackService: {
    getInstance: jest.fn(() => ({
      submitFeedback: jest.fn(),
    })),
  },
}));

describe('ClinicianFeedback', () => {
  const mockProps = {
    patientId: '123',
    appointmentId: '456',
    triageScore: 7,
    department: 'Emergency',
    onFeedbackSubmitted: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all feedback options correctly', () => {
    render(<ClinicianFeedback {...mockProps} />);

    // Check for main sections
    expect(screen.getByText('Clinician Feedback')).toBeInTheDocument();
    expect(screen.getByText('Overall Assessment')).toBeInTheDocument();
    expect(screen.getByText('Patient Outcome')).toBeInTheDocument();
    expect(screen.getByText('Triage Assessment')).toBeInTheDocument();
    expect(screen.getByText('Override Information')).toBeInTheDocument();
    expect(screen.getByText('Demographic Factors')).toBeInTheDocument();
  });

  it('handles feedback submission successfully', async () => {
    const mockSubmitFeedback = jest.fn().mockResolvedValue(undefined);
    (FeedbackService.getInstance as jest.Mock).mockReturnValue({
      submitFeedback: mockSubmitFeedback,
    });

    render(<ClinicianFeedback {...mockProps} />);

    // Fill in feedback
    fireEvent.click(screen.getByLabelText('Positive'));
    fireEvent.click(screen.getByLabelText('Resolved'));
    
    // Set ratings
    const accuracyRating = screen.getByLabelText('Accuracy Rating');
    const relevanceRating = screen.getByLabelText('Relevance Rating');
    fireEvent.click(accuracyRating.querySelectorAll('input')[4]); // 5 stars
    fireEvent.click(relevanceRating.querySelectorAll('input')[4]); // 5 stars

    // Add notes
    const notesField = screen.getByLabelText('Additional Notes');
    await userEvent.type(notesField, 'Test feedback notes');

    // Submit feedback
    fireEvent.click(screen.getByText('Submit Feedback'));

    // Verify loading state
    expect(screen.getByText('Submitting...')).toBeInTheDocument();

    // Wait for submission to complete
    await waitFor(() => {
      expect(screen.getByText('Feedback submitted successfully')).toBeInTheDocument();
    });

    // Verify service call
    expect(mockSubmitFeedback).toHaveBeenCalledWith(expect.objectContaining({
      patientId: mockProps.patientId,
      appointmentId: mockProps.appointmentId,
      triageScore: mockProps.triageScore,
      department: mockProps.department,
      type: 'positive',
      outcome: 'resolved',
      accuracy: 5,
      relevance: 5,
      notes: 'Test feedback notes',
    }));

    // Verify callback
    await waitFor(() => {
      expect(mockProps.onFeedbackSubmitted).toHaveBeenCalled();
    });
  });

  it('handles override selection and reason', async () => {
    render(<ClinicianFeedback {...mockProps} />);

    // Select override
    const overrideRadio = screen.getByLabelText('Triage Score Override');
    fireEvent.click(overrideRadio);

    // Verify override reason field appears
    const overrideReason = screen.getByLabelText('Override Reason');
    expect(overrideReason).toBeInTheDocument();

    // Enter override reason
    await userEvent.type(overrideReason, 'Test override reason');

    // Submit feedback
    fireEvent.click(screen.getByText('Submit Feedback'));

    // Verify service call includes override information
    await waitFor(() => {
      expect(FeedbackService.getInstance().submitFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          override: true,
          overrideReason: 'Test override reason',
        })
      );
    });
  });

  it('handles demographic factor selection', async () => {
    render(<ClinicianFeedback {...mockProps} />);

    // Select demographic factors
    const ageChip = screen.getByText('Age');
    const genderChip = screen.getByText('Gender');
    
    fireEvent.click(ageChip);
    fireEvent.click(genderChip);

    // Submit feedback
    fireEvent.click(screen.getByText('Submit Feedback'));

    // Verify service call includes selected factors
    await waitFor(() => {
      expect(FeedbackService.getInstance().submitFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          demographicFactors: ['Age', 'Gender'],
        })
      );
    });
  });

  it('handles submission error gracefully', async () => {
    const mockError = new Error('Submission failed');
    (FeedbackService.getInstance as jest.Mock).mockReturnValue({
      submitFeedback: jest.fn().mockRejectedValue(mockError),
    });

    render(<ClinicianFeedback {...mockProps} />);

    // Submit feedback
    fireEvent.click(screen.getByText('Submit Feedback'));

    // Verify error message
    await waitFor(() => {
      expect(screen.getByText('Submission failed')).toBeInTheDocument();
    });

    // Verify callback not called
    expect(mockProps.onFeedbackSubmitted).not.toHaveBeenCalled();
  });

  it('validates required fields before submission', async () => {
    render(<ClinicianFeedback {...mockProps} />);

    // Try to submit without selecting feedback type
    fireEvent.click(screen.getByText('Submit Feedback'));

    // Verify error message
    await waitFor(() => {
      expect(screen.getByText('Please provide all required feedback')).toBeInTheDocument();
    });
  });
}); 