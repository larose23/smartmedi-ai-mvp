import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { toast } from 'react-hot-toast';

interface KeyboardTestStep {
  id: string;
  description: string;
  expectedBehavior: string;
  completed: boolean;
}

export const KeyboardNavigationTester: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<KeyboardTestStep[]>([
    {
      id: 'tab-navigation',
      description: 'Press Tab to navigate through focusable elements',
      expectedBehavior: 'Focus should move in a logical order',
      completed: false,
    },
    {
      id: 'enter-key',
      description: 'Press Enter on buttons and links',
      expectedBehavior: 'Elements should activate as if clicked',
      completed: false,
    },
    {
      id: 'arrow-keys',
      description: 'Use arrow keys in select menus and radio groups',
      expectedBehavior: 'Options should be navigable with arrow keys',
      completed: false,
    },
    {
      id: 'escape-key',
      description: 'Press Escape on modals and dropdowns',
      expectedBehavior: 'Modals and dropdowns should close',
      completed: false,
    },
    {
      id: 'focus-visible',
      description: 'Check focus indicators',
      expectedBehavior: 'Focused elements should have visible indicators',
      completed: false,
    },
  ]);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);

  useEffect(() => {
    if (isRecording) {
      const handleKeyDown = (event: KeyboardEvent) => {
        setRecordedKeys((prev) => [...prev, event.key]);
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isRecording]);

  const handleStepComplete = (stepId: string) => {
    setSteps((prevSteps) =>
      prevSteps.map((step) =>
        step.id === stepId ? { ...step, completed: true } : step
      )
    );

    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      toast.success('Keyboard navigation testing completed!');
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    setRecordedKeys([]);
  };

  const stopRecording = () => {
    setIsRecording(false);
    // Analyze recorded keys and update step completion
    const currentStepId = steps[currentStep].id;
    handleStepComplete(currentStepId);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Keyboard Navigation Testing</h2>
        <div className="space-x-2">
          {!isRecording ? (
            <Button onClick={startRecording} variant="primary">
              Start Recording
            </Button>
          ) : (
            <Button onClick={stopRecording} variant="secondary">
              Stop Recording
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Current Step</h3>
          <div className="bg-gray-50 p-4 rounded">
            <p className="font-medium">{steps[currentStep].description}</p>
            <p className="text-sm text-gray-600 mt-1">
              Expected: {steps[currentStep].expectedBehavior}
            </p>
          </div>
        </div>

        {isRecording && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Recording Keys</h3>
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm text-gray-600">
                Pressed keys: {recordedKeys.join(', ')}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Test Steps</h3>
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`p-4 rounded border ${
                index === currentStep
                  ? 'border-blue-500 bg-blue-50'
                  : step.completed
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{step.description}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {step.expectedBehavior}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-sm ${
                    step.completed
                      ? 'bg-green-100 text-green-800'
                      : index === currentStep
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {step.completed
                    ? 'Completed'
                    : index === currentStep
                    ? 'Current'
                    : 'Pending'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 