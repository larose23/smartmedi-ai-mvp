import { hipaaAuditLogger, PHICategory } from '../security/hipaa/audit';
import { Levenshtein } from 'fastest-levenshtein';
import { metaphone } from 'metaphone';

export interface PatientRecord {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  phoneNumber: string;
  email?: string;
  medicalRecordNumber?: string;
  ssn?: string;
  lastUpdated: Date;
}

export interface DuplicateMatch {
  patient1: PatientRecord;
  patient2: PatientRecord;
  matchScore: number;
  matchFactors: {
    name: string;
    score: number;
    details: string;
  }[];
  status: 'pending' | 'reviewed' | 'merged' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  mergeNotes?: string;
}

export class PatientIdentificationService {
  private static instance: PatientIdentificationService;
  private readonly MATCH_THRESHOLD = 0.85;
  private readonly NAME_WEIGHT = 0.4;
  private readonly DOB_WEIGHT = 0.3;
  private readonly ADDRESS_WEIGHT = 0.2;
  private readonly PHONE_WEIGHT = 0.1;

  private constructor() {}

  public static getInstance(): PatientIdentificationService {
    if (!PatientIdentificationService.instance) {
      PatientIdentificationService.instance = new PatientIdentificationService();
    }
    return PatientIdentificationService.instance;
  }

