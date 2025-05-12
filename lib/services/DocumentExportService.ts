import { supabase } from '../supabaseClient';
import { hipaaAuditLogger, PHICategory } from '../security/hipaa/audit';
import { hipaaEncryption } from '../security/hipaa/encryption';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { v4 as uuidv4 } from 'uuid';
import { sendEmail } from '../email';

interface DocumentShare {
    id: string;
    documentId: string;
    recipientEmail: string;
    accessToken: string;
    expiresAt: Date;
    createdAt: Date;
    status: 'pending' | 'accessed' | 'expired';
}

interface ElectronicSignature {
    id: string;
    documentId: string;
    userId: string;
    signatureData: string;
    signedAt: Date;
    metadata: Record<string, any>;
}

export class DocumentExportService {
    static async generatePatientSummaryPDF(patientId: string, encounterId?: string): Promise<Buffer> {
        try {
            // Fetch patient data
            const { data: patient, error: patientError } = await supabase
                .from('patients')
                .select('*')
                .eq('id', patientId)
                .single();

            if (patientError) throw patientError;

            // Fetch clinical notes
            const { data: notes, error: notesError } = await supabase
                .from('clinical_notes')
                .select('*')
                .eq('patientId', patientId)
                .order('createdAt', { ascending: false });

            if (notesError) throw notesError;

            // Create PDF
            const doc = new jsPDF();
            
            // Add header
            doc.setFontSize(20);
            doc.text('Patient Summary', 20, 20);
            
            // Add patient information
            doc.setFontSize(12);
            doc.text(`Name: ${patient.firstName} ${patient.lastName}`, 20, 40);
            doc.text(`DOB: ${new Date(patient.dateOfBirth).toLocaleDateString()}`, 20, 50);
            doc.text(`MRN: ${patient.mrn}`, 20, 60);

            // Add clinical notes
            let yPosition = 80;
            doc.setFontSize(14);
            doc.text('Clinical Notes', 20, yPosition);
            yPosition += 10;

            notes.forEach((note, index) => {
                if (yPosition > 250) {
                    doc.addPage();
                    yPosition = 20;
                }

                doc.setFontSize(12);
                doc.text(`Note ${index + 1} - ${new Date(note.createdAt).toLocaleDateString()}`, 20, yPosition);
                yPosition += 10;
                
                doc.setFontSize(10);
                const splitContent = doc.splitTextToSize(note.content, 170);
                doc.text(splitContent, 20, yPosition);
                yPosition += splitContent.length * 5 + 10;
            });

            // Log the export
            await hipaaAuditLogger.logAccess(
                'system',
                'provider',
                PHICategory.PHI,
                'patient_summary_export',
                { patientId, encounterId },
                '127.0.0.1',
                'DocumentExportService'
            );

            return Buffer.from(doc.output('arraybuffer'));
        } catch (error) {
            console.error('Error generating patient summary PDF:', error);
            throw error;
        }
    }

    static async shareDocument(
        documentId: string,
        recipientEmail: string,
        expiresInDays: number = 7
    ): Promise<DocumentShare> {
        try {
            const accessToken = uuidv4();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + expiresInDays);

            const share: DocumentShare = {
                id: uuidv4(),
                documentId,
                recipientEmail,
                accessToken,
                expiresAt,
                createdAt: new Date(),
                status: 'pending'
            };

            const { data, error } = await supabase
                .from('document_shares')
                .insert(share)
                .select()
                .single();

            if (error) throw error;

            // Send email to recipient
            const accessUrl = `${process.env.NEXT_PUBLIC_APP_URL}/documents/access?token=${accessToken}`;
            await sendEmail({
                to: recipientEmail,
                subject: 'Shared Document Access',
                text: `You have been granted access to a shared document. The access link will expire in ${expiresInDays} days.\n\nAccess Link: ${accessUrl}`,
                html: `
                    <h2>Shared Document Access</h2>
                    <p>You have been granted access to a shared document. The access link will expire in ${expiresInDays} days.</p>
                    <p><a href="${accessUrl}">Click here to access the document</a></p>
                    <p>If you did not request this access, please ignore this email.</p>
                `
            });

            // Log the share
            await hipaaAuditLogger.logAccess(
                'system',
                'provider',
                PHICategory.PHI,
                'document_share',
                { documentId, recipientEmail },
                '127.0.0.1',
                'DocumentExportService'
            );

            return data;
        } catch (error) {
            console.error('Error sharing document:', error);
            throw error;
        }
    }

    static async addElectronicSignature(
        documentId: string,
        userId: string,
        signatureData: string,
        metadata: Record<string, any> = {}
    ): Promise<ElectronicSignature> {
        try {
            const signature: ElectronicSignature = {
                id: uuidv4(),
                documentId,
                userId,
                signatureData,
                signedAt: new Date(),
                metadata
            };

            const { data, error } = await supabase
                .from('electronic_signatures')
                .insert(signature)
                .select()
                .single();

            if (error) throw error;

            // Log the signature
            await hipaaAuditLogger.logAccess(
                userId,
                'provider',
                PHICategory.PHI,
                'document_signature',
                { documentId },
                '127.0.0.1',
                'DocumentExportService'
            );

            return data;
        } catch (error) {
            console.error('Error adding electronic signature:', error);
            throw error;
        }
    }

    static async verifySignature(signatureId: string): Promise<boolean> {
        try {
            const { data: signature, error } = await supabase
                .from('electronic_signatures')
                .select('*')
                .eq('id', signatureId)
                .single();

            if (error) throw error;

            // Verify signature data
            if (!signature) {
                return false;
            }

            // Check if signature has expired (if expiration is set in metadata)
            if (signature.metadata?.expiresAt) {
                const expiresAt = new Date(signature.metadata.expiresAt);
                if (expiresAt < new Date()) {
                    return false;
                }
            }

            // Verify signature data integrity
            const signatureHash = await hipaaEncryption.hash(signature.signatureData);
            const storedHash = signature.metadata?.signatureHash;

            if (storedHash && signatureHash !== storedHash) {
                return false;
            }

            // Log verification attempt
            await hipaaAuditLogger.logAccess(
                'system',
                'provider',
                PHICategory.PHI,
                'signature_verification',
                { signatureId },
                '127.0.0.1',
                'DocumentExportService'
            );

            return true;
        } catch (error) {
            console.error('Error verifying signature:', error);
            return false;
        }
    }
} 