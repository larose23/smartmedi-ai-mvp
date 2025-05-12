import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ClinicianFeedback } from '@/components/feedback/ClinicianFeedback';

expect.extend(toHaveNoViolations);

describe('ClinicianFeedback Accessibility', () => {
  const mockProps = {
    patientId: '123',
    appointmentId: '456',
    triageScore: 7,
    department: 'Emergency',
    onFeedbackSubmitted: jest.fn(),
  };

  it('should not have any accessibility violations', async () => {
    const { container } = render(<ClinicianFeedback {...mockProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper ARIA labels for all interactive elements', async () => {
    const { container } = render(<ClinicianFeedback {...mockProps} />);
    
    // Check radio buttons
    expect(container.querySelector('[aria-label="Positive"]')).toBeInTheDocument();
    expect(container.querySelector('[aria-label="Neutral"]')).toBeInTheDocument();
    expect(container.querySelector('[aria-label="Negative"]')).toBeInTheDocument();
    
    // Check rating components
    expect(container.querySelector('[aria-label="Accuracy Rating"]')).toBeInTheDocument();
    expect(container.querySelector('[aria-label="Relevance Rating"]')).toBeInTheDocument();
    
    // Check text fields
    expect(container.querySelector('[aria-label="Additional Notes"]')).toBeInTheDocument();
    expect(container.querySelector('[aria-label="Override Reason"]')).toBeInTheDocument();
    
    // Check submit button
    expect(container.querySelector('[aria-label="Submit Feedback"]')).toBeInTheDocument();
  });

  it('should maintain accessibility when in loading state', async () => {
    const { container } = render(<ClinicianFeedback {...mockProps} />);
    
    // Simulate loading state
    const submitButton = container.querySelector('[aria-label="Submit Feedback"]');
    submitButton?.click();
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should maintain accessibility when showing error messages', async () => {
    const { container } = render(<ClinicianFeedback {...mockProps} />);
    
    // Simulate error state
    const submitButton = container.querySelector('[aria-label="Submit Feedback"]');
    submitButton?.click();
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper heading hierarchy', async () => {
    const { container } = render(<ClinicianFeedback {...mockProps} />);
    
    // Check main heading
    expect(container.querySelector('h6')).toHaveTextContent('Clinician Feedback');
    
    // Check section headings
    const headings = container.querySelectorAll('h6, h2');
    expect(headings.length).toBeGreaterThan(0);
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper color contrast', async () => {
    const { container } = render(<ClinicianFeedback {...mockProps} />);
    
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('should be keyboard navigable', async () => {
    const { container } = render(<ClinicianFeedback {...mockProps} />);
    
    // Check if all interactive elements are focusable
    const interactiveElements = container.querySelectorAll(
      'button, [role="button"], input, select, textarea'
    );
    
    interactiveElements.forEach((element) => {
      expect(element).toHaveAttribute('tabindex', expect.any(String));
    });
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper form labels', async () => {
    const { container } = render(<ClinicianFeedback {...mockProps} />);
    
    // Check if all form controls have associated labels
    const formControls = container.querySelectorAll(
      'input, select, textarea'
    );
    
    formControls.forEach((control) => {
      const id = control.getAttribute('id');
      expect(container.querySelector(`label[for="${id}"]`)).toBeInTheDocument();
    });
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
}); 