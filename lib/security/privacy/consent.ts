import { supabase } from '../../supabase';
import { securityLogger } from '../logger';
import { sendEmail } from '../../email';

// Define consent types
export enum ConsentType {
  DATA_COLLECTION = 'data_collection',
  DATA_SHARING = 'data_sharing',
  MARKETING = 'marketing',
  RESEARCH = 'research',
  THIRD_PARTY = 'third_party'
}

// Define consent status
export enum ConsentStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  EXPIRED = 'expired',
  PENDING = 'pending',
  REVOKED = 'revoked'
}

interface Consent {
  id: string;
  patientId: string;
  type: ConsentType;
  status: ConsentStatus;
  grantedAt: number;
  expiresAt?: number;
  purpose: string;
  scope: string[];
  version: string;
  metadata: Record<string, any>;
  ipAddress: string;
  userAgent: string;
}

class ConsentManager {
  private static instance: ConsentManager;

  private constructor() {}

  public static getInstance(): ConsentManager {
    if (!ConsentManager.instance) {
      ConsentManager.instance = new ConsentManager();
    }
    return ConsentManager.instance;
  }

  public async requestConsent(
    patientId: string,
    type: ConsentType,
    purpose: string,
    scope: string[],
    metadata: Record<string, any>,
    ipAddress: string,
    userAgent: string
  ): Promise<Consent> {
    try {
      const consent: Consent = {
        id: crypto.randomUUID(),
        patientId,
        type,
        status: ConsentStatus.PENDING,
        grantedAt: Date.now(),
        purpose,
        scope,
        version: '1.0',
        metadata,
        ipAddress,
        userAgent
      };

      // Store consent request
      const { error } = await supabase
        .from('patient_consents')
        .insert({
          ...consent,
          grantedAt: new Date(consent.grantedAt).toISOString()
        });

      if (error) throw error;

      // Send consent request email
      await this.sendConsentRequestEmail(patientId, consent);

      // Log consent request
      securityLogger.log({
        type: 'privacy',
        severity: 'low',
        message: 'Consent request created',
        metadata: {
          patientId,
          type,
          purpose
        }
      });

      return consent;
    } catch (error) {
      securityLogger.log({
        type: 'privacy',
        severity: 'high',
        message: 'Failed to create consent request',
        metadata: {
          patientId,
          type,
          error: error.message
        }
      });
      throw error;
    }
  }

  public async updateConsent(
    consentId: string,
    status: ConsentStatus,
    expiresAt?: number
  ): Promise<Consent> {
    try {
      const { data, error } = await supabase
        .from('patient_consents')
        .update({
          status,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null
        })
        .eq('id', consentId)
        .select()
        .single();

      if (error) throw error;

      // Send consent update email
      await this.sendConsentUpdateEmail(data.patientId, data);

      // Log consent update
      securityLogger.log({
        type: 'privacy',
        severity: 'low',
        message: 'Consent status updated',
        metadata: {
          consentId,
          status,
          expiresAt
        }
      });

      return {
        ...data,
        grantedAt: new Date(data.grantedAt).getTime(),
        expiresAt: data.expiresAt ? new Date(data.expiresAt).getTime() : undefined
      };
    } catch (error) {
      securityLogger.log({
        type: 'privacy',
        severity: 'high',
        message: 'Failed to update consent',
        metadata: {
          consentId,
          error: error.message
        }
      });
      throw error;
    }
  }

