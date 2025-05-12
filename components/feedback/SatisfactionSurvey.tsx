import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { RadioGroup } from '../ui/RadioGroup';
import { TextArea } from '../ui/TextArea';
import { toast } from 'react-hot-toast';

interface SatisfactionSurveyProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: 'periodic' | 'action' | 'manual';
}

export const SatisfactionSurvey: React.FC<SatisfactionSurveyProps> = ({
  isOpen,
  onClose,
  trigger = 'manual',
}) => {
  const [satisfaction, setSatisfaction] = useState<number | null>(null);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (satisfaction === null) {
      toast.error('Please select a satisfaction level');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/satisfaction-survey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          satisfaction,
          comments,
          trigger,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error('Failed to submit survey');

      toast.success('Thank you for your feedback!');
      onClose();
      setSatisfaction(null);
      setComments('');
    } catch (error) {
      toast.error('Failed to submit survey. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="How satisfied are you?">
      <div className="space-y-6 p-4">
        <div>
          <h3 className="text-lg font-medium mb-2">Overall Satisfaction</h3>
          <RadioGroup
            value={satisfaction?.toString()}
            onChange={(value) => setSatisfaction(Number(value))}
            options={[
              { value: '1', label: 'Very Dissatisfied' },
              { value: '2', label: 'Dissatisfied' },
              { value: '3', label: 'Neutral' },
              { value: '4', label: 'Satisfied' },
              { value: '5', label: 'Very Satisfied' },
            ]}
          />
        </div>

        <div>
          <TextArea
            label="Additional Comments (Optional)"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Tell us more about your experience..."
            rows={3}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button
            onClick={onClose}
            variant="secondary"
            disabled={isSubmitting}
          >
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            variant="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}; 