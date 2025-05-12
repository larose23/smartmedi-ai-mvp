import { supabase } from '../supabase/client';
import { securityLogger } from '../security/logger';
import { hipaaAuditLogger, PHICategory } from '../security/hipaa/audit';

interface UserPresence {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  lastSeen: number;
  currentPage: string;
  currentAction?: string;
  status: 'online' | 'away' | 'offline';
}

class PresenceManager {
  private static instance: PresenceManager;
  private readonly PRESENCE_CHANNEL = 'presence';
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly AWAY_THRESHOLD = 300000; // 5 minutes
  private presenceInterval: NodeJS.Timeout | null = null;
  private currentUser: UserPresence | null = null;
  private onlineUsers: Map<string, UserPresence> = new Map();

  private constructor() {
    this.initializePresence();
  }

  public static getInstance(): PresenceManager {
    if (!PresenceManager.instance) {
      PresenceManager.instance = new PresenceManager();
    }
    return PresenceManager.instance;
  }

  private async initializePresence(): Promise<void> {
    try {
      // Subscribe to presence channel
      const channel = supabase.channel(this.PRESENCE_CHANNEL);

      // Handle presence events
      channel
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState();
          this.updateOnlineUsers(presenceState);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          this.handleUserJoin(newPresences[0]);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          this.handleUserLeave(leftPresences[0]);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await this.startHeartbeat();
          }
        });

      // Track user activity
      this.trackUserActivity();

    } catch (error) {
      securityLogger.log({
        type: 'presence',
        severity: 'high',
        message: 'Failed to initialize presence',
        metadata: { error: error.message }
      });
    }
  }

  private async startHeartbeat(): Promise<void> {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
    }

    this.presenceInterval = setInterval(async () => {
      if (this.currentUser) {
        try {
          await supabase
            .from('user_presence')
            .upsert({
              user_id: this.currentUser.userId,
              last_seen: new Date().toISOString(),
              status: this.currentUser.status,
              current_page: this.currentUser.currentPage,
              current_action: this.currentUser.currentAction
            });

          // Log HIPAA audit event for presence update
          await hipaaAuditLogger.logAccess(
            this.currentUser.userId,
            this.currentUser.userRole,
            PHICategory.SYSTEM,
            'presence_update',
            {
              status: this.currentUser.status,
              page: this.currentUser.currentPage,
              action: this.currentUser.currentAction
            },
            '127.0.0.1',
            this.currentUser.userName,
            true
          );
        } catch (error) {
          securityLogger.log({
            type: 'presence',
            severity: 'high',
            message: 'Failed to update presence',
            metadata: { error: error.message }
          });
        }
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private trackUserActivity(): void {
    // Track page visibility
    document.addEventListener('visibilitychange', () => {
      if (this.currentUser) {
        this.currentUser.status = document.hidden ? 'away' : 'online';
        this.updateUserPresence();
      }
    });

    // Track user activity
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      document.addEventListener(event, () => {
        if (this.currentUser && this.currentUser.status === 'away') {
          this.currentUser.status = 'online';
          this.updateUserPresence();
        }
      });
    });
  }

  private updateOnlineUsers(presenceState: any): void {
    this.onlineUsers.clear();
    Object.values(presenceState).forEach((presences: any[]) => {
      presences.forEach(presence => {
        this.onlineUsers.set(presence.userId, presence);
      });
    });
  }

  private handleUserJoin(presence: UserPresence): void {
    this.onlineUsers.set(presence.userId, presence);
    this.notifyUserPresenceChange('join', presence);
  }

  private handleUserLeave(presence: UserPresence): void {
    this.onlineUsers.delete(presence.userId);
    this.notifyUserPresenceChange('leave', presence);
  }

  private notifyUserPresenceChange(type: 'join' | 'leave', user: UserPresence): void {
    // Dispatch custom event for UI updates
    const event = new CustomEvent('userPresenceChange', {
      detail: { type, user }
    });
    window.dispatchEvent(event);
  }

  public async updateUserPresence(page: string, action?: string): Promise<void> {
    if (this.currentUser) {
      this.currentUser.currentPage = page;
      this.currentUser.currentAction = action;
      this.currentUser.lastSeen = Date.now();
      this.currentUser.status = 'online';

      try {
        await supabase
          .from('user_presence')
          .upsert({
            user_id: this.currentUser.userId,
            last_seen: new Date().toISOString(),
            status: this.currentUser.status,
            current_page: page,
            current_action: action
          });
      } catch (error) {
        securityLogger.log({
          type: 'presence',
          severity: 'high',
          message: 'Failed to update user presence',
          metadata: { error: error.message }
        });
      }
    }
  }

  public getOnlineUsers(): UserPresence[] {
    return Array.from(this.onlineUsers.values());
  }

  public getUserPresence(userId: string): UserPresence | undefined {
    return this.onlineUsers.get(userId);
  }

  public setCurrentUser(user: UserPresence): void {
    this.currentUser = user;
  }

  public cleanup(): void {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
    }
  }
}

// Export singleton instance
export const presenceManager = PresenceManager.getInstance(); 