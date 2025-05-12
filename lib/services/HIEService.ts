import { supabase } from '@/lib/supabase';
import { IntegrationService } from './IntegrationService';

export interface HIEConnection {
    id: string;
    name: string;
    endpoint: string;
    type: 'FHIR' | 'HL7' | 'REST';
    status: 'active' | 'inactive' | 'error';
    credentials: {
        clientId: string;
        clientSecret: string;
        tokenUrl: string;
    };
    capabilities: string[];
    lastSync: string;
    metadata: Record<string, any>;
}

export interface ConsentRecord {
    id: string;
    patientId: string;
    organizationId: string;
    purpose: string;
    scope: string[];
    startDate: string;
    endDate: string;
    status: 'active' | 'revoked' | 'expired';
    metadata: Record<string, any>;
}

export interface AuditLog {
    id: string;
    timestamp: string;
    userId: string;
    action: 'view' | 'share' | 'export' | 'consent';
    resourceType: string;
    resourceId: string;
    organizationId: string;
    patientId: string;
    details: Record<string, any>;
}

export class HIEService {
    // HIE Connection Management
    static async createConnection(connection: Omit<HIEConnection, 'id' | 'lastSync'>): Promise<HIEConnection> {
        try {
            const { data, error } = await supabase
                .from('hie_connections')
                .insert({
                    ...connection,
                    lastSync: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating HIE connection:', error);
            throw error;
        }
    }

    static async getConnection(id: string): Promise<HIEConnection> {
        try {
            const { data, error } = await supabase
                .from('hie_connections')
                .select()
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting HIE connection:', error);
            throw error;
        }
    }

    static async updateConnectionStatus(id: string, status: HIEConnection['status']): Promise<void> {
        try {
            const { error } = await supabase
                .from('hie_connections')
                .update({ status })
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating HIE connection status:', error);
            throw error;
        }
    }

    // Consent Management
    static async createConsent(consent: Omit<ConsentRecord, 'id'>): Promise<ConsentRecord> {
        try {
            const { data, error } = await supabase
                .from('consent_records')
                .insert(consent)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating consent record:', error);
            throw error;
        }
    }

    static async getConsent(patientId: string, organizationId: string): Promise<ConsentRecord[]> {
        try {
            const { data, error } = await supabase
                .from('consent_records')
                .select()
                .eq('patientId', patientId)
                .eq('organizationId', organizationId)
                .eq('status', 'active');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting consent records:', error);
            throw error;
        }
    }

    static async revokeConsent(id: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('consent_records')
                .update({ status: 'revoked' })
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Error revoking consent:', error);
            throw error;
        }
    }

    // Audit Logging
    static async logAccess(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
        try {
            const { error } = await supabase
                .from('audit_logs')
                .insert({
                    ...log,
                    timestamp: new Date().toISOString()
                });

            if (error) throw error;
        } catch (error) {
            console.error('Error logging access:', error);
            throw error;
        }
    }

    static async getAuditLogs(filters: {
        userId?: string;
        patientId?: string;
        organizationId?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<AuditLog[]> {
        try {
            let query = supabase
                .from('audit_logs')
                .select();

            if (filters.userId) {
                query = query.eq('userId', filters.userId);
            }
            if (filters.patientId) {
                query = query.eq('patientId', filters.patientId);
            }
            if (filters.organizationId) {
                query = query.eq('organizationId', filters.organizationId);
            }
            if (filters.startDate) {
                query = query.gte('timestamp', filters.startDate);
            }
            if (filters.endDate) {
                query = query.lte('timestamp', filters.endDate);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting audit logs:', error);
            throw error;
        }
    }

    // HIE Data Exchange
    static async exchangeData(
        connectionId: string,
        resourceType: string,
        resourceId: string,
        action: 'read' | 'write'
    ): Promise<any> {
        const connection = await this.getConnection(connectionId);
        
        try {
            if (connection.type === 'FHIR') {
                if (action === 'read') {
                    return await IntegrationService.getFHIRResource(resourceType, resourceId);
                } else {
                    return await IntegrationService.createFHIRResource(resourceType, resourceId);
                }
            } else if (connection.type === 'HL7') {
                // Implement HL7 message handling
                throw new Error('HL7 message handling not implemented');
            } else {
                // Implement REST API handling
                throw new Error('REST API handling not implemented');
            }
        } catch (error) {
            console.error('Error exchanging data:', error);
            throw error;
        }
    }

    // Connection Testing and Health Monitoring
    static async testConnection(id: string): Promise<{ status: boolean; message: string }> {
        const connection = await this.getConnection(id);
        
        try {
            switch (connection.type) {
                case 'FHIR':
                    // Test FHIR endpoint
                    await IntegrationService.getFHIRResource('Patient', '_search');
                    break;
                case 'HL7':
                    // Test HL7 endpoint
                    await IntegrationService.sendHL7Message('TEST', {});
                    break;
                case 'REST':
                    // Test REST endpoint
                    await fetch(connection.endpoint, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${connection.credentials.clientId}`
                        }
                    });
                    break;
            }
            
            await this.updateConnectionStatus(id, 'active');
            return { status: true, message: 'Connection test successful' };
        } catch (error) {
            await this.updateConnectionStatus(id, 'error');
            return { status: false, message: `Connection test failed: ${error.message}` };
        }
    }

    static async monitorConnectionHealth(id: string): Promise<{
        status: string;
        lastSync: string;
        errorCount: number;
        latency: number;
    }> {
        const connection = await this.getConnection(id);
        const startTime = Date.now();
        
        try {
            await this.testConnection(id);
            const latency = Date.now() - startTime;
            
            return {
                status: 'healthy',
                lastSync: connection.lastSync,
                errorCount: 0,
                latency
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                lastSync: connection.lastSync,
                errorCount: 1,
                latency: Date.now() - startTime
            };
        }
    }

    // Bulk Consent Operations
    static async bulkCreateConsents(consents: Omit<ConsentRecord, 'id'>[]): Promise<ConsentRecord[]> {
        try {
            const { data, error } = await supabase
                .from('consent_records')
                .insert(consents)
                .select();

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error creating bulk consents:', error);
            throw error;
        }
    }

    static async bulkRevokeConsents(consentIds: string[]): Promise<void> {
        try {
            const { error } = await supabase
                .from('consent_records')
                .update({ status: 'revoked' })
                .in('id', consentIds);

            if (error) throw error;
        } catch (error) {
            console.error('Error revoking bulk consents:', error);
            throw error;
        }
    }

    static async getExpiredConsents(): Promise<ConsentRecord[]> {
        try {
            const { data, error } = await supabase
                .from('consent_records')
                .select()
                .lt('end_date', new Date().toISOString())
                .eq('status', 'active');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting expired consents:', error);
            throw error;
        }
    }
} 