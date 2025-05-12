import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { TextArea } from '../ui/TextArea';
import { Select } from '../ui/Select';
import { toast } from 'react-hot-toast';

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_review' | 'planned' | 'implemented' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  votes: number;
  createdAt: string;
  updatedAt: string;
}

interface FeatureRequestManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeatureRequestManager: React.FC<FeatureRequestManagerProps> = ({
  isOpen,
  onClose,
}) => {
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    priority: 'medium',
  });

  useEffect(() => {
    if (isOpen) {
      fetchFeatureRequests();
    }
  }, [isOpen]);

  const fetchFeatureRequests = async () => {
    try {
      const response = await fetch('/api/feature-requests');
      if (!response.ok) throw new Error('Failed to fetch feature requests');
      const data = await response.json();
      setRequests(data);
    } catch (error) {
      toast.error('Failed to load feature requests');
    }
  };

  const handleSubmit = async () => {
    if (!newRequest.title.trim() || !newRequest.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/feature-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRequest),
      });

      if (!response.ok) throw new Error('Failed to submit feature request');

      toast.success('Feature request submitted successfully!');
      setNewRequest({ title: '', description: '', priority: 'medium' });
      fetchFeatureRequests();
    } catch (error) {
      toast.error('Failed to submit feature request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (requestId: string) => {
    try {
      const response = await fetch(`/api/feature-requests/${requestId}/vote`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to vote');

      toast.success('Vote recorded successfully!');
      fetchFeatureRequests();
    } catch (error) {
      toast.error('Failed to record vote');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Feature Requests">
      <div className="space-y-6 p-4">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Submit New Feature Request</h3>
          <input
            type="text"
            value={newRequest.title}
            onChange={(e) =>
              setNewRequest({ ...newRequest, title: e.target.value })
            }
            placeholder="Feature Title"
            className="w-full p-2 border rounded"
          />
          <TextArea
            value={newRequest.description}
            onChange={(e) =>
              setNewRequest({ ...newRequest, description: e.target.value })
            }
            placeholder="Describe the feature in detail..."
            rows={3}
          />
          <Select
            value={newRequest.priority}
            onChange={(e) =>
              setNewRequest({ ...newRequest, priority: e.target.value })
            }
            options={[
              { value: 'low', label: 'Low Priority' },
              { value: 'medium', label: 'Medium Priority' },
              { value: 'high', label: 'High Priority' },
            ]}
          />
          <Button
            onClick={handleSubmit}
            variant="primary"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">Existing Requests</h3>
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="border rounded p-4 space-y-2"
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-medium">{request.title}</h4>
                  <span className="text-sm text-gray-500">
                    {request.votes} votes
                  </span>
                </div>
                <p className="text-sm text-gray-600">{request.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    Status: {request.status.replace('_', ' ')}
                  </span>
                  <Button
                    onClick={() => handleVote(request.id)}
                    variant="secondary"
                    size="sm"
                  >
                    Vote
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}; 