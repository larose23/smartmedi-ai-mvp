import { supabase } from '@/lib/supabase';
import { IntegrationService } from './IntegrationService';

export interface ClinicalNote {
    id: string;
    patientId: string;
    encounterId: string;
    providerId: string;
    templateId: string;
    content: {
        sections: {
            title: string;
            content: string;
            type: 'text' | 'voice' | 'auto' | 'structured';
        }[];
    };
    status: 'draft' | 'final' | 'amended';
    metadata: Record<string, any>;
    createdAt: string;
    updatedAt: string;
    version?: number;
    previousVersionId?: string;
}

export interface NoteTemplate {
    id: string;
    name: string;
    specialty: string;
    sections: {
        title: string;
        type: 'text' | 'voice' | 'auto' | 'structured';
        required: boolean;
        defaultContent?: string;
        validationRules?: {
            type: 'required' | 'minLength' | 'maxLength' | 'pattern';
            value: any;
        }[];
    }[];
    metadata: Record<string, any>;
}

export class ClinicalDocumentService {
    // Template Management
    static async createTemplate(template: Omit<NoteTemplate, 'id'>): Promise<NoteTemplate> {
        try {
            const { data, error } = await supabase
                .from('note_templates')
                .insert(template)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating note template:', error);
            throw error;
        }
    }

    static async getTemplate(id: string): Promise<NoteTemplate> {
        try {
            const { data, error } = await supabase
                .from('note_templates')
                .select()
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting note template:', error);
            throw error;
        }
    }

    static async getTemplatesBySpecialty(specialty: string): Promise<NoteTemplate[]> {
        try {
            const { data, error } = await supabase
                .from('note_templates')
                .select()
                .eq('specialty', specialty);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting templates by specialty:', error);
            throw error;
        }
    }

