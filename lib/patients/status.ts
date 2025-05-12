import { supabase } from '../supabase';
import { securityLogger } from '../security/logger';
import { hipaaAuditLogger, HIPAAEventType, PHICategory } from '../security/hipaa/audit';

// Define patient status types
export enum PatientStatus {
  REGISTERED = 'registered',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCHARGED = 'discharged',
  DECEASED = 'deceased',
  TRANSFERRED = 'transferred',
  SUSPENDED = 'suspended'
}

// Define status transition rules
interface StatusTransition {
  from: PatientStatus;
  to: PatientStatus[];
  requiresReason: boolean;
  requiresApproval: boolean;
  allowedRoles: string[];
  validationRules?: Array<(patient: any) => boolean>;
}

// Define status change record
interface StatusChange {
  id: string;
  patientId: string;
  previousStatus: PatientStatus;
  newStatus: PatientStatus;
  changedAt: Date;
  changedBy: string;
  reason?: string;
  approvedBy?: string;
  metadata: Record<string, any>;
}

class PatientStatusManager {
  private static instance: PatientStatusManager;
  private readonly statusTransitions: StatusTransition[] = [
    {
      from: PatientStatus.REGISTERED,
      to: [PatientStatus.ACTIVE, PatientStatus.SUSPENDED],
      requiresReason: false,
      requiresApproval: false,
      allowedRoles: ['admin', 'nurse', 'doctor'],
      validationRules: [
        (patient) => patient.registrationComplete === true,
        (patient) => patient.requiredDocumentsSubmitted === true
      ]
    },
    {
      from: PatientStatus.ACTIVE,
      to: [PatientStatus.INACTIVE, PatientStatus.DISCHARGED, PatientStatus.TRANSFERRED, PatientStatus.SUSPENDED],
      requiresReason: true,
      requiresApproval: true,
      allowedRoles: ['admin', 'doctor'],
      validationRules: [
        (patient) => patient.hasActiveAppointments === false,
        (patient) => patient.hasOutstandingBills === false
      ]
    },
    {
      from: PatientStatus.INACTIVE,
      to: [PatientStatus.ACTIVE, PatientStatus.DISCHARGED],
      requiresReason: true,
      requiresApproval: false,
      allowedRoles: ['admin', 'nurse', 'doctor'],
      validationRules: [
        (patient) => patient.lastVisitDate !== null
      ]
    },
    {
      from: PatientStatus.DISCHARGED,
      to: [PatientStatus.ACTIVE],
      requiresReason: true,
      requiresApproval: true,
      allowedRoles: ['admin', 'doctor'],
      validationRules: [
        (patient) => patient.dischargeDate !== null,
        (patient) => patient.dischargeSummarySubmitted === true
      ]
    },
    {
      from: PatientStatus.TRANSFERRED,
      to: [PatientStatus.ACTIVE],
      requiresReason: true,
      requiresApproval: true,
      allowedRoles: ['admin', 'doctor'],
      validationRules: [
        (patient) => patient.transferDocumentationSubmitted === true
      ]
    },
    {
      from: PatientStatus.SUSPENDED,
      to: [PatientStatus.ACTIVE, PatientStatus.DISCHARGED],
      requiresReason: true,
      requiresApproval: true,
      allowedRoles: ['admin'],
      validationRules: [
        (patient) => patient.suspensionReason !== null
      ]
    }
  ];

  private constructor() {}

  public static getInstance(): PatientStatusManager {
    if (!PatientStatusManager.instance) {
      PatientStatusManager.instance = new PatientStatusManager();
    }
    return PatientStatusManager.instance;
  }

