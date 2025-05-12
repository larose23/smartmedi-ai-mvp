import { hipaaAuditLogger, PHICategory } from '../security/hipaa/audit';
import { PatientRecord } from './patientIdentification';

export interface VerificationMethod {
  id: string;
  name: string;
  description: string;
  confidenceLevel: 'high' | 'medium' | 'low';
}

export interface VerificationResult {
  id: string;
  patientId: string;
  method: VerificationMethod;
  status: 'verified' | 'failed' | 'pending';
  verifiedAt: Date;
  verifiedBy: string;
  notes?: string;
  confidenceScore: number;
  verificationData: {
    [key: string]: any;
  };
}

export interface VerificationWorkflow {
  id: string;
  name: string;
  description: string;
  requiredMethods: VerificationMethod[];
  minimumConfidenceScore: number;
}

export class PatientVerificationService {
  private static instance: PatientVerificationService;
  private readonly verificationMethods: VerificationMethod[] = [
    {
      id: 'gov_id',
      name: 'Government ID',
      description: 'Verification using government-issued identification',
      confidenceLevel: 'high'
    },
    {
      id: 'insurance_card',
      name: 'Insurance Card',
      description: 'Verification using insurance card information',
      confidenceLevel: 'medium'
    },
    {
      id: 'knowledge_based',
      name: 'Knowledge-Based Authentication',
      description: 'Verification through personal knowledge questions',
      confidenceLevel: 'medium'
    },
    {
      id: 'phone_verification',
      name: 'Phone Verification',
      description: 'Verification through phone number confirmation',
      confidenceLevel: 'low'
    },
    {
      id: 'email_verification',
      name: 'Email Verification',
      description: 'Verification through email confirmation',
      confidenceLevel: 'low'
    }
  ];

  private readonly defaultWorkflow: VerificationWorkflow = {
    id: 'standard',
    name: 'Standard Verification',
    description: 'Standard patient verification workflow',
    requiredMethods: [
      this.verificationMethods.find(m => m.id === 'gov_id')!,
      this.verificationMethods.find(m => m.id === 'insurance_card')!
    ],
    minimumConfidenceScore: 0.8
  };

  private constructor() {}

  public static getInstance(): PatientVerificationService {
    if (!PatientVerificationService.instance) {
      PatientVerificationService.instance = new PatientVerificationService();
    }
    return PatientVerificationService.instance;
  }

  async verifyPatientIdentity(
    patient: PatientRecord,
    method: VerificationMethod,
    userId: string,
    verificationData: any
  ): Promise<VerificationResult> {
    try {
      // In a real implementation, this would:
      // 1. Call external verification services
      // 2. Validate the provided data
      // 3. Calculate confidence score
      const confidenceScore = await this.calculateConfidenceScore(method, verificationData);
      const status = confidenceScore >= 0.8 ? 'verified' : 'failed';

      const result: VerificationResult = {
        id: Math.random().toString(36).substr(2, 9),
        patientId: patient.id,
        method,
        status,
        verifiedAt: new Date(),
        verifiedBy: userId,
        confidenceScore,
        verificationData
      };

      await hipaaAuditLogger.logAccess(
        userId,
        'provider',
        PHICategory.PHI,
        'patient_verification',
        {
          patientId: patient.id,
          method: method.id,
          status,
          confidenceScore
        },
        '127.0.0.1',
        'PatientVerificationService',
        true
      );

      return result;
    } catch (error) {
      await hipaaAuditLogger.logError(
        userId,
        'provider',
        PHICategory.PHI,
        'patient_verification_error',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        '127.0.0.1',
        'PatientVerificationService'
      );
      throw error;
    }
  }