    // Clinical Note Management
    static async createNote(note: Omit<ClinicalNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClinicalNote> {
        try {
            const { data, error } = await supabase
                .from('clinical_notes')
                .insert({
                    ...note,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating clinical note:', error);
            throw error;
        }
    }

    static async getNote(id: string): Promise<ClinicalNote> {
        try {
            const { data, error } = await supabase
                .from('clinical_notes')
                .select()
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting clinical note:', error);
            throw error;
        }
    }

    static async updateNote(id: string, updates: Partial<ClinicalNote>): Promise<ClinicalNote> {
        try {
            const { data, error } = await supabase
                .from('clinical_notes')
                .update({
                    ...updates,
                    updatedAt: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating clinical note:', error);
            throw error;
        }
    }

    // Voice-to-Text Conversion
    static async convertVoiceToText(audioBlob: Blob): Promise<string> {
        try {
            // TODO: Implement actual voice-to-text conversion
            // This is a placeholder for the actual implementation
            // You would typically use a service like Google Cloud Speech-to-Text
            // or Azure Speech Services here
            throw new Error('Voice-to-text conversion not implemented');
        } catch (error) {
            console.error('Error converting voice to text:', error);
            throw error;
        }
    }

    // Auto-generation from Encounter Data
    static async generateNoteFromEncounter(
        encounterId: string,
        templateId: string
    ): Promise<ClinicalNote> {
        try {
            // Get encounter data
            const encounter = await IntegrationService.getFHIRResource('Encounter', encounterId);
            
            // Get template
            const template = await this.getTemplate(templateId);
            
            // Generate note content based on template and encounter data
            const content = {
                sections: template.sections.map(section => {
                    let content = '';
                    
                    if (section.type === 'auto') {
                        // Generate content based on encounter data
                        switch (section.title.toLowerCase()) {
                            case 'chief complaint':
                                content = encounter.reasonCode?.[0]?.text || '';
                                break;
                            case 'vital signs':
                                // Extract vital signs from encounter
                                content = this.extractVitalSigns(encounter);
                                break;
                            case 'assessment':
                                // Generate assessment based on encounter data
                                content = this.generateAssessment(encounter);
                                break;
                            default:
                                content = section.defaultContent || '';
                        }
                    } else {
                        content = section.defaultContent || '';
                    }
                    
                    return {
                        title: section.title,
                        content,
                        type: section.type
                    };
                })
            };

            // Create the note
            return await this.createNote({
                patientId: encounter.subject.reference.split('/')[1],
                encounterId,
                providerId: encounter.participant?.[0]?.individual?.reference?.split('/')[1] || '',
                templateId,
                content,
                status: 'draft',
                metadata: {
                    autoGenerated: true,
                    encounterData: encounter
                }
            });
        } catch (error) {
            console.error('Error generating note from encounter:', error);
            throw error;
        }
    }

    // Helper methods for auto-generation
    private static extractVitalSigns(encounter: any): string {
        // TODO: Implement actual vital signs extraction
        return 'Vital signs extraction not implemented';
    }

    private static generateAssessment(encounter: any): string {
        // TODO: Implement actual assessment generation
        return 'Assessment generation not implemented';
    }

    // Note Management
    static async deleteNote(id: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('clinical_notes')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting clinical note:', error);
            throw error;
        }
    }

    static async getNotesByPatient(patientId: string): Promise<ClinicalNote[]> {
        try {
            const { data, error } = await supabase
                .from('clinical_notes')
                .select()
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting notes by patient:', error);
            throw error;
        }
    }

    static async getNotesByEncounter(encounterId: string): Promise<ClinicalNote[]> {
        try {
            const { data, error } = await supabase
                .from('clinical_notes')
                .select()
                .eq('encounter_id', encounterId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting notes by encounter:', error);
            throw error;
        }
    }

    static async createNoteAmendment(noteId: string, updates: Partial<ClinicalNote>): Promise<ClinicalNote> {
        try {
            // Get the original note
            const originalNote = await this.getNote(noteId);
            
            // Create a new version
            const newNote = await this.createNote({
                ...originalNote,
                ...updates,
                status: 'amended',
                version: (originalNote.version || 1) + 1,
                previousVersionId: noteId,
                metadata: {
                    ...originalNote.metadata,
                    amendmentReason: updates.metadata?.amendmentReason,
                    amendedAt: new Date().toISOString()
                }
            });

            // Update the original note status
            await this.updateNote(noteId, {
                status: 'amended',
                metadata: {
                    ...originalNote.metadata,
                    amendedBy: newNote.id,
                    amendedAt: new Date().toISOString()
                }
            });

            return newNote;
        } catch (error) {
            console.error('Error creating note amendment:', error);
            throw error;
        }
    }

    static async getNoteHistory(noteId: string): Promise<ClinicalNote[]> {
        try {
            const history: ClinicalNote[] = [];
            let currentNote = await this.getNote(noteId);
            
            while (currentNote) {
                history.unshift(currentNote);
                if (currentNote.previousVersionId) {
                    currentNote = await this.getNote(currentNote.previousVersionId);
                } else {
                    break;
                }
            }

            return history;
        } catch (error) {
            console.error('Error getting note history:', error);
            throw error;
        }
    }

    // Template Management
    static async duplicateTemplate(templateId: string, newName: string): Promise<NoteTemplate> {
        try {
            const template = await this.getTemplate(templateId);
            const newTemplate = {
                ...template,
                id: undefined,
                name: newName,
                metadata: {
                    ...template.metadata,
                    duplicatedFrom: templateId,
                    duplicatedAt: new Date().toISOString()
                }
            };
            return await this.createTemplate(newTemplate);
        } catch (error) {
            console.error('Error duplicating template:', error);
            throw error;
        }
    }

    static async exportTemplate(templateId: string): Promise<string> {
        try {
            const template = await this.getTemplate(templateId);
            return JSON.stringify(template, null, 2);
        } catch (error) {
            console.error('Error exporting template:', error);
            throw error;
        }
    }

    static async importTemplate(templateJson: string): Promise<NoteTemplate> {
        try {
            const template = JSON.parse(templateJson);
            return await this.createTemplate(template);
        } catch (error) {
            console.error('Error importing template:', error);
            throw error;
        }
    }

    // Validation
    static validateNote(note: ClinicalNote, template: NoteTemplate): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Check required sections
        template.sections.forEach(templateSection => {
            if (templateSection.required) {
                const noteSection = note.content.sections.find(s => s.title === templateSection.title);
                if (!noteSection || !noteSection.content.trim()) {
                    errors.push(`Required section "${templateSection.title}" is empty`);
                }
            }
        });

        // Check section types
        note.content.sections.forEach(noteSection => {
            const templateSection = template.sections.find(s => s.title === noteSection.title);
            if (templateSection && noteSection.type !== templateSection.type) {
                errors.push(`Section "${noteSection.title}" has incorrect type`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }
} 