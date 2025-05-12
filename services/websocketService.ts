import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type WebSocketCallback = (payload: any) => void;

class WebSocketService {
  private subscriptions: Map<string, WebSocketCallback[]> = new Map();

  constructor() {
    this.initializeSubscriptions();
  }

  private initializeSubscriptions() {
    // Subscribe to second opinion request changes
    supabase
      .channel('second-opinion-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'second_opinion_requests',
        },
        (payload) => {
          this.notifySubscribers('second-opinion-requests', payload);
        }
      )
      .subscribe();

    // Subscribe to consultation changes
    supabase
      .channel('consultations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consultations',
        },
        (payload) => {
          this.notifySubscribers('consultations', payload);
        }
      )
      .subscribe();

    // Subscribe to feedback changes
    supabase
      .channel('consultation-feedback')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consultation_feedback',
        },
        (payload) => {
          this.notifySubscribers('consultation-feedback', payload);
        }
      )
      .subscribe();
  }

  subscribe(channel: string, callback: WebSocketCallback) {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, []);
    }
    this.subscriptions.get(channel)!.push(callback);
  }

  unsubscribe(channel: string, callback: WebSocketCallback) {
    if (!this.subscriptions.has(channel)) return;
    
    const callbacks = this.subscriptions.get(channel)!;
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
    
    if (callbacks.length === 0) {
      this.subscriptions.delete(channel);
    }
  }

  private notifySubscribers(channel: string, payload: any) {
    if (!this.subscriptions.has(channel)) return;
    
    this.subscriptions.get(channel)!.forEach(callback => {
      try {
        callback(payload);
      } catch (error) {
        console.error('Error in WebSocket callback:', error);
      }
    });
  }
}

export const websocketService = new WebSocketService(); 