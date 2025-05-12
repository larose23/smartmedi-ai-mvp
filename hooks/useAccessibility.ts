import { useState, useCallback, useEffect } from 'react';
import { AccessibilityTester } from '../services/accessibility/AccessibilityTester';

interface AccessibilityState {
  automatedCheck: {
    score: number;
    violations: any[];
    timestamp: string | null;
  };
  keyboardNavigation: {
    focusable: boolean;
    tabIndex: number;
    keyboardAccessible: boolean;
    issues: string[];
  };
  screenReader: {
    hasAriaLabels: boolean;
    hasAltText: boolean;
    hasRoles: boolean;
    issues: string[];
  };
  isRunning: boolean;
  error: string | null;
}

export const useAccessibility = (elementRef: React.RefObject<HTMLElement>) => {
  const [state, setState] = useState<AccessibilityState>({
    automatedCheck: {
      score: 0,
      violations: [],
      timestamp: null,
    },
    keyboardNavigation: {
      focusable: false,
      tabIndex: 0,
      keyboardAccessible: false,
      issues: [],
    },
    screenReader: {
      hasAriaLabels: false,
      hasAltText: false,
      hasRoles: false,
      issues: [],
    },
    isRunning: false,
    error: null,
  });

  const runAccessibilityCheck = useCallback(async () => {
    if (!elementRef.current) {
      setState((prev) => ({
        ...prev,
        error: 'No element reference available',
      }));
      return;
    }

    setState((prev) => ({ ...prev, isRunning: true, error: null }));

    try {
      const tester = AccessibilityTester.getInstance();

      // Run automated check
      const automatedReport = await tester.runAutomatedCheck(elementRef.current);
      setState((prev) => ({
        ...prev,
        automatedCheck: {
          score: automatedReport.score,
          violations: automatedReport.violations,
          timestamp: automatedReport.timestamp,
        },
      }));

      // Test keyboard navigation
      const keyboardResults = await tester.testKeyboardNavigation(elementRef.current);
      setState((prev) => ({
        ...prev,
        keyboardNavigation: keyboardResults,
      }));

      // Test screen reader compatibility
      const screenReaderResults = await tester.testScreenReaderCompatibility(
        elementRef.current
      );
      setState((prev) => ({
        ...prev,
        screenReader: screenReaderResults,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }));
    } finally {
      setState((prev) => ({ ...prev, isRunning: false }));
    }
  }, [elementRef]);

  // Run initial check when component mounts
  useEffect(() => {
    runAccessibilityCheck();
  }, [runAccessibilityCheck]);

  return {
    ...state,
    runAccessibilityCheck,
  };
}; 