  public async changeStatus(
    patientId: string,
    newStatus: PatientStatus,
    userId: string,
    userRole: string,
    reason?: string,
    metadata: Record<string, any> = {}
  ): Promise<StatusChange> {
    try {
      // Get current patient status
      const { data: patient, error: fetchError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (fetchError) throw fetchError;

      const currentStatus = patient.status as PatientStatus;

      // Validate transition
      await this.validateTransition(
        currentStatus,
        newStatus,
        userRole,
        patient,
        reason
      );

      // Create status change record
      const statusChange: StatusChange = {
        id: crypto.randomUUID(),
        patientId,
        previousStatus: currentStatus,
        newStatus,
        changedAt: new Date(),
        changedBy: userId,
        reason,
        metadata
      };

      // Check if approval is required
      const transition = this.statusTransitions.find(t => t.from === currentStatus);
      if (transition?.requiresApproval) {
        // Create approval request
        const { error: approvalError } = await supabase
          .from('status_change_approvals')
          .insert({
            id: crypto.randomUUID(),
            statusChangeId: statusChange.id,
            requestedBy: userId,
            status: 'pending',
            createdAt: new Date()
          });

        if (approvalError) throw approvalError;

        // Log approval request
        securityLogger.log({
          type: 'status_change',
          severity: 'medium',
          message: 'Status change approval requested',
          metadata: {
            patientId,
            statusChange,
            requestedBy: userId
          }
        });

        return statusChange;
      }

      // Apply status change
      await this.applyStatusChange(statusChange);

      return statusChange;
    } catch (error) {
      securityLogger.log({
        type: 'status_change',
        severity: 'high',
        message: 'Failed to change patient status',
        metadata: {
          patientId,
          newStatus,
          error: error.message
        }
      });
      throw error;
    }
  }

  public async approveStatusChange(
    statusChangeId: string,
    approverId: string,
    approverRole: string
  ): Promise<void> {
    try {
      // Get status change record
      const { data: statusChange, error: fetchError } = await supabase
        .from('status_changes')
        .select('*')
        .eq('id', statusChangeId)
        .single();

      if (fetchError) throw fetchError;

      // Validate approver role
      const transition = this.statusTransitions.find(
        t => t.from === statusChange.previousStatus
      );
      if (!transition?.allowedRoles.includes(approverRole)) {
        throw new Error('Unauthorized to approve status change');
      }

      // Update approval record
      const { error: approvalError } = await supabase
        .from('status_change_approvals')
        .update({
          status: 'approved',
          approvedBy: approverId,
          approvedAt: new Date()
        })
        .eq('statusChangeId', statusChangeId);

      if (approvalError) throw approvalError;

      // Apply status change
      await this.applyStatusChange({
        ...statusChange,
        approvedBy: approverId
      });

      // Log approval
      securityLogger.log({
        type: 'status_change',
        severity: 'low',
        message: 'Status change approved',
        metadata: {
          statusChangeId,
          approverId
        }
      });
    } catch (error) {
      securityLogger.log({
        type: 'status_change',
        severity: 'high',
        message: 'Failed to approve status change',
        metadata: {
          statusChangeId,
          error: error.message
        }
      });
      throw error;
    }
  }

  public async rejectStatusChange(
    statusChangeId: string,
    approverId: string,
    approverRole: string,
    reason: string
  ): Promise<void> {
    try {
      // Get status change record
      const { data: statusChange, error: fetchError } = await supabase
        .from('status_changes')
        .select('*')
        .eq('id', statusChangeId)
        .single();

      if (fetchError) throw fetchError;

      // Validate approver role
      const transition = this.statusTransitions.find(
        t => t.from === statusChange.previousStatus
      );
      if (!transition?.allowedRoles.includes(approverRole)) {
        throw new Error('Unauthorized to reject status change');
      }

      // Update approval record
      const { error: approvalError } = await supabase
        .from('status_change_approvals')
        .update({
          status: 'rejected',
          approvedBy: approverId,
          approvedAt: new Date(),
          rejectionReason: reason
        })
        .eq('statusChangeId', statusChangeId);

      if (approvalError) throw approvalError;

      // Log rejection
      securityLogger.log({
        type: 'status_change',
        severity: 'medium',
        message: 'Status change rejected',
        metadata: {
          statusChangeId,
          approverId,
          reason
        }
      });

      // Log HIPAA audit event
      await hipaaAuditLogger.logModification(
        approverId,
        'system',
        PHICategory.PATIENT_DEMOGRAPHICS,
        statusChange.patientId,
        'status_change_rejection',
        {
          previousStatus: statusChange.previousStatus,
          newStatus: statusChange.newStatus,
          reason
        },
        '127.0.0.1',
        'system',
        true
      );
    } catch (error) {
      securityLogger.log({
        type: 'status_change',
        severity: 'high',
        message: 'Failed to reject status change',
        metadata: {
          statusChangeId,
          error: error.message
        }
      });
      throw error;
    }
  }

  private async validateTransition(
    currentStatus: PatientStatus,
    newStatus: PatientStatus,
    userRole: string,
    patient: any,
    reason?: string
  ): Promise<void> {
    // Find applicable transition rule
    const transition = this.statusTransitions.find(t => t.from === currentStatus);
    if (!transition) {
      throw new Error(`No transition rules defined for status ${currentStatus}`);
    }

    // Check if transition is allowed
    if (!transition.to.includes(newStatus)) {
      throw new Error(
        `Invalid transition from ${currentStatus} to ${newStatus}`
      );
    }

    // Check user role
    if (!transition.allowedRoles.includes(userRole)) {
      throw new Error(`User role ${userRole} not authorized for this transition`);
    }

    // Check if reason is required
    if (transition.requiresReason && !reason) {
      throw new Error('Reason is required for this status change');
    }

    // Run validation rules
    if (transition.validationRules) {
      for (const rule of transition.validationRules) {
        if (!rule(patient)) {
          throw new Error('Validation rule failed for status change');
        }
      }
    }
  }

  private async notifyStatusChange(statusChange: StatusChange): Promise<void> {
    try {
      // Get patient details
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', statusChange.patientId)
        .single();

      if (patientError) throw patientError;

      // Get staff details
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('id', statusChange.changedBy)
        .single();

      if (staffError) throw staffError;

      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          id: crypto.randomUUID(),
          type: 'status_change',
          recipientId: patient.id,
          title: 'Patient Status Updated',
          message: `Your status has been changed from ${statusChange.previousStatus} to ${statusChange.newStatus}`,
          metadata: {
            statusChangeId: statusChange.id,
            previousStatus: statusChange.previousStatus,
            newStatus: statusChange.newStatus,
            changedBy: `${staff.firstName} ${staff.lastName}`,
            reason: statusChange.reason
          },
          createdAt: new Date()
        });

      if (notificationError) throw notificationError;

      // Log notification
      securityLogger.log({
        type: 'notification',
        severity: 'low',
        message: 'Status change notification sent',
        metadata: {
          patientId: statusChange.patientId,
          statusChangeId: statusChange.id
        }
      });
    } catch (error) {
      securityLogger.log({
        type: 'notification',
        severity: 'high',
        message: 'Failed to send status change notification',
        metadata: {
          statusChange,
          error: error.message
        }
      });
      // Don't throw error to prevent blocking status change
    }
  }

  private async applyStatusChange(statusChange: StatusChange): Promise<void> {
    try {
      // Update patient status
      const { error: updateError } = await supabase
        .from('patients')
        .update({
          status: statusChange.newStatus,
          statusChangedAt: statusChange.changedAt,
          statusChangedBy: statusChange.changedBy,
          statusChangeReason: statusChange.reason
        })
        .eq('id', statusChange.patientId);

      if (updateError) throw updateError;

      // Record status change
      const { error: recordError } = await supabase
        .from('status_changes')
        .insert(statusChange);

      if (recordError) throw recordError;

      // Send notification
      await this.notifyStatusChange(statusChange);

      // Log HIPAA audit event
      await hipaaAuditLogger.logModification(
        statusChange.changedBy,
        'system',
        PHICategory.PATIENT_DEMOGRAPHICS,
        statusChange.patientId,
        'status_change',
        {
          previousStatus: statusChange.previousStatus,
          newStatus: statusChange.newStatus,
          reason: statusChange.reason
        },
        '127.0.0.1',
        'system',
        true
      );

      // Log status change
      securityLogger.log({
        type: 'status_change',
        severity: 'low',
        message: 'Patient status changed successfully',
        metadata: {
          patientId: statusChange.patientId,
          previousStatus: statusChange.previousStatus,
          newStatus: statusChange.newStatus,
          changedBy: statusChange.changedBy
        }
      });
    } catch (error) {
      securityLogger.log({
        type: 'status_change',
        severity: 'high',
        message: 'Failed to apply status change',
        metadata: {
          statusChange,
          error: error.message
        }
      });
      throw error;
    }
  }

  public async getStatusHistory(
    patientId: string
  ): Promise<StatusChange[]> {
    try {
      const { data, error } = await supabase
        .from('status_changes')
        .select('*')
        .eq('patientId', patientId)
        .order('changedAt', { ascending: false });

      if (error) throw error;

      return data;
    } catch (error) {
      securityLogger.log({
        type: 'status_change',
        severity: 'high',
        message: 'Failed to get status history',
        metadata: {
          patientId,
          error: error.message
        }
      });
      throw error;
    }
  }

  public async getPendingApprovals(): Promise<Array<StatusChange & { approval: any }>> {
    try {
      const { data, error } = await supabase
        .from('status_changes')
        .select(`
          *,
          approval:status_change_approvals(*)
        `)
        .eq('approval.status', 'pending')
        .order('changedAt', { ascending: false });

      if (error) throw error;

      return data;
    } catch (error) {
      securityLogger.log({
        type: 'status_change',
        severity: 'high',
        message: 'Failed to get pending approvals',
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  public async getStatusChangeStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalChanges: number;
    changesByStatus: Record<PatientStatus, number>;
    changesByRole: Record<string, number>;
    averageApprovalTime: number;
    rejectionRate: number;
  }> {
    try {
      let query = supabase
        .from('status_changes')
        .select(`
          *,
          approval:status_change_approvals(*)
        `);

      if (startDate) {
        query = query.gte('changed_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('changed_at', endDate.toISOString());
      }

      const { data: changes, error } = await query;

      if (error) throw error;

      // Calculate statistics
      const stats = {
        totalChanges: changes.length,
        changesByStatus: {} as Record<PatientStatus, number>,
        changesByRole: {} as Record<string, number>,
        averageApprovalTime: 0,
        rejectionRate: 0
      };

      let totalApprovalTime = 0;
      let approvedCount = 0;
      let rejectedCount = 0;

      changes.forEach(change => {
        // Count by status
        stats.changesByStatus[change.newStatus] = (stats.changesByStatus[change.newStatus] || 0) + 1;

        // Count by role
        const role = change.changedBy.split('-')[0]; // Assuming role is part of the ID
        stats.changesByRole[role] = (stats.changesByRole[role] || 0) + 1;

        // Calculate approval time
        if (change.approval?.approvedAt) {
          const approvalTime = new Date(change.approval.approvedAt).getTime() - 
                             new Date(change.changedAt).getTime();
          totalApprovalTime += approvalTime;
          approvedCount++;
        }

        // Count rejections
        if (change.approval?.status === 'rejected') {
          rejectedCount++;
        }
      });

      // Calculate averages
      stats.averageApprovalTime = approvedCount > 0 ? totalApprovalTime / approvedCount : 0;
      stats.rejectionRate = changes.length > 0 ? (rejectedCount / changes.length) * 100 : 0;

      // Log statistics retrieval
      securityLogger.log({
        type: 'status_change',
        severity: 'low',
        message: 'Status change statistics retrieved',
        metadata: {
          startDate,
          endDate,
          totalChanges: stats.totalChanges
        }
      });

      return stats;
    } catch (error) {
      securityLogger.log({
        type: 'status_change',
        severity: 'high',
        message: 'Failed to get status change statistics',
        metadata: { error: error.message }
      });
      throw error;
    }
  }
}

// Export singleton instance
export const patientStatusManager = PatientStatusManager.getInstance(); 