import { supabase } from './client';
import { securityLogger } from '../security/logger';
import { hipaaAuditLogger, HIPAAEventType, PHICategory } from '../security/hipaa/audit';

interface SubscriptionConfig {
  table: string;
  schema?: string;
  filter?: string;
  callback: (payload: any) => void;
  errorCallback?: (error: Error) => void;
  retryAttempts?: number;
  retryDelay?: number;
}

interface ConflictResolutionStrategy {
  strategy: 'last-write-wins' | 'manual' | 'merge';
  mergeStrategy?: (local: any, remote: any) => any;
}

class RealtimeManager {
  private static instance: RealtimeManager;
  private subscriptions: Map<string, any> = new Map();
  private retryAttempts: Map<string, number> = new Map();
  private readonly DEFAULT_RETRY_ATTEMPTS = 3;
  private readonly DEFAULT_RETRY_DELAY = 5000; // 5 seconds
  private readonly MAX_RETRY_DELAY = 30000; // 30 seconds
  private readonly BATCH_SIZE = 100;
  private readonly BATCH_INTERVAL = 1000; // 1 second
  private batchBuffer: Map<string, any[]> = new Map();
  private batchTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private connectionMetrics: {
    latency: number[];
    packetLoss: number;
    lastPing: number;
    reconnectCount: number;
  } = {
    latency: [],
    packetLoss: 0,
    lastPing: 0,
    reconnectCount: 0
  };
  private readonly METRICS_WINDOW = 100; // Keep last 100 measurements
  private readonly PING_INTERVAL = 30000; // 30 seconds

  private constructor() {
    this.initializeRealtimeHandlers();
    this.startConnectionMonitoring();
  }

