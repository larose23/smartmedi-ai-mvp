import { supabase } from '@/lib/supabase/client';

interface DocumentExchange {
    id: string;
    sourceSystem: string;
    targetSystem: string;
    documentType: string;
    documentId: string;
    status: string;
    metadata: Record<string, any>;
    content: string;
    createdAt: Date;
    updatedAt: Date;
}

interface DocumentVersion {
    id: string;
    documentId: string;
    versionNumber: number;
    content: string;
    metadata: Record<string, any>;
    createdAt: Date;
}

export class DocumentExchangeService {
    static async createDocumentExchange(
        sourceSystem: string,
        targetSystem: string,
        documentType: string,
        documentId: string,
        content: string,
        metadata: Record<string, any> = {}
    ): Promise<DocumentExchange> {
        const { data, error } = await supabase
            .from('document_exchanges')
            .insert({
                source_system: sourceSystem,
                target_system: targetSystem,
                document_type: documentType,
                document_id: documentId,
                status: 'pending',
                content,
                metadata
            })
            .select()
            .single();

        if (error) throw error;
        return this.mapDocumentExchange(data);
    }

    static async getDocumentExchange(id: string): Promise<DocumentExchange> {
        const { data, error } = await supabase
            .from('document_exchanges')
            .select()
            .eq('id', id)
            .single();

        if (error) throw error;
        return this.mapDocumentExchange(data);
    }

    static async updateDocumentStatus(
        id: string,
        status: string,
        metadata: Record<string, any> = {}
    ): Promise<DocumentExchange> {
        const { data, error } = await supabase
            .from('document_exchanges')
            .update({
                status,
                metadata: { ...metadata, lastStatusUpdate: new Date().toISOString() }
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return this.mapDocumentExchange(data);
    }

    static async createDocumentVersion(
        documentId: string,
        content: string,
        metadata: Record<string, any> = {}
    ): Promise<DocumentVersion> {
        // Get the latest version number
        const { data: latestVersion } = await supabase
            .from('document_versions')
            .select('version_number')
            .eq('document_id', documentId)
            .order('version_number', { ascending: false })
            .limit(1)
            .single();

        const versionNumber = latestVersion ? latestVersion.version_number + 1 : 1;

        const { data, error } = await supabase
            .from('document_versions')
            .insert({
                document_id: documentId,
                version_number: versionNumber,
                content,
                metadata
            })
            .select()
            .single();

        if (error) throw error;
        return this.mapDocumentVersion(data);
    }

    static async getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
        const { data, error } = await supabase
            .from('document_versions')
            .select()
            .eq('document_id', documentId)
            .order('version_number', { ascending: false });

        if (error) throw error;
        return data.map(this.mapDocumentVersion);
    }

    static async searchDocuments(
        query: string,
        filters: {
            sourceSystem?: string;
            targetSystem?: string;
            documentType?: string;
            status?: string;
        } = {}
    ): Promise<DocumentExchange[]> {
        let queryBuilder = supabase
            .from('document_exchanges')
            .select();

        // Apply filters
        if (filters.sourceSystem) {
            queryBuilder = queryBuilder.eq('source_system', filters.sourceSystem);
        }
        if (filters.targetSystem) {
            queryBuilder = queryBuilder.eq('target_system', filters.targetSystem);
        }
        if (filters.documentType) {
            queryBuilder = queryBuilder.eq('document_type', filters.documentType);
        }
        if (filters.status) {
            queryBuilder = queryBuilder.eq('status', filters.status);
        }

        // Apply text search if query is provided
        if (query) {
            queryBuilder = queryBuilder.or(
                `content.ilike.%${query}%,metadata->>'title'.ilike.%${query}%`
            );
        }

        const { data, error } = await queryBuilder;

        if (error) throw error;
        return data.map(this.mapDocumentExchange);
    }

    private static mapDocumentExchange(data: any): DocumentExchange {
        return {
            id: data.id,
            sourceSystem: data.source_system,
            targetSystem: data.target_system,
            documentType: data.document_type,
            documentId: data.document_id,
            status: data.status,
            metadata: data.metadata,
            content: data.content,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at)
        };
    }

    private static mapDocumentVersion(data: any): DocumentVersion {
        return {
            id: data.id,
            documentId: data.document_id,
            versionNumber: data.version_number,
            content: data.content,
            metadata: data.metadata,
            createdAt: new Date(data.created_at)
        };
    }
} 