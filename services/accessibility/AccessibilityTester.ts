import { axe, toHaveNoViolations } from 'jest-axe';
import { getComputedStyle } from 'window';

interface AccessibilityViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    html: string;
    target: string[];
    failureSummary: string;
  }>;
}

interface AccessibilityReport {
  timestamp: string;
  violations: AccessibilityViolation[];
  passes: any[];
  incomplete: any[];
  inapplicable: any[];
  score: number;
}

export class AccessibilityTester {
  private static instance: AccessibilityTester;
  private reports: Map<string, AccessibilityReport> = new Map();

  private constructor() {}

  static getInstance(): AccessibilityTester {
    if (!AccessibilityTester.instance) {
      AccessibilityTester.instance = new AccessibilityTester();
    }
    return AccessibilityTester.instance;
  }

  async runAutomatedCheck(element: HTMLElement): Promise<AccessibilityReport> {
    try {
      const results = await axe(element);
      const report: AccessibilityReport = {
        timestamp: new Date().toISOString(),
        violations: results.violations,
        passes: results.passes,
        incomplete: results.incomplete,
        inapplicable: results.inapplicable,
        score: this.calculateScore(results),
      };

      this.reports.set(report.timestamp, report);
      return report;
    } catch (error) {
      console.error('Error running accessibility check:', error);
      throw error;
    }
  }

  async testKeyboardNavigation(element: HTMLElement): Promise<{
    focusable: boolean;
    tabIndex: number;
    keyboardAccessible: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const results = Array.from(focusableElements).map((el) => {
      const computedStyle = getComputedStyle(el as Element);
      const isVisible = computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden';
      const tabIndex = (el as HTMLElement).tabIndex;
      const isKeyboardAccessible = this.checkKeyboardAccessibility(el as HTMLElement);

      if (!isKeyboardAccessible) {
        issues.push(`Element ${el.tagName} is not keyboard accessible`);
      }

      return {
        element: el,
        focusable: isVisible,
        tabIndex,
        keyboardAccessible: isKeyboardAccessible,
      };
    });

    return {
      focusable: results.some((r) => r.focusable),
      tabIndex: Math.min(...results.map((r) => r.tabIndex)),
      keyboardAccessible: results.every((r) => r.keyboardAccessible),
      issues,
    };
  }

  async testScreenReaderCompatibility(element: HTMLElement): Promise<{
    hasAriaLabels: boolean;
    hasAltText: boolean;
    hasRoles: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    const images = element.querySelectorAll('img');
    const interactiveElements = element.querySelectorAll('button, a, input, select, textarea');
    const elementsWithRoles = element.querySelectorAll('[role]');

    // Check images for alt text
    images.forEach((img) => {
      if (!img.alt && !img.getAttribute('aria-label')) {
        issues.push(`Image ${img.src} is missing alt text or aria-label`);
      }
    });

    // Check interactive elements for aria labels
    interactiveElements.forEach((el) => {
      if (!el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) {
        issues.push(`Interactive element ${el.tagName} is missing aria-label or aria-labelledby`);
      }
    });

    return {
      hasAriaLabels: interactiveElements.length > 0 && issues.length < interactiveElements.length,
      hasAltText: images.length > 0 && issues.length < images.length,
      hasRoles: elementsWithRoles.length > 0,
      issues,
    };
  }

  private calculateScore(results: any): number {
    const totalIssues = results.violations.length;
    const criticalIssues = results.violations.filter(
      (v: any) => v.impact === 'critical'
    ).length;
    const seriousIssues = results.violations.filter(
      (v: any) => v.impact === 'serious'
    ).length;

    // Calculate score based on severity of issues
    const score = 100 - (criticalIssues * 20 + seriousIssues * 10 + (totalIssues - criticalIssues - seriousIssues) * 5);
    return Math.max(0, score);
  }

  private checkKeyboardAccessibility(element: HTMLElement): boolean {
    const hasClickHandler = element.onclick !== null;
    const hasKeyHandler = element.onkeydown !== null || element.onkeyup !== null;
    const hasRole = element.getAttribute('role') !== null;
    const isButton = element.tagName === 'BUTTON';
    const isLink = element.tagName === 'A' && element.getAttribute('href') !== null;

    return (
      (hasClickHandler && hasKeyHandler) ||
      hasRole ||
      isButton ||
      isLink
    );
  }

  getReports(): AccessibilityReport[] {
    return Array.from(this.reports.values());
  }

  getLatestReport(): AccessibilityReport | null {
    const reports = this.getReports();
    return reports.length > 0 ? reports[reports.length - 1] : null;
  }
} 