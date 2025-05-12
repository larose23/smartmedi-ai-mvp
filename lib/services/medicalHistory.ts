import { hipaaAuditLogger, PHICategory } from '../security/hipaa/audit';
import { DrugInteractionChecker } from './drugInteractions';

export interface MedicalCondition {
  id: string;
  name: string;
  icd10Code?: string;
  onsetDate: Date;
  status: 'active' | 'resolved' | 'chronic';
  severity: 'mild' | 'moderate' | 'severe';
  notes?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  prescribedBy?: string;
  notes?: string;
  ndcCode?: string;
}

export interface FamilyMember {
  id: string;
  relationship: string;
  age?: number;
  living: boolean;
  conditions: MedicalCondition[];
  notes?: string;
}

export interface FamilyHistory {
  id: string;
  patientId: string;
  members: FamilyMember[];
  inheritancePatterns: {
    condition: string;
    pattern: 'autosomal_dominant' | 'autosomal_recessive' | 'x_linked' | 'mitochondrial' | 'unknown';
    affectedMembers: string[];
  }[];
}

export interface MedicalHistory {
  id: string;
  patientId: string;
  conditions: MedicalCondition[];
  medications: Medication[];
  allergies: {
    id: string;
    allergen: string;
    reaction: string;
    severity: 'mild' | 'moderate' | 'severe';
  }[];
  surgeries: {
    id: string;
    procedure: string;
    date: Date;
    notes?: string;
  }[];
  familyHistory: FamilyHistory;
  lastUpdated: Date;
}

export interface MedicalHistoryVersion {
  id: string;
  patientId: string;
  timestamp: Date;
  changes: {
    type: 'condition' | 'medication' | 'allergy' | 'surgery' | 'family';
    action: 'add' | 'update' | 'remove';
    data: any;
  }[];
  updatedBy: string;
}

export class MedicalHistoryService {
  private static instance: MedicalHistoryService;
  private drugInteractionChecker: DrugInteractionChecker;

  private constructor() {
    this.drugInteractionChecker = DrugInteractionChecker.getInstance();
  }

  public static getInstance(): MedicalHistoryService {
    if (!MedicalHistoryService.instance) {
      MedicalHistoryService.instance = new MedicalHistoryService();
    }
    return MedicalHistoryService.instance;
  }

