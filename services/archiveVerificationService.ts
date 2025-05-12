import { createClient } from '@supabase/supabase-js';
import { NotificationService } from './notificationService';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface ArchiveTransaction {
  id: string;
  appointment_id: string;
  patient_id: string;
  previous_status: string;
  new_status: string;
  user_id: string;
  timestamp: Date;
  success: boolean;
  error_message?: string;
}

export interface ArchiveVerification {
  totalAppointments: number;
  archivedAppointments: number;
  orphanedRecords: number;
  lastVerification: Date;
  verificationStatus: 'success' | 'warning' | 'error';
  discrepancies: {
    type: 'missing' | 'incomplete' | 'mismatch';
    recordId: string;
    details: string;
  }[];
}

export interface VerificationReport {
  timestamp: Date;
  status: 'success' | 'warning' | 'error';
  summary: {
    totalProcessed: number;
    totalArchived: number;
    missingRecords: number;
    incompleteRecords: number;
    mismatchedRecords: number;
  };
  details: {
    missingRecords: string[];
    incompleteRecords: string[];
    mismatchedRecords: {
      recordId: string;
      expected: any;
      actual: any;
    }[];
  };
}

export interface ArchivedPatient {
  id: string;
  patientId: string;
  triageScore: number;
  department: string;
  checkInDate: Date;
  followUpDate: Date | null;
  outcome: string;
  riskFactors: string[];
  statusTransitions: {
    status: string;
    timestamp: Date;
    source: string;
  }[];
}

export interface ArchiveFilters {
  triageScoreRange: [number, number];
  department: string;
  dateRange: [Date | null, Date | null];
  riskFactors: string[];
}

export interface ExportOptions {
  format: 'csv' | 'pdf';
  destination: 'local' | 'metabase' | 'looker';
  dateRange: [Date | null, Date | null];
  patients: ArchivedPatient[];
}

export class ArchiveVerificationService {
  private static instance: ArchiveVerificationService;
  private notificationService: NotificationService;

  private constructor() {
    this.notificationService = NotificationService.getInstance();
  }

  static getInstance(): ArchiveVerificationService {
    if (!ArchiveVerificationService.instance) {
      ArchiveVerificationService.instance = new ArchiveVerificationService();
    }
    return ArchiveVerificationService.instance;
  }

  async logTransaction(
    appointmentId: string,
    patientId: string,
    previousStatus: string,
    newStatus: string,
    userId: string,
    success: boolean,
    errorMessage?: string
  ): Promise<ArchiveTransaction> {
    try {
      const { data, error } = await supabase
        .from('archive_transactions')
        .insert({
          appointment_id: appointmentId,
          patient_id: patientId,
          previous_status: previousStatus,
          new_status: newStatus,
          user_id: userId,
          timestamp: new Date().toISOString(),
          success,
          error_message: errorMessage,
        })
        .select()
        .single();

      if (error) throw error;

      if (!success) {
        await this.notificationService.sendNotification({
          type: 'error',
          title: 'Archive Failed',
          message: `Failed to archive appointment ${appointmentId}: ${errorMessage}`,
          userId,
        });
      }

      return this.mapTransactionDates(data);
    } catch (error) {
      console.error('Error logging transaction:', error);
      throw error;
    }
  }