  async getVerificationHistory(patientId: string): Promise<VerificationResult[]> {
    try {
      // In a real implementation, this would query a database
      // For now, return mock data
      return [
        {
          id: '1',
          patientId,
          method: this.verificationMethods.find(m => m.id === 'gov_id')!,
          status: 'verified',
          verifiedAt: new Date('2024-03-15'),
          verifiedBy: 'provider1',
          confidenceScore: 0.95,
          verificationData: {
            idNumber: 'DL12345678',
            expirationDate: '2025-03-15'
          }
        },
        {
          id: '2',
          patientId,
          method: this.verificationMethods.find(m => m.id === 'insurance_card')!,
          status: 'verified',
          verifiedAt: new Date('2024-03-15'),
          verifiedBy: 'provider1',
          confidenceScore: 0.85,
          verificationData: {
            provider: 'Blue Cross',
            policyNumber: 'BC123456789'
          }
        },
        {
          id: '3',
          patientId,
          method: this.verificationMethods.find(m => m.id === 'phone_verification')!,
          status: 'failed',
          verifiedAt: new Date('2024-03-14'),
          verifiedBy: 'provider2',
          confidenceScore: 0.45,
          verificationData: {
            phoneNumber: '555-0123',
            verificationCode: '123456'
          },
          notes: 'Phone number not in service'
        }
      ];
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'verification_history_error',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        '127.0.0.1',
        'PatientVerificationService'
      );
      throw error;
    }
  }

  async getVerificationStatus(patientId: string): Promise<{
    isVerified: boolean;
    lastVerified: Date | null;
    confidenceScore: number;
    requiredMethods: VerificationMethod[];
    completedMethods: VerificationMethod[];
  }> {
    try {
      const history = await this.getVerificationHistory(patientId);
      const completedMethods = history
        .filter(r => r.status === 'verified')
        .map(r => r.method);

      return {
        isVerified: completedMethods.length >= this.defaultWorkflow.requiredMethods.length,
        lastVerified: history.length > 0 ? history[0].verifiedAt : null,
        confidenceScore: history.reduce((acc, curr) => acc + curr.confidenceScore, 0) / history.length || 0,
        requiredMethods: this.defaultWorkflow.requiredMethods,
        completedMethods
      };
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'verification_status_error',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        '127.0.0.1',
        'PatientVerificationService'
      );
      throw error;
    }
  }

  private async calculateConfidenceScore(
    method: VerificationMethod,
    data: any
  ): Promise<number> {
    // In a real implementation, this would:
    // 1. Validate the provided data
    // 2. Check against external services
    // 3. Calculate a confidence score based on multiple factors
    const baseScore = {
      'high': 0.9,
      'medium': 0.7,
      'low': 0.5
    }[method.confidenceLevel];

    // Add some randomness to simulate real-world verification
    return Math.min(1, baseScore + (Math.random() * 0.1));
  }

  getAvailableVerificationMethods(): VerificationMethod[] {
    return [...this.verificationMethods];
  }

  getDefaultWorkflow(): VerificationWorkflow {
    return { ...this.defaultWorkflow };
  }

  // Add method to validate verification data
  private validateVerificationData(method: VerificationMethod, data: any): boolean {
    switch (method.id) {
      case 'gov_id':
        return !!data.idNumber && !!data.expirationDate;
      case 'insurance_card':
        return !!data.provider && !!data.policyNumber;
      case 'knowledge_based':
        return !!data.answers && Object.keys(data.answers).length >= 3;
      case 'phone_verification':
        return !!data.phoneNumber && !!data.verificationCode;
      case 'email_verification':
        return !!data.email && !!data.verificationCode;
      default:
        return false;
    }
  }

  // Add method to get verification requirements
  getVerificationRequirements(method: VerificationMethod): {
    fields: { name: string; type: string; required: boolean }[];
    description: string;
  } {
    switch (method.id) {
      case 'gov_id':
        return {
          fields: [
            { name: 'idNumber', type: 'text', required: true },
            { name: 'expirationDate', type: 'date', required: true }
          ],
          description: 'Please provide a valid government-issued ID number and expiration date.'
        };
      case 'insurance_card':
        return {
          fields: [
            { name: 'provider', type: 'text', required: true },
            { name: 'policyNumber', type: 'text', required: true }
          ],
          description: 'Please provide your insurance provider name and policy number.'
        };
      case 'knowledge_based':
        return {
          fields: [
            { name: 'answers', type: 'object', required: true }
          ],
          description: 'Please answer the following security questions.'
        };
      case 'phone_verification':
        return {
          fields: [
            { name: 'phoneNumber', type: 'tel', required: true },
            { name: 'verificationCode', type: 'text', required: true }
          ],
          description: 'Please provide your phone number and the verification code sent to it.'
        };
      case 'email_verification':
        return {
          fields: [
            { name: 'email', type: 'email', required: true },
            { name: 'verificationCode', type: 'text', required: true }
          ],
          description: 'Please provide your email address and the verification code sent to it.'
        };
      default:
        return {
          fields: [],
          description: 'No specific requirements for this verification method.'
        };
    }
  }
} 