  public async revokeConsent(consentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('patient_consents')
        .update({
          status: ConsentStatus.REVOKED,
          revokedAt: new Date().toISOString()
        })
        .eq('id', consentId);

      if (error) throw error;

      // Log consent revocation
      securityLogger.log({
        type: 'privacy',
        severity: 'medium',
        message: 'Consent revoked',
        metadata: { consentId }
      });
    } catch (error) {
      securityLogger.log({
        type: 'privacy',
        severity: 'high',
        message: 'Failed to revoke consent',
        metadata: {
          consentId,
          error: error.message
        }
      });
      throw error;
    }
  }

  public async getPatientConsents(
    patientId: string,
    type?: ConsentType
  ): Promise<Consent[]> {
    try {
      let query = supabase
        .from('patient_consents')
        .select('*')
        .eq('patientId', patientId)
        .order('grantedAt', { ascending: false });

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map(consent => ({
        ...consent,
        grantedAt: new Date(consent.grantedAt).getTime(),
        expiresAt: consent.expiresAt ? new Date(consent.expiresAt).getTime() : undefined
      }));
    } catch (error) {
      securityLogger.log({
        type: 'privacy',
        severity: 'medium',
        message: 'Failed to retrieve patient consents',
        metadata: {
          patientId,
          error: error.message
        }
      });
      throw error;
    }
  }

  public async checkConsent(
    patientId: string,
    type: ConsentType,
    requiredScope: string[]
  ): Promise<boolean> {
    try {
      const consents = await this.getPatientConsents(patientId, type);
      
      // Check for active consent with required scope
      return consents.some(consent => 
        consent.status === ConsentStatus.GRANTED &&
        !this.isConsentExpired(consent) &&
        requiredScope.every(scope => consent.scope.includes(scope))
      );
    } catch (error) {
      securityLogger.log({
        type: 'privacy',
        severity: 'high',
        message: 'Failed to check consent',
        metadata: {
          patientId,
          type,
          error: error.message
        }
      });
      return false;
    }
  }

  private isConsentExpired(consent: Consent): boolean {
    if (!consent.expiresAt) return false;
    return Date.now() > consent.expiresAt;
  }

  private async sendConsentRequestEmail(patientId: string, consent: Consent): Promise<void> {
    try {
      // Get patient email from database
      const { data: patient } = await supabase
        .from('patients')
        .select('email')
        .eq('id', patientId)
        .single();

      if (!patient?.email) {
        throw new Error('Patient email not found');
      }

      await sendEmail({
        to: patient.email,
        subject: 'Consent Request for Data Usage',
        text: this.formatConsentRequestEmail(consent),
        html: this.formatConsentRequestEmailHtml(consent)
      });
    } catch (error) {
      securityLogger.log({
        type: 'privacy',
        severity: 'medium',
        message: 'Failed to send consent request email',
        metadata: {
          patientId,
          error: error.message
        }
      });
    }
  }

  private async sendConsentUpdateEmail(patientId: string, consent: Consent): Promise<void> {
    try {
      const { data: patient } = await supabase
        .from('patients')
        .select('email')
        .eq('id', patientId)
        .single();

      if (!patient?.email) {
        throw new Error('Patient email not found');
      }

      await sendEmail({
        to: patient.email,
        subject: 'Consent Status Update',
        text: this.formatConsentUpdateEmail(consent),
        html: this.formatConsentUpdateEmailHtml(consent)
      });
    } catch (error) {
      securityLogger.log({
        type: 'privacy',
        severity: 'medium',
        message: 'Failed to send consent update email',
        metadata: {
          patientId,
          error: error.message
        }
      });
    }
  }

  private formatConsentRequestEmail(consent: Consent): string {
    return `
Consent Request for Data Usage

Dear Patient,

We are requesting your consent for the following data usage:

Type: ${consent.type}
Purpose: ${consent.purpose}
Scope: ${consent.scope.join(', ')}

Please review and respond to this consent request at your earliest convenience.

Best regards,
Your Healthcare Provider
    `;
  }

  private formatConsentRequestEmailHtml(consent: Consent): string {
    return `
      <h2>Consent Request for Data Usage</h2>
      <p>Dear Patient,</p>
      <p>We are requesting your consent for the following data usage:</p>
      <ul>
        <li><strong>Type:</strong> ${consent.type}</li>
        <li><strong>Purpose:</strong> ${consent.purpose}</li>
        <li><strong>Scope:</strong> ${consent.scope.join(', ')}</li>
      </ul>
      <p>Please review and respond to this consent request at your earliest convenience.</p>
      <p>Best regards,<br>Your Healthcare Provider</p>
    `;
  }

  private formatConsentUpdateEmail(consent: Consent): string {
    return `
Consent Status Update

Dear Patient,

Your consent status has been updated:

Type: ${consent.type}
Status: ${consent.status}
${consent.expiresAt ? `Expires: ${new Date(consent.expiresAt).toLocaleDateString()}` : ''}

Best regards,
Your Healthcare Provider
    `;
  }

  private formatConsentUpdateEmailHtml(consent: Consent): string {
    return `
      <h2>Consent Status Update</h2>
      <p>Dear Patient,</p>
      <p>Your consent status has been updated:</p>
      <ul>
        <li><strong>Type:</strong> ${consent.type}</li>
        <li><strong>Status:</strong> ${consent.status}</li>
        ${consent.expiresAt ? `<li><strong>Expires:</strong> ${new Date(consent.expiresAt).toLocaleDateString()}</li>` : ''}
      </ul>
      <p>Best regards,<br>Your Healthcare Provider</p>
    `;
  }
}

// Export singleton instance
export const consentManager = ConsentManager.getInstance(); 