  async verifyArchiveIntegrity(): Promise<ArchiveVerification> {
    try {
      // Get all appointments from the dashboard
      const { data: dashboardAppointments, error: dashboardError } = await supabase
        .from('appointments')
        .select('*');

      if (dashboardError) throw dashboardError;

      // Get all archived appointments
      const { data: archivedAppointments, error: archiveError } = await supabase
        .from('archived_appointments')
        .select('*');

      if (archiveError) throw archiveError;

      // Find orphaned records (in archive but not in dashboard)
      const orphanedRecords = archivedAppointments.filter(
        archived => !dashboardAppointments.some(dashboard => dashboard.id === archived.appointment_id)
      );

      // Find missing records (in dashboard but not in archive)
      const missingRecords = dashboardAppointments.filter(
        dashboard => !archivedAppointments.some(archived => archived.appointment_id === dashboard.id)
      );

      // Find incomplete records
      const incompleteRecords = archivedAppointments.filter(archived => {
        const requiredFields = [
          'patient_id',
          'appointment_id',
          'triage_score',
          'department',
          'check_in_date',
          'outcome',
        ];
        return requiredFields.some(field => !archived[field]);
      });

      // Find mismatched records
      const mismatchedRecords = archivedAppointments.filter(archived => {
        const dashboard = dashboardAppointments.find(d => d.id === archived.appointment_id);
        if (!dashboard) return false;

        return (
          dashboard.triage_score !== archived.triage_score ||
          dashboard.department !== archived.department ||
          dashboard.status !== archived.status
        );
      });

      const discrepancies = [
        ...missingRecords.map(record => ({
          type: 'missing' as const,
          recordId: record.id,
          details: 'Record exists in dashboard but not in archive',
        })),
        ...incompleteRecords.map(record => ({
          type: 'incomplete' as const,
          recordId: record.appointment_id,
          details: 'Record is missing required fields',
        })),
        ...mismatchedRecords.map(record => ({
          type: 'mismatch' as const,
          recordId: record.appointment_id,
          details: 'Record data does not match between dashboard and archive',
        })),
      ];

      const verificationStatus = this.calculateVerificationStatus(
        dashboardAppointments.length,
        archivedAppointments.length,
        orphanedRecords.length,
        discrepancies.length
      );

      // Log verification results
      await this.logVerification({
        timestamp: new Date(),
        status: verificationStatus,
        summary: {
          totalProcessed: dashboardAppointments.length,
          totalArchived: archivedAppointments.length,
          missingRecords: missingRecords.length,
          incompleteRecords: incompleteRecords.length,
          mismatchedRecords: mismatchedRecords.length,
        },
        details: {
          missingRecords: missingRecords.map(r => r.id),
          incompleteRecords: incompleteRecords.map(r => r.appointment_id),
          mismatchedRecords: mismatchedRecords.map(r => ({
            recordId: r.appointment_id,
            expected: dashboardAppointments.find(d => d.id === r.appointment_id),
            actual: r,
          })),
        },
      });

      // Send notifications for any issues
      if (discrepancies.length > 0) {
        await this.notificationService.sendNotification({
          type: verificationStatus === 'error' ? 'error' : 'warning',
          title: 'Archive Verification Issues Detected',
          message: `Found ${discrepancies.length} discrepancies in archive verification`,
          userId: 'system',
        });
      }

      return {
        totalAppointments: dashboardAppointments.length,
        archivedAppointments: archivedAppointments.length,
        orphanedRecords: orphanedRecords.length,
        lastVerification: new Date(),
        verificationStatus,
        discrepancies,
      };
    } catch (error) {
      console.error('Error verifying archive integrity:', error);
      throw error;
    }
  }

  private calculateVerificationStatus(
    totalAppointments: number,
    archivedAppointments: number,
    orphanedRecords: number,
    discrepancyCount: number
  ): 'success' | 'warning' | 'error' {
    if (discrepancyCount === 0) return 'success';
    if (discrepancyCount < 5 || orphanedRecords === 0) return 'warning';
    return 'error';
  }

