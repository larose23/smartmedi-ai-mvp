import { supabase } from '../supabase';
import { securityLogger } from '../security/logger';

// Define validation rules for critical fields
const VALIDATION_RULES = {
  patients: {
    email: {
      pattern: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: 'Invalid email format'
    },
    phone: {
      pattern: /^\+?[\d\s-]{10,}$/,
      message: 'Invalid phone number format'
    },
    dateOfBirth: {
      validate: (dob: string) => {
        const date = new Date(dob);
        const now = new Date();
        return date < now && date > new Date(1900, 0, 1);
      },
      message: 'Invalid date of birth'
    }
  },
  medical_records: {
    recordType: {
      enum: ['CONSULTATION', 'LAB_RESULT', 'PRESCRIPTION', 'IMAGING', 'VACCINATION'],
      message: 'Invalid record type'
    }
  },
  appointments: {
    status: {
      enum: ['SCHEDULED', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'],
      message: 'Invalid appointment status'
    },
    date: {
      validate: (date: string) => {
        const appointmentDate = new Date(date);
        const now = new Date();
        return appointmentDate > now;
      },
      message: 'Appointment date must be in the future'
    }
  }
};

// Define referential integrity rules
const REFERENTIAL_RULES = {
  medical_records: {
    patientId: {
      table: 'patients',
      field: 'id',
      onDelete: 'CASCADE'
    }
  },
  appointments: {
    patientId: {
      table: 'patients',
      field: 'id',
      onDelete: 'CASCADE'
    },
    doctorId: {
      table: 'staff',
      field: 'id',
      onDelete: 'RESTRICT'
    }
  },
  patient_consents: {
    patientId: {
      table: 'patients',
      field: 'id',
      onDelete: 'CASCADE'
    }
  }
};

interface DataQualityMetric {
  name: string;
  description: string;
  query: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high';
}

class DataIntegrityManager {
  private static instance: DataIntegrityManager;
  private readonly qualityMetrics: DataQualityMetric[];

  private constructor() {
    this.qualityMetrics = this.initializeQualityMetrics();
  }

  public static getInstance(): DataIntegrityManager {
    if (!DataIntegrityManager.instance) {
      DataIntegrityManager.instance = new DataIntegrityManager();
    }
    return DataIntegrityManager.instance;
  }

  private initializeQualityMetrics(): DataQualityMetric[] {
    return [
      {
        name: 'missing_required_fields',
        description: 'Records with missing required fields',
        query: `
          SELECT table_name, COUNT(*) as count
          FROM (
            SELECT 'patients' as table_name, COUNT(*) as missing
            FROM patients
            WHERE email IS NULL OR firstName IS NULL OR lastName IS NULL
            UNION ALL
            SELECT 'medical_records' as table_name, COUNT(*) as missing
            FROM medical_records
            WHERE patientId IS NULL OR recordType IS NULL
            UNION ALL
            SELECT 'appointments' as table_name, COUNT(*) as missing
            FROM appointments
            WHERE patientId IS NULL OR doctorId IS NULL OR date IS NULL
          ) as missing_fields
          GROUP BY table_name
        `,
        threshold: 0,
        severity: 'high'
      },
      {
        name: 'invalid_email_format',
        description: 'Records with invalid email format',
        query: `
          SELECT COUNT(*) as count
          FROM patients
          WHERE email !~ '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$'
        `,
        threshold: 0,
        severity: 'high'
      },
      {
        name: 'orphaned_records',
        description: 'Records with broken referential integrity',
        query: `
          SELECT 'medical_records' as table_name, COUNT(*) as count
          FROM medical_records m
          LEFT JOIN patients p ON m.patientId = p.id
          WHERE p.id IS NULL
          UNION ALL
          SELECT 'appointments' as table_name, COUNT(*) as count
          FROM appointments a
          LEFT JOIN patients p ON a.patientId = p.id
          LEFT JOIN staff s ON a.doctorId = s.id
          WHERE p.id IS NULL OR s.id IS NULL
        `,
        threshold: 0,
        severity: 'high'
      },
      {
        name: 'duplicate_records',
        description: 'Potential duplicate records',
        query: `
          SELECT 'patients' as table_name, COUNT(*) as count
          FROM (
            SELECT email, COUNT(*) as cnt
            FROM patients
            GROUP BY email
            HAVING COUNT(*) > 1
          ) as dups
        `,
        threshold: 0,
        severity: 'medium'
      }
    ];
  }

  public async validateRecord(
    table: string,
    record: Record<string, any>
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const rules = VALIDATION_RULES[table];
    if (!rules) return { isValid: true, errors: [] };

    const errors: string[] = [];

    for (const [field, rule] of Object.entries(rules)) {
      const value = record[field];
      if (!value) continue;

      if ('pattern' in rule) {
        if (!rule.pattern.test(value)) {
          errors.push(`${field}: ${rule.message}`);
        }
      } else if ('enum' in rule) {
        if (!rule.enum.includes(value)) {
          errors.push(`${field}: ${rule.message}`);
        }
      } else if ('validate' in rule) {
        if (!rule.validate(value)) {
          errors.push(`${field}: ${rule.message}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  public async checkReferentialIntegrity(
    table: string,
    record: Record<string, any>
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const rules = REFERENTIAL_RULES[table];
    if (!rules) return { isValid: true, errors: [] };

    const errors: string[] = [];

    for (const [field, rule] of Object.entries(rules)) {
      const value = record[field];
      if (!value) continue;

      const { data, error } = await supabase
        .from(rule.table)
        .select(rule.field)
        .eq(rule.field, value)
        .single();

      if (error || !data) {
        errors.push(`${field}: Referenced ${rule.table}.${rule.field} does not exist`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  public async checkDataQuality(): Promise<{
    metrics: Record<string, { count: number; status: 'ok' | 'warning' | 'error' }>;
    issues: Array<{ metric: string; count: number; severity: string }>;
  }> {
    const metrics: Record<string, any> = {};
    const issues: Array<{ metric: string; count: number; severity: string }> = [];

    for (const metric of this.qualityMetrics) {
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: metric.query
        });

        if (error) throw error;

        const count = data[0]?.count || 0;
        const status = count > metric.threshold ? 'error' : 'ok';

        metrics[metric.name] = {
          count,
          status
        };

        if (status === 'error') {
          issues.push({
            metric: metric.name,
            count,
            severity: metric.severity
          });
        }

        securityLogger.log({
          type: 'data_quality',
          severity: status === 'error' ? 'high' : 'low',
          message: `Data quality check: ${metric.name}`,
          metadata: { count, status }
        });
      } catch (error) {
        securityLogger.log({
          type: 'data_quality',
          severity: 'high',
          message: `Failed to check data quality metric: ${metric.name}`,
          metadata: { error: error.message }
        });
      }
    }

    return { metrics, issues };
  }

  public async getDataQualityDashboard(): Promise<{
    summary: {
      totalIssues: number;
      criticalIssues: number;
      warningIssues: number;
    };
    metrics: Record<string, any>;
    recentIssues: Array<{
      metric: string;
      count: number;
      severity: string;
      timestamp: string;
    }>;
  }> {
    const { metrics, issues } = await this.checkDataQuality();

    const summary = {
      totalIssues: issues.length,
      criticalIssues: issues.filter(i => i.severity === 'high').length,
      warningIssues: issues.filter(i => i.severity === 'medium').length
    };

    // Get recent issues from security logs
    const { data: recentLogs } = await supabase
      .from('security_logs')
      .select('*')
      .eq('type', 'data_quality')
      .order('createdAt', { ascending: false })
      .limit(10);

    const recentIssues = recentLogs?.map(log => ({
      metric: log.metadata.metric,
      count: log.metadata.count,
      severity: log.severity,
      timestamp: log.createdAt
    })) || [];

    return {
      summary,
      metrics,
      recentIssues
    };
  }
}

// Export singleton instance
export const dataIntegrityManager = DataIntegrityManager.getInstance(); 