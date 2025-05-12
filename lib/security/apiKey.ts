import { randomBytes } from 'crypto';
import { supabase } from '../supabase';
import { securityLogger } from './logger';

interface APIKey {
  id: string;
  key: string;
  service: string;
  createdAt: number;
  expiresAt: number;
  lastUsed: number | null;
  isActive: boolean;
}

class APIKeyManager {
  private static instance: APIKeyManager;
  private keys: Map<string, APIKey>;
  private readonly keyRotationInterval: number = 30 * 24 * 60 * 60 * 1000; // 30 days

  private constructor() {
    this.keys = new Map();
    this.loadKeys();
    this.startRotationCheck();
  }

  public static getInstance(): APIKeyManager {
    if (!APIKeyManager.instance) {
      APIKeyManager.instance = new APIKeyManager();
    }
    return APIKeyManager.instance;
  }

  private async loadKeys(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      if (data) {
        data.forEach(key => {
          this.keys.set(key.id, {
            ...key,
            createdAt: new Date(key.created_at).getTime(),
            expiresAt: new Date(key.expires_at).getTime(),
            lastUsed: key.last_used ? new Date(key.last_used).getTime() : null,
          });
        });
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    }
  }

  private startRotationCheck(): void {
    // Check for keys that need rotation every hour
    setInterval(() => {
      this.checkAndRotateKeys();
    }, 60 * 60 * 1000);
  }

  private async checkAndRotateKeys(): Promise<void> {
    const now = Date.now();
    for (const [id, key] of this.keys.entries()) {
      if (now > key.expiresAt) {
        await this.rotateKey(id);
      }
    }
  }

  public async generateKey(service: string): Promise<APIKey> {
    const key = randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + this.keyRotationInterval;

    const newKey: APIKey = {
      id: randomBytes(16).toString('hex'),
      key,
      service,
      createdAt: now,
      expiresAt,
      lastUsed: null,
      isActive: true,
    };

    try {
      const { error } = await supabase
        .from('api_keys')
        .insert({
          id: newKey.id,
          key: newKey.key,
          service: newKey.service,
          created_at: new Date(newKey.createdAt).toISOString(),
          expires_at: new Date(newKey.expiresAt).toISOString(),
          is_active: true,
        });

      if (error) throw error;

      this.keys.set(newKey.id, newKey);
      return newKey;
    } catch (error) {
      console.error('Failed to generate API key:', error);
      throw error;
    }
  }

  public async rotateKey(id: string): Promise<void> {
    const oldKey = this.keys.get(id);
    if (!oldKey) return;

    try {
      // Generate new key
      const newKey = await this.generateKey(oldKey.service);

      // Deactivate old key
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      this.keys.delete(id);

      // Log the rotation
      securityLogger.log({
        type: 'api',
        severity: 'medium',
        message: 'API key rotated',
        metadata: {
          service: oldKey.service,
          oldKeyId: id,
          newKeyId: newKey.id,
        },
      });
    } catch (error) {
      console.error('Failed to rotate API key:', error);
      throw error;
    }
  }

  public async validateKey(key: string, service: string): Promise<boolean> {
    const now = Date.now();
    const matchingKey = Array.from(this.keys.values()).find(
      k => k.key === key && k.service === service && k.isActive
    );

    if (!matchingKey) return false;

    // Update last used timestamp
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ last_used: new Date().toISOString() })
        .eq('id', matchingKey.id);

      if (error) throw error;

      matchingKey.lastUsed = now;
      this.keys.set(matchingKey.id, matchingKey);
    } catch (error) {
      console.error('Failed to update API key last used timestamp:', error);
    }

    return true;
  }

  public getActiveKeys(service?: string): APIKey[] {
    const now = Date.now();
    return Array.from(this.keys.values()).filter(
      key => key.isActive && now <= key.expiresAt && (!service || key.service === service)
    );
  }
}

// Export singleton instance
export const apiKeyManager = APIKeyManager.getInstance();

// Helper functions
export const generateAPIKey = (service: string) => apiKeyManager.generateKey(service);
export const validateAPIKey = (key: string, service: string) => apiKeyManager.validateKey(key, service);
export const getActiveAPIKeys = (service?: string) => apiKeyManager.getActiveKeys(service); 