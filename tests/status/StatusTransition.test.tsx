import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StatusTransition } from '@/components/status/StatusTransition';
import { StatusService } from '@/services/statusService';

// Mock the StatusService
jest.mock('@/services/statusService', () => ({
  StatusService: {
    getInstance: jest.fn(() => ({
      updateStatus: jest.fn(),
      getStatusHistory: jest.fn(),
      validateTransition: jest.fn(),
    })),
  },
}));

describe('StatusTransition', () => {
  const mockPatient = {
    id: '123',
    name: 'John Doe',
    currentStatus: 'check_in',
    department: 'Emergency',
    triageScore: 7,
  };

  const mockStatusHistory = [
    {
      status: 'check_in',
      timestamp: new Date('2024-01-01T10:00:00'),
      notes: 'Patient checked in',
    },
    {
      status: 'triage',
      timestamp: new Date('2024-01-01T10:05:00'),
      notes: 'Triage assessment completed',
    },
    {
      status: 'treatment',
      timestamp: new Date('2024-01-01T10:30:00'),
      notes: 'Treatment started',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (StatusService.getInstance as jest.Mock).mockReturnValue({
      updateStatus: jest.fn().mockResolvedValue(undefined),
      getStatusHistory: jest.fn().mockResolvedValue(mockStatusHistory),
      validateTransition: jest.fn().mockResolvedValue(true),
    });
  });

  it('should render current status correctly', async () => {
    render(<StatusTransition patient={mockPatient} />);

    await waitFor(() => {
      expect(screen.getByText('Current Status: Check In')).toBeInTheDocument();
    });
  });

  it('should display status history in chronological order', async () => {
    render(<StatusTransition patient={mockPatient} />);

    await waitFor(() => {
      const statusItems = screen.getAllByRole('listitem');
      expect(statusItems).toHaveLength(3);
      expect(statusItems[0]).toHaveTextContent('Check In');
      expect(statusItems[1]).toHaveTextContent('Triage');
      expect(statusItems[2]).toHaveTextContent('Treatment');
    });
  });

  it('should validate status transitions', async () => {
    render(<StatusTransition patient={mockPatient} />);

    // Try to transition to next status
    const nextStatusButton = screen.getByText('Next Status');
    fireEvent.click(nextStatusButton);

    await waitFor(() => {
      expect(StatusService.getInstance().validateTransition).toHaveBeenCalledWith(
        mockPatient.id,
        'check_in',
        'triage'
      );
    });
  });

  it('should handle invalid status transitions', async () => {
    (StatusService.getInstance as jest.Mock).mockReturnValue({
      updateStatus: jest.fn(),
      getStatusHistory: jest.fn().mockResolvedValue(mockStatusHistory),
      validateTransition: jest.fn().mockResolvedValue(false),
    });

    render(<StatusTransition patient={mockPatient} />);

    const nextStatusButton = screen.getByText('Next Status');
    fireEvent.click(nextStatusButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid status transition')).toBeInTheDocument();
    });
  });

  it('should update status with notes', async () => {
    render(<StatusTransition patient={mockPatient} />);

    // Enter notes
    const notesInput = screen.getByLabelText('Status Notes');
    fireEvent.change(notesInput, { target: { value: 'Test notes' } });

    // Transition to next status
    const nextStatusButton = screen.getByText('Next Status');
    fireEvent.click(nextStatusButton);

    await waitFor(() => {
      expect(StatusService.getInstance().updateStatus).toHaveBeenCalledWith(
        mockPatient.id,
        'triage',
        'Test notes'
      );
    });
  });

  it('should handle status update errors', async () => {
    (StatusService.getInstance as jest.Mock).mockReturnValue({
      updateStatus: jest.fn().mockRejectedValue(new Error('Update failed')),
      getStatusHistory: jest.fn().mockResolvedValue(mockStatusHistory),
      validateTransition: jest.fn().mockResolvedValue(true),
    });

    render(<StatusTransition patient={mockPatient} />);

    const nextStatusButton = screen.getByText('Next Status');
    fireEvent.click(nextStatusButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to update status')).toBeInTheDocument();
    });
  });

  it('should show transition confirmation dialog', async () => {
    render(<StatusTransition patient={mockPatient} />);

    const nextStatusButton = screen.getByText('Next Status');
    fireEvent.click(nextStatusButton);

    await waitFor(() => {
      expect(screen.getByText('Confirm Status Change')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to change the status to Triage?')).toBeInTheDocument();
    });
  });

  it('should handle status transition cancellation', async () => {
    render(<StatusTransition patient={mockPatient} />);

    // Click next status
    const nextStatusButton = screen.getByText('Next Status');
    fireEvent.click(nextStatusButton);

    // Cancel the transition
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.getByText('Current Status: Check In')).toBeInTheDocument();
    });
  });

  it('should show transition progress', async () => {
    render(<StatusTransition patient={mockPatient} />);

    // Start transition
    const nextStatusButton = screen.getByText('Next Status');
    fireEvent.click(nextStatusButton);

    // Confirm transition
    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Updating status...')).toBeInTheDocument();
    });

    // Wait for completion
    await waitFor(() => {
      expect(screen.getByText('Status updated successfully')).toBeInTheDocument();
    });
  });

  it('should maintain status history integrity', async () => {
    render(<StatusTransition patient={mockPatient} />);

    // Complete a status transition
    const nextStatusButton = screen.getByText('Next Status');
    fireEvent.click(nextStatusButton);
    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(StatusService.getInstance().getStatusHistory).toHaveBeenCalledWith(mockPatient.id);
    });

    // Verify history is updated
    const statusItems = screen.getAllByRole('listitem');
    expect(statusItems).toHaveLength(4); // Original 3 + new status
  });
}); 