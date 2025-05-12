import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { securityLogger } from '../logger';

// Constants for encryption
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

class HIPAAEncryption {
  private static instance: HIPAAEncryption;
  private masterKey: Buffer;

  private constructor() {
    // In production, this should be loaded from a secure key management system
    this.masterKey = Buffer.from(process.env.ENCRYPTION_MASTER_KEY || '', 'hex');
    if (!this.masterKey || this.masterKey.length !== KEY_LENGTH) {
      throw new Error('Invalid encryption master key');
    }
  }

  public static getInstance(): HIPAAEncryption {
    if (!HIPAAEncryption.instance) {
      HIPAAEncryption.instance = new HIPAAEncryption();
    }
    return HIPAAEncryption.instance;
  }

  private async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return (await promisify(scrypt)(password, salt, KEY_LENGTH)) as Buffer;
  }

  public async encryptData(data: any, password: string): Promise<string> {
    try {
      // Generate a random salt and IV
      const salt = randomBytes(SALT_LENGTH);
      const iv = randomBytes(IV_LENGTH);

      // Derive encryption key
      const key = await this.deriveKey(password, salt);

      // Create cipher
      const cipher = createCipheriv(ALGORITHM, key, iv);

      // Encrypt the data
      const jsonData = JSON.stringify(data);
      const encrypted = Buffer.concat([
        cipher.update(jsonData, 'utf8'),
        cipher.final()
      ]);

      // Get auth tag
      const tag = cipher.getAuthTag();

      // Combine all components
      const result = Buffer.concat([
        salt,
        iv,
        tag,
        encrypted
      ]);

      return result.toString('base64');
    } catch (error) {
      securityLogger.log({
        type: 'hipaa',
        severity: 'high',
        message: 'Data encryption failed',
        metadata: { error: error.message }
      });
      throw new Error('Failed to encrypt data');
    }
  }

  public async decryptData(encryptedData: string, password: string): Promise<any> {
    try {
      // Convert from base64
      const buffer = Buffer.from(encryptedData, 'base64');

      // Extract components
      const salt = buffer.slice(0, SALT_LENGTH);
      const iv = buffer.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
      const tag = buffer.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
      const encrypted = buffer.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

      // Derive key
      const key = await this.deriveKey(password, salt);

      // Create decipher
      const decipher = createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);

      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);

      return JSON.parse(decrypted.toString('utf8'));
    } catch (error) {
      securityLogger.log({
        type: 'hipaa',
        severity: 'high',
        message: 'Data decryption failed',
        metadata: { error: error.message }
      });
      throw new Error('Failed to decrypt data');
    }
  }

  public async encryptField(field: string): Promise<string> {
    try {
      // Generate a field-specific key
      const fieldKey = await this.deriveKey(
        field,
        this.masterKey
      );

      // Encrypt the field
      const iv = randomBytes(IV_LENGTH);
      const cipher = createCipheriv(ALGORITHM, fieldKey, iv);
      const encrypted = Buffer.concat([
        cipher.update(field, 'utf8'),
        cipher.final()
      ]);
      const tag = cipher.getAuthTag();

      // Combine components
      const result = Buffer.concat([
        iv,
        tag,
        encrypted
      ]);

      return result.toString('base64');
    } catch (error) {
      securityLogger.log({
        type: 'hipaa',
        severity: 'high',
        message: 'Field encryption failed',
        metadata: { error: error.message }
      });
      throw new Error('Failed to encrypt field');
    }
  }

  public async decryptField(encryptedField: string, originalField: string): Promise<string> {
    try {
      // Generate the same field-specific key
      const fieldKey = await this.deriveKey(
        originalField,
        this.masterKey
      );

      // Convert from base64
      const buffer = Buffer.from(encryptedField, 'base64');

      // Extract components
      const iv = buffer.slice(0, IV_LENGTH);
      const tag = buffer.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
      const encrypted = buffer.slice(IV_LENGTH + TAG_LENGTH);

      // Create decipher
      const decipher = createDecipheriv(ALGORITHM, fieldKey, iv);
      decipher.setAuthTag(tag);

      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      securityLogger.log({
        type: 'hipaa',
        severity: 'high',
        message: 'Field decryption failed',
        metadata: { error: error.message }
      });
      throw new Error('Failed to decrypt field');
    }
  }
}

// Export singleton instance
export const hipaaEncryption = HIPAAEncryption.getInstance(); 