  private async logVerification(report: VerificationReport): Promise<void> {
    try {
      const { error } = await supabase.from('verification_logs').insert({
        timestamp: report.timestamp.toISOString(),
        status: report.status,
        summary: report.summary,
        details: report.details,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error logging verification:', error);
      throw error;
    }
  }

  async getVerificationHistory(
    filters: {
      startDate?: Date;
      endDate?: Date;
      status?: 'success' | 'warning' | 'error';
    } = {}
  ): Promise<VerificationReport[]> {
    try {
      let query = supabase.from('verification_logs').select('*');

      if (filters.startDate) {
        query = query.gte('timestamp', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte('timestamp', filters.endDate.toISOString());
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map(this.mapVerificationDates);
    } catch (error) {
      console.error('Error fetching verification history:', error);
      throw error;
    }
  }

  private mapVerificationDates(report: any): VerificationReport {
    return {
      ...report,
      timestamp: new Date(report.timestamp),
    };
  }

  async getTransactionHistory(
    filters: {
      appointmentId?: string;
      patientId?: string;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<ArchiveTransaction[]> {
    try {
      let query = supabase.from('archive_transactions').select('*');

      if (filters.appointmentId) {
        query = query.eq('appointment_id', filters.appointmentId);
      }
      if (filters.patientId) {
        query = query.eq('patient_id', filters.patientId);
      }
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.startDate) {
        query = query.gte('timestamp', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte('timestamp', filters.endDate.toISOString());
      }

      const { data, error } = await query.order('timestamp', { ascending: false });

      if (error) throw error;
      return data.map(this.mapTransactionDates);
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw error;
    }
  }

  async getArchivedPatients(filters: ArchiveFilters): Promise<ArchivedPatient[]> {
    try {
      let query = supabase
        .from('archived_patients')
        .select(`
          *,
          status_transitions (
            status,
            timestamp,
            source
          )
        `);

      if (filters.department) {
        query = query.eq('department', filters.department);
      }

      if (filters.dateRange[0]) {
        query = query.gte('check_in_date', filters.dateRange[0].toISOString());
      }

      if (filters.dateRange[1]) {
        query = query.lte('check_in_date', filters.dateRange[1].toISOString());
      }

      if (filters.riskFactors.length > 0) {
        query = query.contains('risk_factors', filters.riskFactors);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map(this.mapArchivedPatientDates);
    } catch (error) {
      console.error('Error fetching archived patients:', error);
      throw error;
    }
  }

  async exportArchiveData(options: ExportOptions): Promise<void> {
    try {
      const { format, destination, dateRange, patients } = options;

      // Filter patients by date range if specified
      const filteredPatients = dateRange[0] && dateRange[1]
        ? patients.filter(patient => {
            const checkInDate = new Date(patient.checkInDate);
            return checkInDate >= dateRange[0]! && checkInDate <= dateRange[1]!;
          })
        : patients;

      if (format === 'csv') {
        await this.exportToCSV(filteredPatients, destination);
      } else {
        await this.exportToPDF(filteredPatients, destination);
      }

      // Log export transaction
      await this.logTransaction(
        'export',
        'system',
        'pending',
        'completed',
        'system',
        true
      );
    } catch (error) {
      console.error('Error exporting archive data:', error);
      await this.logTransaction(
        'export',
        'system',
        'pending',
        'failed',
        'system',
        false,
        error instanceof Error ? error.message : 'Export failed'
      );
      throw error;
    }
  }

  private async exportToCSV(patients: ArchivedPatient[], destination: string): Promise<void> {
    const csv = Papa.unparse(patients.map(patient => ({
      'Patient ID': patient.patientId,
      'Department': patient.department,
      'Triage Score': patient.triageScore,
      'Check-in Date': patient.checkInDate.toLocaleString(),
      'Follow-up Date': patient.followUpDate?.toLocaleString() || 'N/A',
      'Outcome': patient.outcome,
      'Risk Factors': patient.riskFactors.join(', '),
    })));

    if (destination === 'local') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `archive_export_${new Date().toISOString()}.csv`;
      link.click();
    } else {
      await this.uploadToAnalyticsPlatform(csv, 'csv', destination);
    }
  }

  private async exportToPDF(patients: ArchivedPatient[], destination: string): Promise<void> {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Archive Export Report', 14, 15);
    
    // Add date range
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 25);

    // Add patient data
    const tableData = patients.map(patient => [
      patient.patientId,
      patient.department,
      patient.triageScore.toString(),
      patient.checkInDate.toLocaleString(),
      patient.followUpDate?.toLocaleString() || 'N/A',
      patient.outcome,
      patient.riskFactors.join(', '),
    ]);

    (doc as any).autoTable({
      head: [['Patient ID', 'Department', 'Triage Score', 'Check-in', 'Follow-up', 'Outcome', 'Risk Factors']],
      body: tableData,
      startY: 35,
    });

    if (destination === 'local') {
      doc.save(`archive_export_${new Date().toISOString()}.pdf`);
    } else {
      const pdfBlob = doc.output('blob');
      await this.uploadToAnalyticsPlatform(pdfBlob, 'pdf', destination);
    }
  }

  private async uploadToAnalyticsPlatform(
    data: Blob | string,
    format: 'csv' | 'pdf',
    destination: 'metabase' | 'looker'
  ): Promise<void> {
    // TODO: Implement platform-specific upload logic
    // This would involve using the respective platform's API
    // For now, we'll just simulate a delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private mapArchivedPatientDates(patient: any): ArchivedPatient {
    return {
      ...patient,
      checkInDate: new Date(patient.check_in_date),
      followUpDate: patient.follow_up_date ? new Date(patient.follow_up_date) : null,
      statusTransitions: patient.status_transitions.map((transition: any) => ({
        ...transition,
        timestamp: new Date(transition.timestamp),
      })),
    };
  }

  private mapTransactionDates(transaction: any): ArchiveTransaction {
    return {
      ...transaction,
      timestamp: new Date(transaction.timestamp),
    };
  }
} 