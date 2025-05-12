import { securityLogger } from './logger';

interface BlockedIP {
  ip: string;
  reason: string;
  timestamp: number;
  expiresAt: number;
  attempts: number;
}

class IPBlocker {
  private static instance: IPBlocker;
  private blockedIPs: Map<string, BlockedIP>;
  private readonly maxAttempts: number = 5;
  private readonly blockDuration: number = 3600000; // 1 hour in milliseconds

  private constructor() {
    this.blockedIPs = new Map();
  }

  public static getInstance(): IPBlocker {
    if (!IPBlocker.instance) {
      IPBlocker.instance = new IPBlocker();
    }
    return IPBlocker.instance;
  }

  public isBlocked(ip: string): boolean {
    const blockedIP = this.blockedIPs.get(ip);
    if (!blockedIP) {
      return false;
    }

    // Check if block has expired
    if (Date.now() > blockedIP.expiresAt) {
      this.blockedIPs.delete(ip);
      return false;
    }

    return true;
  }

  public recordAttempt(ip: string, reason: string): void {
    const now = Date.now();
    const existingBlock = this.blockedIPs.get(ip);

    if (existingBlock) {
      // Update existing block
      existingBlock.attempts += 1;
      existingBlock.expiresAt = now + this.blockDuration;
      this.blockedIPs.set(ip, existingBlock);

      // Log the attempt
      securityLogger.log({
        type: 'ip_block',
        severity: 'high',
        message: `Blocked IP attempt: ${ip}`,
        metadata: {
          ip,
          reason,
          attempts: existingBlock.attempts,
          expiresAt: new Date(existingBlock.expiresAt).toISOString(),
        },
      });
    } else {
      // Create new block
      this.blockedIPs.set(ip, {
        ip,
        reason,
        timestamp: now,
        expiresAt: now + this.blockDuration,
        attempts: 1,
      });

      // Log the first attempt
      securityLogger.log({
        type: 'ip_block',
        severity: 'medium',
        message: `New IP block: ${ip}`,
        metadata: {
          ip,
          reason,
          expiresAt: new Date(now + this.blockDuration).toISOString(),
        },
      });
    }
  }

  public getBlockInfo(ip: string): BlockedIP | null {
    const block = this.blockedIPs.get(ip);
    if (!block || Date.now() > block.expiresAt) {
      return null;
    }
    return { ...block };
  }

  public removeBlock(ip: string): void {
    this.blockedIPs.delete(ip);
    securityLogger.log({
      type: 'ip_block',
      severity: 'low',
      message: `IP block removed: ${ip}`,
      metadata: { ip },
    });
  }

  public cleanup(): void {
    const now = Date.now();
    for (const [ip, block] of this.blockedIPs.entries()) {
      if (now > block.expiresAt) {
        this.blockedIPs.delete(ip);
      }
    }
  }
}

// Export singleton instance
export const ipBlocker = IPBlocker.getInstance();

// Cleanup expired blocks periodically
setInterval(() => {
  ipBlocker.cleanup();
}, 300000); // Clean up every 5 minutes

// Helper function to check and record IP attempts
export const checkAndRecordIP = (ip: string, reason: string): boolean => {
  if (ipBlocker.isBlocked(ip)) {
    return false;
  }

  ipBlocker.recordAttempt(ip, reason);
  return true;
}; 