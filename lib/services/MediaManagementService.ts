import { supabase } from '../supabaseClient';
import { hipaaAuditLogger, PHICategory } from '../security/hipaa/audit';
import { hipaaEncryption } from '../security/hipaa/encryption';
import { v4 as uuidv4 } from 'uuid';
import * as cornerstone from 'cornerstone-core';
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import * as cornerstoneMath from 'cornerstone-math';
import * as cornerstoneTools from 'cornerstone-tools';

interface ClinicalMedia {
    id: string;
    patientId: string;
    encounterId?: string;
    type: 'image' | 'recording' | 'dicom';
    mimeType: string;
    fileName: string;
    fileSize: number;
    url: string;
    metadata: {
        width?: number;
        height?: number;
        duration?: number;
        annotations?: MediaAnnotation[];
        dicomTags?: Record<string, any>;
    };
    createdAt: Date;
    updatedAt: Date;
}

interface MediaAnnotation {
    id: string;
    type: 'rectangle' | 'circle' | 'polygon' | 'line' | 'point' | 'text';
    coordinates: number[];
    label: string;
    color: string;
    notes?: string;
    createdBy: string;
    createdAt: Date;
}

export class MediaManagementService {
    static async uploadMedia(
        file: File,
        patientId: string,
        encounterId?: string,
        metadata: Partial<ClinicalMedia['metadata']> = {}
    ): Promise<ClinicalMedia> {
        try {
            const fileId = uuidv4();
            const fileExt = file.name.split('.').pop();
            const fileName = `${fileId}.${fileExt}`;
            const filePath = `media/${patientId}/${fileName}`;

            // Upload file to storage
            const { error: uploadError } = await supabase.storage
                .from('clinical-media')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('clinical-media')
                .getPublicUrl(filePath);

            // Create media record
            const media: ClinicalMedia = {
                id: fileId,
                patientId,
                encounterId,
                type: this.getMediaType(file.type),
                mimeType: file.type,
                fileName: file.name,
                fileSize: file.size,
                url: publicUrl,
                metadata: {
                    ...metadata,
                    width: metadata.width,
                    height: metadata.height,
                    duration: metadata.duration,
                    annotations: [],
                    dicomTags: metadata.dicomTags
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const { data, error } = await supabase
                .from('clinical_media')
                .insert(media)
                .select()
                .single();

            if (error) throw error;

            // Log the upload
            await hipaaAuditLogger.logAccess(
                'system',
                'provider',
                PHICategory.PHI,
                'media_upload',
                { patientId, mediaId: fileId },
                '127.0.0.1',
                'MediaManagementService'
            );

            return data;
        } catch (error) {
            console.error('Error uploading media:', error);
            throw error;
        }
    }

    static async getMedia(mediaId: string): Promise<ClinicalMedia> {
        try {
            const { data, error } = await supabase
                .from('clinical_media')
                .select('*')
                .eq('id', mediaId)
                .single();

            if (error) throw error;

            // Log the access
            await hipaaAuditLogger.logAccess(
                'system',
                'provider',
                PHICategory.PHI,
                'media_access',
                { mediaId },
                '127.0.0.1',
                'MediaManagementService'
            );

            return data;
        } catch (error) {
            console.error('Error getting media:', error);
            throw error;
        }
    }

    static async addAnnotation(
        mediaId: string,
        annotation: Omit<MediaAnnotation, 'id' | 'createdAt'>
    ): Promise<MediaAnnotation> {
        try {
            const newAnnotation: MediaAnnotation = {
                id: uuidv4(),
                ...annotation,
                createdAt: new Date()
            };

            const { data: media, error: mediaError } = await supabase
                .from('clinical_media')
                .select('metadata')
                .eq('id', mediaId)
                .single();

            if (mediaError) throw mediaError;

            const updatedAnnotations = [
                ...(media.metadata.annotations || []),
                newAnnotation
            ];

            const { data, error } = await supabase
                .from('clinical_media')
                .update({
                    metadata: {
                        ...media.metadata,
                        annotations: updatedAnnotations
                    },
                    updatedAt: new Date()
                })
                .eq('id', mediaId)
                .select()
                .single();

            if (error) throw error;

            // Log the annotation
            await hipaaAuditLogger.logAccess(
                'system',
                'provider',
                PHICategory.PHI,
                'media_annotation',
                { mediaId, annotationId: newAnnotation.id },
                '127.0.0.1',
                'MediaManagementService'
            );

            return newAnnotation;
        } catch (error) {
            console.error('Error adding annotation:', error);
            throw error;
        }
    }

    static async loadDICOMFile(url: string): Promise<any> {
        try {
            // Configure cornerstone
            cornerstoneTools.external.cornerstone = cornerstone;
            cornerstoneTools.external.cornerstoneMath = cornerstoneMath;

            // Load the DICOM file
            const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(url);
            const image = await cornerstone.loadImage(imageId);

            return {
                imageId,
                image,
                metadata: cornerstone.getImage(imageId)
            };
        } catch (error) {
            console.error('Error loading DICOM file:', error);
            throw error;
        }
    }

    private static getMediaType(mimeType: string): ClinicalMedia['type'] {
        if (mimeType.startsWith('image/')) {
            return 'image';
        } else if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
            return 'recording';
        } else if (mimeType === 'application/dicom') {
            return 'dicom';
        }
        throw new Error('Unsupported media type');
    }

    static async getMediaByEncounter(encounterId: string): Promise<ClinicalMedia[]> {
        try {
            const { data, error } = await supabase
                .from('clinical_media')
                .select('*')
                .eq('encounter_id', encounterId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Log the access
            await hipaaAuditLogger.logAccess(
                'system',
                'provider',
                PHICategory.PHI,
                'media_access',
                { encounterId },
                '127.0.0.1',
                'MediaManagementService'
            );

            return data;
        } catch (error) {
            console.error('Error getting media by encounter:', error);
            throw error;
        }
    }

    static async getMediaByPatient(patientId: string): Promise<ClinicalMedia[]> {
        try {
            const { data, error } = await supabase
                .from('clinical_media')
                .select('*')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Log the access
            await hipaaAuditLogger.logAccess(
                'system',
                'provider',
                PHICategory.PHI,
                'media_access',
                { patientId },
                '127.0.0.1',
                'MediaManagementService'
            );

            return data;
        } catch (error) {
            console.error('Error getting media by patient:', error);
            throw error;
        }
    }

    static async deleteMedia(mediaId: string): Promise<void> {
        try {
            // Get media record to get file path
            const { data: media, error: mediaError } = await supabase
                .from('clinical_media')
                .select('*')
                .eq('id', mediaId)
                .single();

            if (mediaError) throw mediaError;

            // Delete file from storage
            const filePath = `media/${media.patient_id}/${media.file_name}`;
            const { error: storageError } = await supabase.storage
                .from('clinical-media')
                .remove([filePath]);

            if (storageError) throw storageError;

            // Delete media record
            const { error: deleteError } = await supabase
                .from('clinical_media')
                .delete()
                .eq('id', mediaId);

            if (deleteError) throw deleteError;

            // Log the deletion
            await hipaaAuditLogger.logAccess(
                'system',
                'provider',
                PHICategory.PHI,
                'media_deletion',
                { mediaId },
                '127.0.0.1',
                'MediaManagementService'
            );
        } catch (error) {
            console.error('Error deleting media:', error);
            throw error;
        }
    }

    static async getAnnotations(mediaId: string): Promise<MediaAnnotation[]> {
        try {
            const { data, error } = await supabase
                .from('media_annotations')
                .select('*')
                .eq('media_id', mediaId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error getting annotations:', error);
            throw error;
        }
    }

    static async deleteAnnotation(annotationId: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('media_annotations')
                .delete()
                .eq('id', annotationId);

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting annotation:', error);
            throw error;
        }
    }

    static async updateMediaMetadata(
        mediaId: string,
        metadata: Partial<ClinicalMedia['metadata']>
    ): Promise<ClinicalMedia> {
        try {
            const { data: media, error: mediaError } = await supabase
                .from('clinical_media')
                .select('metadata')
                .eq('id', mediaId)
                .single();

            if (mediaError) throw mediaError;

            const { data, error } = await supabase
                .from('clinical_media')
                .update({
                    metadata: {
                        ...media.metadata,
                        ...metadata
                    },
                    updated_at: new Date()
                })
                .eq('id', mediaId)
                .select()
                .single();

            if (error) throw error;

            // Log the update
            await hipaaAuditLogger.logAccess(
                'system',
                'provider',
                PHICategory.PHI,
                'media_update',
                { mediaId },
                '127.0.0.1',
                'MediaManagementService'
            );

            return data;
        } catch (error) {
            console.error('Error updating media metadata:', error);
            throw error;
        }
    }

    static async getMediaStats(patientId: string): Promise<{
        totalCount: number;
        typeCounts: Record<string, number>;
        totalSize: number;
        lastUpload: Date | null;
    }> {
        try {
            const { data, error } = await supabase
                .from('clinical_media')
                .select('type, file_size, created_at')
                .eq('patient_id', patientId);

            if (error) throw error;

            const stats = {
                totalCount: data.length,
                typeCounts: {} as Record<string, number>,
                totalSize: 0,
                lastUpload: null as Date | null
            };

            data.forEach(media => {
                // Count by type
                stats.typeCounts[media.type] = (stats.typeCounts[media.type] || 0) + 1;
                
                // Sum file sizes
                stats.totalSize += media.file_size;

                // Track last upload
                const uploadDate = new Date(media.created_at);
                if (!stats.lastUpload || uploadDate > stats.lastUpload) {
                    stats.lastUpload = uploadDate;
                }
            });

            return stats;
        } catch (error) {
            console.error('Error getting media stats:', error);
            throw error;
        }
    }
} 