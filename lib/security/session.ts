import { config } from '../config';
import { securityLogger } from './logger';
import { supabase } from '../supabase';

interface SessionActivity {
  lastActivity: number;
  lastRefresh: number;
  refreshCount: number;
}

class SessionManager {
  private static instance: SessionManager;
  private sessions: Map<string, SessionActivity>;
  private readonly idleTimeout: number = 30 * 60 * 1000; // 30 minutes
  private readonly maxRefreshCount: number = 10;
  private readonly refreshInterval: number = 15 * 60 * 1000; // 15 minutes

  private constructor() {
    this.sessions = new Map();
    this.startCleanupInterval();
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  public async trackActivity(userId: string): Promise<void> {
    const now = Date.now();
    const session = this.sessions.get(userId) || {
      lastActivity: now,
      lastRefresh: now,
      refreshCount: 0
    };

    session.lastActivity = now;
    this.sessions.set(userId, session);

    // Check if session needs refresh
    if (now - session.lastRefresh >= this.refreshInterval) {
      await this.refreshSession(userId);
    }
  }

  public async refreshSession(userId: string): Promise<boolean> {
    const session = this.sessions.get(userId);
    if (!session) return false;

    const now = Date.now();

    // Check if session has exceeded max refresh count
    if (session.refreshCount >= this.maxRefreshCount) {
      await this.invalidateSession(userId);
      return false;
    }

    try {
      // Refresh the session with Supabase
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) throw error;

      // Update session tracking
      session.lastRefresh = now;
      session.refreshCount++;
      this.sessions.set(userId, session);

      securityLogger.log({
        type: 'auth',
        severity: 'low',
        message: 'Session refreshed',
        metadata: { userId, refreshCount: session.refreshCount }
      });

      return true;
    } catch (error) {
      securityLogger.log({
        type: 'auth',
        severity: 'medium',
        message: 'Session refresh failed',
        metadata: { userId, error: error.message }
      });
      return false;
    }
  }

  public async invalidateSession(userId: string): Promise<void> {
    try {
      await supabase.auth.signOut();
      this.sessions.delete(userId);

      securityLogger.log({
        type: 'auth',
        severity: 'medium',
        message: 'Session invalidated',
        metadata: { userId }
      });
    } catch (error) {
      securityLogger.log({
        type: 'auth',
        severity: 'high',
        message: 'Session invalidation failed',
        metadata: { userId, error: error.message }
      });
    }
  }

  public isSessionValid(userId: string): boolean {
    const session = this.sessions.get(userId);
    if (!session) return false;

    const now = Date.now();
    const isIdle = now - session.lastActivity >= this.idleTimeout;
    const isExpired = session.refreshCount >= this.maxRefreshCount;

    if (isIdle || isExpired) {
      this.invalidateSession(userId);
      return false;
    }

    return true;
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [userId, session] of this.sessions.entries()) {
      if (now - session.lastActivity >= this.idleTimeout) {
        this.invalidateSession(userId);
      }
    }
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance(); 