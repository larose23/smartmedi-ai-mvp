import { supabase } from '@/lib/supabase';
import { TerminologyService } from './TerminologyService';
import { IntegrationService } from './IntegrationService';

export interface SyncConfig {
  sourceSystem: string;
  targetSystem: string;
  resourceTypes: string[];
  syncInterval: number; // in minutes
  lastSync: string;
  status: 'active' | 'paused' | 'error';
  mappingRules: Record<string, any>;
}

export interface SyncLog {
  id: string;
  configId: string;
  startTime: string;
  endTime: string;
  status: 'success' | 'error';
  resourceType: string;
  resourceCount: number;
  errorMessage?: string;
}

export class DataSyncService {
  // Sync Configuration
  static async createSyncConfig(config: Omit<SyncConfig, 'lastSync'>): Promise<SyncConfig> {
    try {
      const { data, error } = await supabase
        .from('sync_configs')
        .insert({
          ...config,
          lastSync: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating sync config:', error);
      throw error;
    }
  }

  static async getSyncConfig(configId: string): Promise<SyncConfig> {
    try {
      const { data, error } = await supabase
        .from('sync_configs')
        .select('*')
        .eq('id', configId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting sync config:', error);
      throw error;
    }
  }

  // Sync Execution
  static async executeSync(configId: string): Promise<void> {
    const config = await this.getSyncConfig(configId);
    const startTime = new Date().toISOString();

    try {
      for (const resourceType of config.resourceTypes) {
        await this.syncResourceType(config, resourceType);
      }

      // Update last sync time
      await supabase
        .from('sync_configs')
        .update({ lastSync: new Date().toISOString() })
        .eq('id', configId);

      // Log successful sync
      await this.logSync({
        configId,
        startTime,
        endTime: new Date().toISOString(),
        status: 'success',
        resourceType: 'all',
        resourceCount: config.resourceTypes.length
      });
    } catch (error) {
      // Log sync error
      await this.logSync({
        configId,
        startTime,
        endTime: new Date().toISOString(),
        status: 'error',
        resourceType: 'all',
        resourceCount: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      // Update config status
      await supabase
        .from('sync_configs')
        .update({ status: 'error' })
        .eq('id', configId);

      throw error;
    }
  }

  private static async syncResourceType(config: SyncConfig, resourceType: string): Promise<void> {
    try {
      // Get resources from source system
      const sourceResources = await IntegrationService.searchFHIRResources(
        resourceType,
        { _lastUpdated: `gt${config.lastSync}` }
      );

      // Transform and map resources
      const transformedResources = await this.transformResources(
        sourceResources,
        config.mappingRules[resourceType]
      );

      // Create or update resources in target system
      for (const resource of transformedResources) {
        await IntegrationService.createFHIRResource(resource);
      }

      // Log successful sync for resource type
      await this.logSync({
        configId: config.id,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        status: 'success',
        resourceType,
        resourceCount: transformedResources.length
      });
    } catch (error) {
      // Log error for resource type
      await this.logSync({
        configId: config.id,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        status: 'error',
        resourceType,
        resourceCount: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  private static async transformResources(
    resources: any[],
    mappingRules: Record<string, any>
  ): Promise<any[]> {
    return Promise.all(resources.map(async resource => {
      const transformed = { ...resource };

      // Apply mapping rules
      for (const [path, rule] of Object.entries(mappingRules)) {
        const value = this.getNestedValue(resource, path);
        if (value) {
          if (rule.type === 'code') {
            // Translate codes using terminology service
            const translatedCode = await TerminologyService.translateCode(
              value,
              rule.fromSystem,
              rule.toSystem
            );
            if (translatedCode) {
              this.setNestedValue(transformed, path, translatedCode);
            }
          } else if (rule.type === 'transform') {
            // Apply custom transformation
            this.setNestedValue(transformed, path, rule.transform(value));
          }
        }
      }

      return transformed;
    }));
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private static setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      current[key] = current[key] || {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  // Sync Logging
  private static async logSync(log: Omit<SyncLog, 'id'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('sync_logs')
        .insert(log);

      if (error) throw error;
    } catch (error) {
      console.error('Error logging sync:', error);
      throw error;
    }
  }

  // Sync Monitoring
  static async getSyncStatus(configId: string): Promise<{
    lastSync: string;
    status: string;
    recentLogs: SyncLog[];
  }> {
    try {
      const config = await this.getSyncConfig(configId);
      const { data: logs, error } = await supabase
        .from('sync_logs')
        .select('*')
        .eq('configId', configId)
        .order('startTime', { ascending: false })
        .limit(10);

      if (error) throw error;

      return {
        lastSync: config.lastSync,
        status: config.status,
        recentLogs: logs || []
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      throw error;
    }
  }
} 