import React, { useRef } from 'react';
import { useAccessibility } from '../../hooks/useAccessibility';
import { Button } from '../ui/Button';
import { Progress } from '../ui/Progress';
import { toast } from 'react-hot-toast';

export const AccessibilityDashboard: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    automatedCheck,
    keyboardNavigation,
    screenReader,
    isRunning,
    error,
    runAccessibilityCheck,
  } = useAccessibility(containerRef);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getIssueSeverity = (impact: string) => {
    switch (impact) {
      case 'critical':
        return 'text-red-600';
      case 'serious':
        return 'text-orange-600';
      case 'moderate':
        return 'text-yellow-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div ref={containerRef} className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Accessibility Dashboard</h1>
        <Button
          onClick={runAccessibilityCheck}
          disabled={isRunning}
          variant="primary"
        >
          {isRunning ? 'Running Tests...' : 'Run Tests'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Automated Check Score */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">Automated Check Score</h2>
          <div className="flex items-center justify-center">
            <div className="relative">
              <Progress
                value={automatedCheck.score}
                max={100}
                className="w-32 h-32"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className={`text-3xl font-bold ${getScoreColor(
                    automatedCheck.score
                  )}`}
                >
                  {automatedCheck.score}
                </span>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2 text-center">
            Last updated: {automatedCheck.timestamp}
          </p>
        </div>

        {/* Keyboard Navigation */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">Keyboard Navigation</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Focusable Elements</span>
              <span
                className={
                  keyboardNavigation.focusable ? 'text-green-500' : 'text-red-500'
                }
              >
                {keyboardNavigation.focusable ? '✓' : '✗'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Keyboard Accessible</span>
              <span
                className={
                  keyboardNavigation.keyboardAccessible
                    ? 'text-green-500'
                    : 'text-red-500'
                }
              >
                {keyboardNavigation.keyboardAccessible ? '✓' : '✗'}
              </span>
            </div>
            {keyboardNavigation.issues.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Issues:</h3>
                <ul className="text-sm text-red-600 space-y-1">
                  {keyboardNavigation.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Screen Reader Compatibility */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">Screen Reader Compatibility</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>ARIA Labels</span>
              <span
                className={
                  screenReader.hasAriaLabels ? 'text-green-500' : 'text-red-500'
                }
              >
                {screenReader.hasAriaLabels ? '✓' : '✗'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Alt Text</span>
              <span
                className={
                  screenReader.hasAltText ? 'text-green-500' : 'text-red-500'
                }
              >
                {screenReader.hasAltText ? '✓' : '✗'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>ARIA Roles</span>
              <span
                className={
                  screenReader.hasRoles ? 'text-green-500' : 'text-red-500'
                }
              >
                {screenReader.hasRoles ? '✓' : '✗'}
              </span>
            </div>
            {screenReader.issues.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Issues:</h3>
                <ul className="text-sm text-red-600 space-y-1">
                  {screenReader.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Violations List */}
      {automatedCheck.violations.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mt-6">
          <h2 className="text-lg font-medium mb-4">Accessibility Violations</h2>
          <div className="space-y-4">
            {automatedCheck.violations.map((violation, index) => (
              <div
                key={index}
                className="border rounded p-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3
                      className={`font-medium ${getIssueSeverity(
                        violation.impact
                      )}`}
                    >
                      {violation.id}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {violation.description}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-sm ${getIssueSeverity(
                      violation.impact
                    )}`}
                  >
                    {violation.impact}
                  </span>
                </div>
                <div className="mt-2">
                  <h4 className="text-sm font-medium">Affected Elements:</h4>
                  <ul className="mt-1 space-y-2">
                    {violation.nodes.map((node, nodeIndex) => (
                      <li key={nodeIndex} className="text-sm">
                        <code className="bg-gray-100 px-2 py-1 rounded">
                          {node.html}
                        </code>
                        <p className="text-red-600 mt-1">{node.failureSummary}</p>
                      </li>
                    ))}
                  </ul>
                </div>
                <a
                  href={violation.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 text-sm mt-2 inline-block"
                >
                  Learn more about this issue
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 