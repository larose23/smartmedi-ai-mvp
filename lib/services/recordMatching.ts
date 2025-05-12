import { hipaaAuditLogger, PHICategory } from '../security/hipaa/audit';
import { PatientRecord } from './patientIdentification';
import { Levenshtein } from 'fastest-levenshtein';
import { metaphone } from 'metaphone';

export interface ExternalSystem {
  id: string;
  name: string;
  description: string;
  identifierPrefix: string;
  apiEndpoint?: string;
  apiKey?: string;
}

export interface ExternalIdentifier {
  systemId: string;
  externalId: string;
  patientId: string;
  lastUpdated: Date;
  confidence: number;
  source: 'manual' | 'automatic' | 'import';
  verified: boolean;
}

export interface MatchResult {
  patientId: string;
  matchScore: number;
  matchFactors: {
    name: string;
    score: number;
    details: string;
  }[];
  externalIdentifiers: ExternalIdentifier[];
  status: 'matched' | 'potential' | 'unmatched';
  lastUpdated: Date;
}

export interface MasterPatientIndex {
  patientId: string;
  primaryRecord: PatientRecord;
  externalIdentifiers: ExternalIdentifier[];
  matchResults: MatchResult[];
  lastUpdated: Date;
  createdBy: string;
  updatedBy: string;
}

export class RecordMatchingService {
  private static instance: RecordMatchingService;
  private readonly MATCH_THRESHOLD = 0.85;
  private readonly NAME_WEIGHT = 0.4;
  private readonly DOB_WEIGHT = 0.3;
  private readonly IDENTIFIER_WEIGHT = 0.3;

  private readonly externalSystems: ExternalSystem[] = [
    {
      id: 'emr1',
      name: 'Primary EMR',
      description: 'Main electronic medical record system',
      identifierPrefix: 'EMR1'
    },
    {
      id: 'lab',
      name: 'Laboratory System',
      description: 'External laboratory information system',
      identifierPrefix: 'LAB'
    },
    {
      id: 'pharmacy',
      name: 'Pharmacy System',
      description: 'External pharmacy management system',
      identifierPrefix: 'PHARM'
    }
  ];

  private constructor() {}

  public static getInstance(): RecordMatchingService {
    if (!RecordMatchingService.instance) {
      RecordMatchingService.instance = new RecordMatchingService();
    }
    return RecordMatchingService.instance;
  }

  async findMatches(
    patient: PatientRecord,
    userId: string
  ): Promise<MatchResult[]> {
    try {
      // In a real implementation, this would:
      // 1. Query external systems
      // 2. Search local database
      // 3. Calculate match scores
      const matches: MatchResult[] = [];

      // Simulate finding matches in external systems
      for (const system of this.externalSystems) {
        const externalMatches = await this.findMatchesInSystem(patient, system);
        matches.push(...externalMatches);
      }

      await hipaaAuditLogger.logAccess(
        userId,
        'provider',
        PHICategory.PHI,
        'patient_record_match_search',
        { patientId: patient.id },
        '127.0.0.1',
        'RecordMatchingService',
        true
      );

      return matches;
    } catch (error) {
      await hipaaAuditLogger.logError(
        userId,
        'provider',
        PHICategory.PHI,
        'patient_record_match_error',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        '127.0.0.1',
        'RecordMatchingService'
      );
      throw error;
    }
  }

  private async findMatchesInSystem(
    patient: PatientRecord,
    system: ExternalSystem
  ): Promise<MatchResult[]> {
    // In a real implementation, this would call the system's API
    // For now, return mock data
    return [
      {
        patientId: `${system.identifierPrefix}-${Math.random().toString(36).substr(2, 9)}`,
        matchScore: 0.9,
        matchFactors: [
          {
            name: 'Name Match',
            score: 0.95,
            details: `First name: ${patient.firstName}, Last name: ${patient.lastName}`
          },
          {
            name: 'DOB Match',
            score: 1.0,
            details: patient.dateOfBirth.toISOString()
          }
        ],
        externalIdentifiers: [
          {
            systemId: system.id,
            externalId: `${system.identifierPrefix}-${Math.random().toString(36).substr(2, 9)}`,
            patientId: patient.id,
            lastUpdated: new Date(),
            confidence: 0.9,
            source: 'automatic',
            verified: true
          }
        ],
        status: 'matched',
        lastUpdated: new Date()
      }
    ];
  }