  async findPotentialDuplicates(patient: PatientRecord): Promise<DuplicateMatch[]> {
    try {
      // In a real implementation, this would query a database
      // For now, we'll use a mock database of patients
      const allPatients = await this.getAllPatients();
      const potentialMatches: DuplicateMatch[] = [];

      for (const otherPatient of allPatients) {
        if (otherPatient.id === patient.id) continue;

        const matchScore = this.calculateMatchScore(patient, otherPatient);
        if (matchScore >= this.MATCH_THRESHOLD) {
          const matchFactors = this.getMatchFactors(patient, otherPatient);
          potentialMatches.push({
            patient1: patient,
            patient2: otherPatient,
            matchScore,
            matchFactors,
            status: 'pending'
          });
        }
      }

      await hipaaAuditLogger.logAccess(
        'system',
        'provider',
        PHICategory.PHI,
        'duplicate_patient_search',
        { patientId: patient.id },
        '127.0.0.1',
        'PatientIdentificationService',
        true
      );

      return potentialMatches;
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'duplicate_patient_search_error',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        '127.0.0.1',
        'PatientIdentificationService'
      );
      throw error;
    }
  }

  private calculateMatchScore(patient1: PatientRecord, patient2: PatientRecord): number {
    const nameScore = this.calculateNameScore(patient1, patient2);
    const dobScore = this.calculateDOBScore(patient1, patient2);
    const addressScore = this.calculateAddressScore(patient1, patient2);
    const phoneScore = this.calculatePhoneScore(patient1, patient2);

    return (
      nameScore * this.NAME_WEIGHT +
      dobScore * this.DOB_WEIGHT +
      addressScore * this.ADDRESS_WEIGHT +
      phoneScore * this.PHONE_WEIGHT
    );
  }

  private calculateNameScore(patient1: PatientRecord, patient2: PatientRecord): number {
    const firstNameScore = this.calculateStringSimilarity(
      patient1.firstName.toLowerCase(),
      patient2.firstName.toLowerCase()
    );
    const lastNameScore = this.calculateStringSimilarity(
      patient1.lastName.toLowerCase(),
      patient2.lastName.toLowerCase()
    );
    const metaphoneScore = this.calculateMetaphoneScore(patient1, patient2);

    return (firstNameScore + lastNameScore + metaphoneScore) / 3;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;
    const distance = Levenshtein.distance(str1, str2);
    return 1 - distance / maxLength;
  }

  private calculateMetaphoneScore(patient1: PatientRecord, patient2: PatientRecord): number {
    const firstName1 = metaphone(patient1.firstName);
    const firstName2 = metaphone(patient2.firstName);
    const lastName1 = metaphone(patient1.lastName);
    const lastName2 = metaphone(patient2.lastName);

    const firstNameMatch = firstName1 === firstName2 ? 1 : 0;
    const lastNameMatch = lastName1 === lastName2 ? 1 : 0;

    return (firstNameMatch + lastNameMatch) / 2;
  }

  private calculateDOBScore(patient1: PatientRecord, patient2: PatientRecord): number {
    return patient1.dateOfBirth.getTime() === patient2.dateOfBirth.getTime() ? 1 : 0;
  }

  private calculateAddressScore(patient1: PatientRecord, patient2: PatientRecord): number {
    const streetScore = this.calculateStringSimilarity(
      patient1.address.street.toLowerCase(),
      patient2.address.street.toLowerCase()
    );
    const cityScore = this.calculateStringSimilarity(
      patient1.address.city.toLowerCase(),
      patient2.address.city.toLowerCase()
    );
    const stateScore = patient1.address.state === patient2.address.state ? 1 : 0;
    const zipScore = patient1.address.zipCode === patient2.address.zipCode ? 1 : 0;

    return (streetScore + cityScore + stateScore + zipScore) / 4;
  }

  private calculatePhoneScore(patient1: PatientRecord, patient2: PatientRecord): number {
    const phone1 = this.normalizePhoneNumber(patient1.phoneNumber);
    const phone2 = this.normalizePhoneNumber(patient2.phoneNumber);
    return phone1 === phone2 ? 1 : 0;
  }

  private normalizePhoneNumber(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private getMatchFactors(patient1: PatientRecord, patient2: PatientRecord): { name: string; score: number; details: string }[] {
    const factors = [];

    const nameScore = this.calculateNameScore(patient1, patient2);
    factors.push({
      name: 'Name Match',
      score: nameScore,
      details: `First name: ${patient1.firstName} vs ${patient2.firstName}, Last name: ${patient1.lastName} vs ${patient2.lastName}`
    });

    const dobScore = this.calculateDOBScore(patient1, patient2);
    factors.push({
      name: 'Date of Birth Match',
      score: dobScore,
      details: `${patient1.dateOfBirth.toISOString()} vs ${patient2.dateOfBirth.toISOString()}`
    });

    const addressScore = this.calculateAddressScore(patient1, patient2);
    factors.push({
      name: 'Address Match',
      score: addressScore,
      details: `${patient1.address.street}, ${patient1.address.city} vs ${patient2.address.street}, ${patient2.address.city}`
    });

    const phoneScore = this.calculatePhoneScore(patient1, patient2);
    factors.push({
      name: 'Phone Match',
      score: phoneScore,
      details: `${patient1.phoneNumber} vs ${patient2.phoneNumber}`
    });

    return factors;
  }

  async updateDuplicateStatus(
    match: DuplicateMatch,
    status: 'reviewed' | 'merged' | 'rejected',
    userId: string,
    notes?: string
  ): Promise<void> {
    try {
      // In a real implementation, this would update a database
      match.status = status;
      match.reviewedBy = userId;
      match.reviewedAt = new Date();
      match.mergeNotes = notes;

      await hipaaAuditLogger.logAccess(
        userId,
        'provider',
        PHICategory.PHI,
        'duplicate_patient_status_update',
        { 
          patient1Id: match.patient1.id,
          patient2Id: match.patient2.id,
          status,
          notes
        },
        '127.0.0.1',
        'PatientIdentificationService',
        true
      );
    } catch (error) {
      await hipaaAuditLogger.logError(
        userId,
        'provider',
        PHICategory.PHI,
        'duplicate_patient_status_update_error',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        '127.0.0.1',
        'PatientIdentificationService'
      );
      throw error;
    }
  }

  private async getAllPatients(): Promise<PatientRecord[]> {
    // Mock data for testing
    return [
      {
        id: '1',
        firstName: 'John',
        lastName: 'Smith',
        dateOfBirth: new Date('1980-01-15'),
        gender: 'M',
        address: {
          street: '123 Main St',
          city: 'Boston',
          state: 'MA',
          zipCode: '02108'
        },
        phoneNumber: '617-555-0123',
        email: 'john.smith@email.com',
        medicalRecordNumber: 'MRN001',
        lastUpdated: new Date()
      },
      {
        id: '2',
        firstName: 'Jon',
        lastName: 'Smyth',
        dateOfBirth: new Date('1980-01-15'),
        gender: 'M',
        address: {
          street: '123 Maine Street',
          city: 'Boston',
          state: 'MA',
          zipCode: '02108'
        },
        phoneNumber: '617-555-0123',
        email: 'jon.smyth@email.com',
        medicalRecordNumber: 'MRN002',
        lastUpdated: new Date()
      },
      {
        id: '3',
        firstName: 'Jane',
        lastName: 'Doe',
        dateOfBirth: new Date('1985-06-20'),
        gender: 'F',
        address: {
          street: '456 Oak Ave',
          city: 'Cambridge',
          state: 'MA',
          zipCode: '02139'
        },
        phoneNumber: '617-555-0456',
        email: 'jane.doe@email.com',
        medicalRecordNumber: 'MRN003',
        lastUpdated: new Date()
      }
    ];
  }

  // Add method to merge patient records
  async mergePatientRecords(
    primaryPatient: PatientRecord,
    secondaryPatient: PatientRecord,
    userId: string,
    notes?: string
  ): Promise<PatientRecord> {
    try {
      // In a real implementation, this would:
      // 1. Merge the records in the database
      // 2. Update all references to the secondary record
      // 3. Archive the secondary record
      // 4. Create an audit trail

      const mergedPatient: PatientRecord = {
        ...primaryPatient,
        // Merge any unique information from the secondary record
        email: primaryPatient.email || secondaryPatient.email,
        medicalRecordNumber: primaryPatient.medicalRecordNumber || secondaryPatient.medicalRecordNumber,
        lastUpdated: new Date()
      };

      await hipaaAuditLogger.logAccess(
        userId,
        'provider',
        PHICategory.PHI,
        'patient_records_merged',
        {
          primaryPatientId: primaryPatient.id,
          secondaryPatientId: secondaryPatient.id,
          notes
        },
        '127.0.0.1',
        'PatientIdentificationService',
        true
      );

      return mergedPatient;
    } catch (error) {
      await hipaaAuditLogger.logError(
        userId,
        'provider',
        PHICategory.PHI,
        'patient_records_merge_error',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        '127.0.0.1',
        'PatientIdentificationService'
      );
      throw error;
    }
  }

  // Add method to get merge history
  async getMergeHistory(patientId: string): Promise<{
    mergedFrom: string[];
    mergedInto?: string;
    mergeDate: Date;
    mergedBy: string;
    notes?: string;
  }[]> {
    try {
      // In a real implementation, this would query a database
      // For now, return mock data
      return [];
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'merge_history_error',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        '127.0.0.1',
        'PatientIdentificationService'
      );
      throw error;
    }
  }
} 