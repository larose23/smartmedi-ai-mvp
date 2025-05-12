import { securityLogger } from './logger';
import { supabase } from '../supabase';
import { authenticator } from 'otplib';
import { randomBytes } from 'crypto';
import { sendEmail } from '../email';

// Define sensitive operations that require MFA
export enum SensitiveOperation {
  PATIENT_DELETE = 'patient_delete',
  APPOINTMENT_CANCEL = 'appointment_cancel',
  STAFF_ROLE_CHANGE = 'staff_role_change',
  SETTINGS_UPDATE = 'settings_update',
  BILLING_UPDATE = 'billing_update',
  MEDICAL_RECORD_UPDATE = 'medical_record_update'
}

interface MFASession {
  userId: string;
  operation: SensitiveOperation;
  token: string;
  expiresAt: number;
  verified: boolean;
}

class MFAManager {
  private static instance: MFAManager;
  private sessions: Map<string, MFASession>;
  private readonly tokenExpiry: number = 5 * 60 * 1000; // 5 minutes
  private readonly cleanupInterval: number = 10 * 60 * 1000; // 10 minutes

  private constructor() {
    this.sessions = new Map();
    this.startCleanupInterval();
  }

  public static getInstance(): MFAManager {
    if (!MFAManager.instance) {
      MFAManager.instance = new MFAManager();
    }
    return MFAManager.instance;
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.cleanupInterval);
  }

  public async initiateMFA(
    userId: string,
    operation: SensitiveOperation,
    email: string
  ): Promise<{ token: string; expiresAt: number }> {
    // Generate a random 6-digit code
    const token = randomBytes(3).toString('hex').toUpperCase().slice(0, 6);
    const expiresAt = Date.now() + this.tokenExpiry;

    // Store the session
    this.sessions.set(userId, {
      userId,
      operation,
      token,
      expiresAt,
      verified: false
    });

    // Send the code via email
    await sendEmail({
      to: email,
      subject: 'Security Verification Code',
      text: `Your verification code for ${operation} is: ${token}. This code will expire in 5 minutes.`,
      html: `
        <h2>Security Verification Required</h2>
        <p>You are attempting to perform a sensitive operation: ${operation}</p>
        <p>Your verification code is: <strong>${token}</strong></p>
        <p>This code will expire in 5 minutes.</p>
        <p>If you did not request this verification, please contact support immediately.</p>
      `
    });

    securityLogger.log({
      type: 'auth',
      severity: 'medium',
      message: 'MFA initiated',
      metadata: { userId, operation }
    });

    return { token, expiresAt };
  }

  public async verifyMFA(
    userId: string,
    token: string,
    operation: SensitiveOperation
  ): Promise<boolean> {
    const session = this.sessions.get(userId);
    
    if (!session) {
      securityLogger.log({
        type: 'auth',
        severity: 'high',
        message: 'MFA verification failed - no session',
        metadata: { userId, operation }
      });
      return false;
    }

    if (session.operation !== operation) {
      securityLogger.log({
        type: 'auth',
        severity: 'high',
        message: 'MFA verification failed - operation mismatch',
        metadata: { userId, operation, expectedOperation: session.operation }
      });
      return false;
    }

    if (Date.now() > session.expiresAt) {
      securityLogger.log({
        type: 'auth',
        severity: 'medium',
        message: 'MFA verification failed - token expired',
        metadata: { userId, operation }
      });
      this.sessions.delete(userId);
      return false;
    }

    if (session.token !== token) {
      securityLogger.log({
        type: 'auth',
        severity: 'high',
        message: 'MFA verification failed - invalid token',
        metadata: { userId, operation }
      });
      return false;
    }

    // Mark session as verified
    session.verified = true;
    this.sessions.set(userId, session);

    securityLogger.log({
      type: 'auth',
      severity: 'low',
      message: 'MFA verification successful',
      metadata: { userId, operation }
    });

    return true;
  }

  public isVerified(userId: string, operation: SensitiveOperation): boolean {
    const session = this.sessions.get(userId);
    return !!session && 
           session.operation === operation && 
           session.verified && 
           Date.now() <= session.expiresAt;
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [userId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(userId);
      }
    }
  }
}

// Export singleton instance
export const mfaManager = MFAManager.getInstance(); 