  async updateMasterPatientIndex(
    patientId: string,
    externalIdentifier: ExternalIdentifier,
    userId: string
  ): Promise<MasterPatientIndex> {
    try {
      // In a real implementation, this would:
      // 1. Update the master patient index
      // 2. Sync with external systems
      // 3. Update audit trail
      const mpi: MasterPatientIndex = {
        patientId,
        primaryRecord: await this.getPatientRecord(patientId),
        externalIdentifiers: [externalIdentifier],
        matchResults: [],
        lastUpdated: new Date(),
        createdBy: userId,
        updatedBy: userId
      };

      await hipaaAuditLogger.logAccess(
        userId,
        'provider',
        PHICategory.PHI,
        'master_patient_index_update',
        {
          patientId,
          systemId: externalIdentifier.systemId,
          externalId: externalIdentifier.externalId
        },
        '127.0.0.1',
        'RecordMatchingService',
        true
      );

      return mpi;
    } catch (error) {
      await hipaaAuditLogger.logError(
        userId,
        'provider',
        PHICategory.PHI,
        'master_patient_index_update_error',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        '127.0.0.1',
        'RecordMatchingService'
      );
      throw error;
    }
  }

  async getMasterPatientIndex(patientId: string): Promise<MasterPatientIndex | null> {
    try {
      // In a real implementation, this would query a database
      // For now, return mock data
      const mockMpi: MasterPatientIndex = {
        patientId,
        primaryRecord: await this.getPatientRecord(patientId),
        externalIdentifiers: [
          {
            systemId: 'emr1',
            externalId: 'EMR1-123456',
            patientId,
            lastUpdated: new Date(),
            confidence: 1.0,
            source: 'manual',
            verified: true
          },
          {
            systemId: 'lab',
            externalId: 'LAB-789012',
            patientId,
            lastUpdated: new Date(),
            confidence: 0.95,
            source: 'automatic',
            verified: true
          }
        ],
        matchResults: [
          {
            patientId: 'EMR1-123456',
            matchScore: 0.95,
            matchFactors: [
              {
                name: 'Name Match',
                score: 1.0,
                details: 'Exact name match'
              },
              {
                name: 'DOB Match',
                score: 1.0,
                details: 'Exact DOB match'
              }
            ],
            externalIdentifiers: [
              {
                systemId: 'emr1',
                externalId: 'EMR1-123456',
                patientId,
                lastUpdated: new Date(),
                confidence: 1.0,
                source: 'manual',
                verified: true
              }
            ],
            status: 'matched',
            lastUpdated: new Date()
          }
        ],
        lastUpdated: new Date(),
        createdBy: 'system',
        updatedBy: 'system'
      };

      return mockMpi;
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'master_patient_index_error',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        '127.0.0.1',
        'RecordMatchingService'
      );
      throw error;
    }
  }

  private async getPatientRecord(patientId: string): Promise<PatientRecord> {
    // In a real implementation, this would query a database
    // For now, return mock data
    return {
      id: patientId,
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('1980-01-01'),
      gender: 'M',
      address: {
        street: '123 Main St',
        city: 'Boston',
        state: 'MA',
        zipCode: '02108'
      },
      phoneNumber: '555-0123',
      lastUpdated: new Date()
    };
  }

  async calculateMatchScore(
    patient1: PatientRecord,
    patient2: PatientRecord
  ): Promise<number> {
    const nameScore = this.calculateNameScore(patient1, patient2);
    const dobScore = this.calculateDOBScore(patient1, patient2);
    const identifierScore = this.calculateIdentifierScore(patient1, patient2);

    return (
      nameScore * this.NAME_WEIGHT +
      dobScore * this.DOB_WEIGHT +
      identifierScore * this.IDENTIFIER_WEIGHT
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

  private calculateIdentifierScore(patient1: PatientRecord, patient2: PatientRecord): number {
    // In a real implementation, this would compare various identifiers
    // For now, return a simple comparison
    return patient1.medicalRecordNumber === patient2.medicalRecordNumber ? 1 : 0;
  }

  getExternalSystems(): ExternalSystem[] {
    return [...this.externalSystems];
  }
} 