  async getMedicalHistory(patientId: string): Promise<MedicalHistory> {
    try {
      // TODO: Implement database fetch
      const history = await this.fetchFromDatabase(patientId);
      
      await hipaaAuditLogger.logAccess(
        'system',
        'provider',
        PHICategory.PHI,
        'medical_history_access',
        { patientId },
        '127.0.0.1',
        'MedicalHistoryService',
        true
      );

      return history;
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'medical_history_access_error',
        { patientId, error: error.message },
        '127.0.0.1',
        'MedicalHistoryService'
      );
      throw error;
    }
  }

  async addCondition(patientId: string, condition: MedicalCondition): Promise<void> {
    try {
      // TODO: Implement database update
      await this.updateDatabase(patientId, { conditions: [condition] });
      
      await hipaaAuditLogger.logAccess(
        'system',
        'provider',
        PHICategory.PHI,
        'medical_condition_add',
        { patientId, conditionId: condition.id },
        '127.0.0.1',
        'MedicalHistoryService',
        true
      );
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'medical_condition_add_error',
        { patientId, error: error.message },
        '127.0.0.1',
        'MedicalHistoryService'
      );
      throw error;
    }
  }

  async addMedication(patientId: string, medication: Medication): Promise<{
    medication: Medication;
    interactions: any[];
  }> {
    try {
      const history = await this.getMedicalHistory(patientId);
      const interactions = await this.drugInteractionChecker.checkInteractions(
        medication,
        history.medications
      );

      // TODO: Implement database update
      await this.updateDatabase(patientId, { medications: [medication] });
      
      await hipaaAuditLogger.logAccess(
        'system',
        'provider',
        PHICategory.PHI,
        'medication_add',
        { patientId, medicationId: medication.id },
        '127.0.0.1',
        'MedicalHistoryService',
        true
      );

      return { medication, interactions };
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'medication_add_error',
        { patientId, error: error.message },
        '127.0.0.1',
        'MedicalHistoryService'
      );
      throw error;
    }
  }

  async updateFamilyHistory(patientId: string, familyHistory: FamilyHistory): Promise<void> {
    try {
      // TODO: Implement database update
      await this.updateDatabase(patientId, { familyHistory });
      
      await hipaaAuditLogger.logAccess(
        'system',
        'provider',
        PHICategory.PHI,
        'family_history_update',
        { patientId },
        '127.0.0.1',
        'MedicalHistoryService',
        true
      );
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'family_history_update_error',
        { patientId, error: error.message },
        '127.0.0.1',
        'MedicalHistoryService'
      );
      throw error;
    }
  }

  async addAllergy(patientId: string, allergy: {
    allergen: string;
    reaction: string;
    severity: 'mild' | 'moderate' | 'severe';
  }): Promise<void> {
    try {
      await this.updateDatabase(patientId, { allergies: [allergy] });
      
      await hipaaAuditLogger.logAccess(
        'system',
        'provider',
        PHICategory.PHI,
        'allergy_add',
        { patientId, allergen: allergy.allergen },
        '127.0.0.1',
        'MedicalHistoryService',
        true
      );
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'allergy_add_error',
        { patientId, error: error.message },
        '127.0.0.1',
        'MedicalHistoryService'
      );
      throw error;
    }
  }

  async addSurgery(patientId: string, surgery: {
    procedure: string;
    date: Date;
    notes?: string;
  }): Promise<void> {
    try {
      await this.updateDatabase(patientId, { surgeries: [surgery] });
      
      await hipaaAuditLogger.logAccess(
        'system',
        'provider',
        PHICategory.PHI,
        'surgery_add',
        { patientId, procedure: surgery.procedure },
        '127.0.0.1',
        'MedicalHistoryService',
        true
      );
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'surgery_add_error',
        { patientId, error: error.message },
        '127.0.0.1',
        'MedicalHistoryService'
      );
      throw error;
    }
  }

  async batchUpdate(patientId: string, updates: {
    conditions?: MedicalCondition[];
    medications?: Medication[];
    allergies?: { allergen: string; reaction: string; severity: 'mild' | 'moderate' | 'severe'; }[];
    surgeries?: { procedure: string; date: Date; notes?: string; }[];
    familyHistory?: FamilyHistory;
  }): Promise<void> {
    try {
      await this.updateDatabase(patientId, updates);
      
      await hipaaAuditLogger.logAccess(
        'system',
        'provider',
        PHICategory.PHI,
        'medical_history_batch_update',
        { patientId, updateTypes: Object.keys(updates) },
        '127.0.0.1',
        'MedicalHistoryService',
        true
      );
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'medical_history_batch_update_error',
        { patientId, error: error.message },
        '127.0.0.1',
        'MedicalHistoryService'
      );
      throw error;
    }
  }

  async getHistoryVersions(patientId: string): Promise<MedicalHistoryVersion[]> {
    try {
      // TODO: Implement database fetch for history versions
      const versions = await this.fetchVersionsFromDatabase(patientId);
      
      await hipaaAuditLogger.logAccess(
        'system',
        'provider',
        PHICategory.PHI,
        'medical_history_versions_access',
        { patientId },
        '127.0.0.1',
        'MedicalHistoryService',
        true
      );

      return versions;
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'medical_history_versions_access_error',
        { patientId, error: error.message },
        '127.0.0.1',
        'MedicalHistoryService'
      );
      throw error;
    }
  }

  async revertToVersion(patientId: string, versionId: string): Promise<void> {
    try {
      // TODO: Implement version reversion
      await this.revertDatabaseToVersion(patientId, versionId);
      
      await hipaaAuditLogger.logAccess(
        'system',
        'provider',
        PHICategory.PHI,
        'medical_history_revert',
        { patientId, versionId },
        '127.0.0.1',
        'MedicalHistoryService',
        true
      );
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'medical_history_revert_error',
        { patientId, versionId, error: error.message },
        '127.0.0.1',
        'MedicalHistoryService'
      );
      throw error;
    }
  }

  private async fetchFromDatabase(patientId: string): Promise<MedicalHistory> {
    // TODO: Implement actual database fetch
    return {
      id: 'temp-id',
      patientId,
      conditions: [],
      medications: [],
      allergies: [],
      surgeries: [],
      familyHistory: {
        id: 'temp-family-id',
        patientId,
        members: [],
        inheritancePatterns: []
      },
      lastUpdated: new Date()
    };
  }

  private async updateDatabase(patientId: string, updates: Partial<MedicalHistory>): Promise<void> {
    // TODO: Implement actual database update
    return;
  }

  private async fetchVersionsFromDatabase(patientId: string): Promise<MedicalHistoryVersion[]> {
    // TODO: Implement actual database fetch
    return [];
  }

  private async revertDatabaseToVersion(patientId: string, versionId: string): Promise<void> {
    // TODO: Implement actual version reversion
    return;
  }
} 