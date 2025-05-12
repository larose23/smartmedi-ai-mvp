import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { toast } from 'react-hot-toast';

interface ScreenReaderTest {
  id: string;
  element: string;
  description: string;
  expectedAnnouncement: string;
  completed: boolean;
}

export const ScreenReaderTester: React.FC = () => {
  const [tests, setTests] = useState<ScreenReaderTest[]>([
    {
      id: 'heading-structure',
      element: 'h1, h2, h3',
      description: 'Check heading hierarchy',
      expectedAnnouncement: 'Headings should be announced in correct order',
      completed: false,
    },
    {
      id: 'aria-labels',
      element: '[aria-label]',
      description: 'Test ARIA labels',
      expectedAnnouncement: 'Custom labels should be announced',
      completed: false,
    },
    {
      id: 'alt-text',
      element: 'img',
      description: 'Check image alt text',
      expectedAnnouncement: 'Images should have descriptive alt text',
      completed: false,
    },
    {
      id: 'button-roles',
      element: 'button, [role="button"]',
      description: 'Test button announcements',
      expectedAnnouncement: 'Buttons should announce their purpose',
      completed: false,
    },
    {
      id: 'form-labels',
      element: 'input, select, textarea',
      description: 'Check form control labels',
      expectedAnnouncement: 'Form controls should have associated labels',
      completed: false,
    },
  ]);

  const [currentTest, setCurrentTest] = useState(0);
  const [isTesting, setIsTesting] = useState(false);

  const startTest = () => {
    setIsTesting(true);
    // Highlight the current test element
    const elements = document.querySelectorAll(tests[currentTest].element);
    elements.forEach((el) => {
      el.classList.add('ring-2', 'ring-blue-500');
    });
  };

  const completeTest = (passed: boolean) => {
    const elements = document.querySelectorAll(tests[currentTest].element);
    elements.forEach((el) => {
      el.classList.remove('ring-2', 'ring-blue-500');
    });

    setTests((prevTests) =>
      prevTests.map((test, index) =>
        index === currentTest ? { ...test, completed: passed } : test
      )
    );

    if (passed) {
      toast.success('Test passed!');
    } else {
      toast.error('Test failed. Please check the requirements.');
    }

    if (currentTest < tests.length - 1) {
      setCurrentTest((prev) => prev + 1);
    } else {
      setIsTesting(false);
      toast.success('All screen reader tests completed!');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Screen Reader Testing</h2>
        <div className="space-x-2">
          {!isTesting ? (
            <Button onClick={startTest} variant="primary">
              Start Testing
            </Button>
          ) : (
            <div className="space-x-2">
              <Button onClick={() => completeTest(true)} variant="success">
                Pass Test
              </Button>
              <Button onClick={() => completeTest(false)} variant="danger">
                Fail Test
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {isTesting && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Current Test</h3>
            <div className="bg-blue-50 p-4 rounded">
              <p className="font-medium">{tests[currentTest].description}</p>
              <p className="text-sm text-gray-600 mt-1">
                Element: {tests[currentTest].element}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Expected: {tests[currentTest].expectedAnnouncement}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Test Cases</h3>
          {tests.map((test, index) => (
            <div
              key={test.id}
              className={`p-4 rounded border ${
                index === currentTest && isTesting
                  ? 'border-blue-500 bg-blue-50'
                  : test.completed
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{test.description}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Element: {test.element}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {test.expectedAnnouncement}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-sm ${
                    test.completed
                      ? 'bg-green-100 text-green-800'
                      : index === currentTest && isTesting
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {test.completed
                    ? 'Passed'
                    : index === currentTest && isTesting
                    ? 'Testing'
                    : 'Pending'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded">
        <h3 className="text-lg font-medium mb-2">Testing Instructions</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
          <li>Use a screen reader (e.g., NVDA, VoiceOver, or JAWS)</li>
          <li>Navigate through the highlighted elements</li>
          <li>Verify that the announcements match the expected behavior</li>
          <li>Mark the test as passed or failed based on your findings</li>
        </ul>
      </div>
    </div>
  );
}; 