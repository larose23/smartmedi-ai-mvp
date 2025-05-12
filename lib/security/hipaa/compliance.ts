import { hipaaAuditLogger, HIPAAEventType, PHICategory } from './audit';
import { securityLogger } from '../logger';
import { sendEmail } from '../../email';

interface ComplianceReport {
  startDate: Date;
  endDate: Date;
  totalAccessEvents: number;
  totalModificationEvents: number;
  totalDisclosureEvents: number;
  accessByCategory: Record<PHICategory, number>;
  accessByUser: Record<string, number>;
  failedAccessAttempts: number;
  suspiciousActivities: Array<{
    userId: string;
    eventType: HIPAAEventType;
    timestamp: number;
    details: string;
  }>;
}

class HIPAACompliance {
  private static instance: HIPAACompliance;
  private readonly SUSPICIOUS_THRESHOLD = 10; // Number of failed attempts to trigger alert
  private readonly REPORT_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {
    this.startAutomatedReporting();
  }

  public static getInstance(): HIPAACompliance {
    if (!HIPAACompliance.instance) {
      HIPAACompliance.instance = new HIPAACompliance();
    }
    return HIPAACompliance.instance;
  }

  private startAutomatedReporting(): void {
    setInterval(() => {
      this.generateDailyReport().catch(error => {
        securityLogger.log({
          type: 'hipaa',
          severity: 'high',
          message: 'Failed to generate daily compliance report',
          metadata: { error: error.message }
        });
      });
    }, this.REPORT_INTERVAL);
  }

  public async generateComplianceReport(
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport> {
    try {
      // Get all audit logs for the period
      const logs = await hipaaAuditLogger.getAuditLogs(
        {},
        startDate,
        endDate,
        1000 // Adjust based on your needs
      );

      // Initialize report
      const report: ComplianceReport = {
        startDate,
        endDate,
        totalAccessEvents: 0,
        totalModificationEvents: 0,
        totalDisclosureEvents: 0,
        accessByCategory: {} as Record<PHICategory, number>,
        accessByUser: {},
        failedAccessAttempts: 0,
        suspiciousActivities: []
      };

      // Process logs
      logs.forEach(log => {
        // Count events by type
        switch (log.eventType) {
          case HIPAAEventType.ACCESS:
            report.totalAccessEvents++;
            break;
          case HIPAAEventType.MODIFICATION:
            report.totalModificationEvents++;
            break;
          case HIPAAEventType.DISCLOSURE:
            report.totalDisclosureEvents++;
            break;
        }

        // Count access by category
        if (log.eventType === HIPAAEventType.ACCESS) {
          report.accessByCategory[log.phiCategory] = 
            (report.accessByCategory[log.phiCategory] || 0) + 1;
          
          report.accessByUser[log.userId] = 
            (report.accessByUser[log.userId] || 0) + 1;
        }

        // Count failed attempts
        if (!log.success) {
          report.failedAccessAttempts++;
        }

        // Check for suspicious activities
        if (!log.success || this.isSuspiciousActivity(log)) {
          report.suspiciousActivities.push({
            userId: log.userId,
            eventType: log.eventType,
            timestamp: log.timestamp,
            details: log.errorMessage || 'Suspicious activity detected'
          });
        }
      });

      return report;
    } catch (error) {
      securityLogger.log({
        type: 'hipaa',
        severity: 'high',
        message: 'Failed to generate compliance report',
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  private isSuspiciousActivity(log: any): boolean {
    // Implement your suspicious activity detection logic here
    // For example:
    // - Multiple failed attempts in a short time
    // - Access to sensitive data outside business hours
    // - Unusual access patterns
    return false; // Placeholder
  }

  private async generateDailyReport(): Promise<void> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - this.REPORT_INTERVAL);

    try {
      const report = await this.generateComplianceReport(startDate, endDate);

      // Send report via email
      await sendEmail({
        to: process.env.COMPLIANCE_EMAIL || '',
        subject: 'Daily HIPAA Compliance Report',
        text: this.formatReportAsText(report),
        html: this.formatReportAsHtml(report)
      });

      // Log report generation
      securityLogger.log({
        type: 'hipaa',
        severity: 'low',
        message: 'Daily compliance report generated and sent',
        metadata: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          totalEvents: report.totalAccessEvents + 
                      report.totalModificationEvents + 
                      report.totalDisclosureEvents
        }
      });
    } catch (error) {
      securityLogger.log({
        type: 'hipaa',
        severity: 'high',
        message: 'Failed to generate daily compliance report',
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  private formatReportAsText(report: ComplianceReport): string {
    return `
HIPAA Compliance Report
Period: ${report.startDate.toISOString()} to ${report.endDate.toISOString()}

Summary:
- Total Access Events: ${report.totalAccessEvents}
- Total Modification Events: ${report.totalModificationEvents}
- Total Disclosure Events: ${report.totalDisclosureEvents}
- Failed Access Attempts: ${report.failedAccessAttempts}

Access by Category:
${Object.entries(report.accessByCategory)
  .map(([category, count]) => `- ${category}: ${count}`)
  .join('\n')}

Access by User:
${Object.entries(report.accessByUser)
  .map(([userId, count]) => `- ${userId}: ${count}`)
  .join('\n')}

Suspicious Activities:
${report.suspiciousActivities
  .map(activity => `- ${new Date(activity.timestamp).toISOString()}: ${activity.details}`)
  .join('\n')}
    `;
  }

  private formatReportAsHtml(report: ComplianceReport): string {
    return `
      <h1>HIPAA Compliance Report</h1>
      <p>Period: ${report.startDate.toISOString()} to ${report.endDate.toISOString()}</p>

      <h2>Summary</h2>
      <ul>
        <li>Total Access Events: ${report.totalAccessEvents}</li>
        <li>Total Modification Events: ${report.totalModificationEvents}</li>
        <li>Total Disclosure Events: ${report.totalDisclosureEvents}</li>
        <li>Failed Access Attempts: ${report.failedAccessAttempts}</li>
      </ul>

      <h2>Access by Category</h2>
      <ul>
        ${Object.entries(report.accessByCategory)
          .map(([category, count]) => `<li>${category}: ${count}</li>`)
          .join('')}
      </ul>

      <h2>Access by User</h2>
      <ul>
        ${Object.entries(report.accessByUser)
          .map(([userId, count]) => `<li>${userId}: ${count}</li>`)
          .join('')}
      </ul>

      <h2>Suspicious Activities</h2>
      <ul>
        ${report.suspiciousActivities
          .map(activity => `<li>${new Date(activity.timestamp).toISOString()}: ${activity.details}</li>`)
          .join('')}
      </ul>
    `;
  }
}

// Export singleton instance
export const hipaaCompliance = HIPAACompliance.getInstance(); 