  public static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager();
    }
    return RealtimeManager.instance;
  }

  private initializeRealtimeHandlers(): void {
    // Handle connection state changes
    supabase.realtime.on('connected', () => {
      securityLogger.log({
        type: 'realtime',
        severity: 'low',
        message: 'Realtime connection established'
      });
    });

    supabase.realtime.on('disconnected', () => {
      securityLogger.log({
        type: 'realtime',
        severity: 'high',
        message: 'Realtime connection lost'
      });
      this.handleDisconnection();
    });

    supabase.realtime.on('error', (error) => {
      securityLogger.log({
        type: 'realtime',
        severity: 'high',
        message: 'Realtime connection error',
        metadata: { error: error.message }
      });
      this.handleError(error);
    });
  }

  private startConnectionMonitoring(): void {
    setInterval(() => {
      this.measureConnectionQuality();
    }, this.PING_INTERVAL);
  }

  private async measureConnectionQuality(): Promise<void> {
    const startTime = Date.now();
    try {
      await supabase.rpc('ping');
      const latency = Date.now() - startTime;
      
      // Update metrics
      this.connectionMetrics.latency.push(latency);
      if (this.connectionMetrics.latency.length > this.METRICS_WINDOW) {
        this.connectionMetrics.latency.shift();
      }
      
      this.connectionMetrics.lastPing = startTime;
      
      // Log metrics if latency is high
      const avgLatency = this.connectionMetrics.latency.reduce((a, b) => a + b, 0) / 
                        this.connectionMetrics.latency.length;
      if (avgLatency > 1000) { // 1 second threshold
        securityLogger.log({
          type: 'realtime',
          severity: 'medium',
          message: 'High latency detected in realtime connection',
          metadata: {
            averageLatency: avgLatency,
            packetLoss: this.connectionMetrics.packetLoss,
            reconnectCount: this.connectionMetrics.reconnectCount
          }
        });
      }
    } catch (error) {
      this.connectionMetrics.packetLoss++;
      securityLogger.log({
        type: 'realtime',
        severity: 'high',
        message: 'Connection quality check failed',
        metadata: {
          error: error.message,
          packetLoss: this.connectionMetrics.packetLoss
        }
      });
    }
  }

  public getConnectionMetrics(): {
    averageLatency: number;
    packetLoss: number;
    lastPing: number;
    reconnectCount: number;
  } {
    const avgLatency = this.connectionMetrics.latency.length > 0
      ? this.connectionMetrics.latency.reduce((a, b) => a + b, 0) / this.connectionMetrics.latency.length
      : 0;

    return {
      averageLatency: avgLatency,
      packetLoss: this.connectionMetrics.packetLoss,
      lastPing: this.connectionMetrics.lastPing,
      reconnectCount: this.connectionMetrics.reconnectCount
    };
  }

  private async handleDisconnection(): Promise<void> {
    this.connectionMetrics.reconnectCount++;
    // Attempt to reconnect all active subscriptions
    for (const [channel, subscription] of this.subscriptions.entries()) {
      await this.reconnectSubscription(channel, subscription);
    }
  }

  private async handleError(error: Error): Promise<void> {
    // Log error and attempt recovery
    securityLogger.log({
      type: 'realtime',
      severity: 'high',
      message: 'Realtime error occurred',
      metadata: { error: error.message }
    });

    // Attempt to recover connection
    try {
      await supabase.realtime.connect();
    } catch (reconnectError) {
      securityLogger.log({
        type: 'realtime',
        severity: 'critical',
        message: 'Failed to recover realtime connection',
        metadata: { error: reconnectError.message }
      });
    }
  }

  private async reconnectSubscription(
    channel: string,
    subscription: any,
    attempt: number = 1
  ): Promise<void> {
    const maxAttempts = subscription.config.retryAttempts || this.DEFAULT_RETRY_ATTEMPTS;
    const delay = Math.min(
      (subscription.config.retryDelay || this.DEFAULT_RETRY_DELAY) * Math.pow(2, attempt - 1),
      this.MAX_RETRY_DELAY
    );

    try {
      await new Promise(resolve => setTimeout(resolve, delay));
      await this.subscribe(subscription.config);
      this.retryAttempts.delete(channel);
    } catch (error) {
      if (attempt < maxAttempts) {
        await this.reconnectSubscription(channel, subscription, attempt + 1);
      } else {
        subscription.config.errorCallback?.(error);
        securityLogger.log({
          type: 'realtime',
          severity: 'high',
          message: 'Failed to reconnect subscription',
          metadata: {
            channel,
            error: error.message,
            attempts: attempt
          }
        });
      }
    }
  }

  public async subscribe(config: SubscriptionConfig): Promise<void> {
    const channel = `${config.schema || 'public'}:${config.table}`;
    
    try {
      const subscription = supabase
        .channel(channel)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: config.schema || 'public',
            table: config.table,
            filter: config.filter
          },
          async (payload) => {
            try {
              // Handle batched updates
              if (!this.batchBuffer.has(channel)) {
                this.batchBuffer.set(channel, []);
              }

              this.batchBuffer.get(channel).push(payload);

              // Clear existing timeout if any
              if (this.batchTimeouts.has(channel)) {
                clearTimeout(this.batchTimeouts.get(channel));
              }

              // Set new timeout for batch processing
              this.batchTimeouts.set(
                channel,
                setTimeout(() => {
                  this.processBatch(channel, config.callback);
                }, this.BATCH_INTERVAL)
              );

              // Process batch if size threshold reached
              if (this.batchBuffer.get(channel).length >= this.BATCH_SIZE) {
                this.processBatch(channel, config.callback);
              }
            } catch (error) {
              config.errorCallback?.(error);
              securityLogger.log({
                type: 'realtime',
                severity: 'high',
                message: 'Error processing realtime update',
                metadata: {
                  channel,
                  error: error.message,
                  payload
                }
              });
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.subscriptions.set(channel, { config, status });
            this.retryAttempts.delete(channel);
          }
        });

      // Store subscription with config for reconnection
      this.subscriptions.set(channel, { config, subscription });
    } catch (error) {
      config.errorCallback?.(error);
      securityLogger.log({
        type: 'realtime',
        severity: 'high',
        message: 'Failed to subscribe to realtime channel',
        metadata: {
          channel,
          error: error.message
        }
      });
      throw error;
    }
  }

  private async processBatch(channel: string, callback: (payload: any) => void): Promise<void> {
    const batch = this.batchBuffer.get(channel) || [];
    if (batch.length === 0) return;

    try {
      // Process batch with conflict resolution
      const processedBatch = await this.resolveConflicts(batch);
      
      // Call callback with processed batch
      callback(processedBatch);

      // Clear batch buffer
      this.batchBuffer.set(channel, []);
      clearTimeout(this.batchTimeouts.get(channel));
      this.batchTimeouts.delete(channel);

      // Log successful batch processing
      securityLogger.log({
        type: 'realtime',
        severity: 'low',
        message: 'Successfully processed realtime batch',
        metadata: {
          channel,
          batchSize: batch.length
        }
      });
    } catch (error) {
      securityLogger.log({
        type: 'realtime',
        severity: 'high',
        message: 'Failed to process realtime batch',
        metadata: {
          channel,
          error: error.message,
          batchSize: batch.length
        }
      });
      throw error;
    }
  }

  private async resolveConflicts(
    batch: any[],
    strategy: ConflictResolutionStrategy = { strategy: 'last-write-wins' }
  ): Promise<any[]> {
    const conflicts = new Map<string, any[]>();

    // Group conflicts by record ID
    for (const payload of batch) {
      const key = payload.new?.id || payload.old?.id;
      if (!conflicts.has(key)) {
        conflicts.set(key, []);
      }
      conflicts.get(key).push(payload);
    }

    // Resolve conflicts for each record
    const resolvedBatch = [];
    for (const [id, payloads] of conflicts.entries()) {
      if (payloads.length === 1) {
        resolvedBatch.push(payloads[0]);
        continue;
      }

      // Sort by timestamp if available
      payloads.sort((a, b) => {
        const timeA = a.commit_timestamp || a.created_at;
        const timeB = b.commit_timestamp || b.created_at;
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      });

      // Apply conflict resolution strategy
      switch (strategy.strategy) {
        case 'last-write-wins':
          resolvedBatch.push(payloads[0]);
          break;
        case 'merge':
          if (strategy.mergeStrategy) {
            const merged = payloads.reduce((acc, curr) => 
              strategy.mergeStrategy(acc, curr), payloads[0]);
            resolvedBatch.push(merged);
          } else {
            resolvedBatch.push(payloads[0]);
          }
          break;
        case 'manual':
          // Log conflict for manual resolution
          securityLogger.log({
            type: 'realtime',
            severity: 'high',
            message: 'Conflict detected requiring manual resolution',
            metadata: {
              recordId: id,
              payloads
            }
          });
          resolvedBatch.push(payloads[0]);
          break;
      }
    }

    return resolvedBatch;
  }

  public async unsubscribe(channel: string): Promise<void> {
    const subscription = this.subscriptions.get(channel);
    if (subscription) {
      try {
        await supabase.removeChannel(subscription.subscription);
        this.subscriptions.delete(channel);
        this.retryAttempts.delete(channel);
        this.batchBuffer.delete(channel);
        if (this.batchTimeouts.has(channel)) {
          clearTimeout(this.batchTimeouts.get(channel));
          this.batchTimeouts.delete(channel);
        }
      } catch (error) {
        securityLogger.log({
          type: 'realtime',
          severity: 'high',
          message: 'Failed to unsubscribe from channel',
          metadata: {
            channel,
            error: error.message
          }
        });
        throw error;
      }
    }
  }

  public async unsubscribeAll(): Promise<void> {
    for (const channel of this.subscriptions.keys()) {
      await this.unsubscribe(channel);
    }
  }
}

// Export singleton instance
export const realtimeManager = RealtimeManager.getInstance(); 