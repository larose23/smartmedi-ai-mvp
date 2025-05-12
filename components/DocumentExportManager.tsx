import React, { useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography,
    CircularProgress,
    Alert,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    PictureAsPdf as PdfIcon,
    Share as ShareIcon,
    Edit as EditIcon,
    CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { DocumentExportService } from '@/lib/services/DocumentExportService';
import SignaturePad from 'react-signature-canvas';
import { toast } from 'react-hot-toast';

interface DocumentExportManagerProps {
    patientId: string;
    encounterId?: string;
    documentId: string;
    onExport?: () => void;
    onShare?: () => void;
    onSign?: () => void;
}

export const DocumentExportManager: React.FC<DocumentExportManagerProps> = ({
    patientId,
    encounterId,
    documentId,
    onExport,
    onShare,
    onSign
}) => {
    const [loading, setLoading] = useState(false);
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [signDialogOpen, setSignDialogOpen] = useState(false);
    const [recipientEmail, setRecipientEmail] = useState('');
    const [expiresInDays, setExpiresInDays] = useState(7);
    const [signaturePad, setSignaturePad] = useState<SignaturePad | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleExportPDF = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const pdfBuffer = await DocumentExportService.generatePatientSummaryPDF(patientId, encounterId);
            
            // Create blob and download
            const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `patient-summary-${patientId}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success('PDF exported successfully');
            onExport?.();
        } catch (error) {
            console.error('Error exporting PDF:', error);
            setError('Failed to export PDF');
            toast.error('Failed to export PDF');
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        try {
            setLoading(true);
            setError(null);

            await DocumentExportService.shareDocument(documentId, recipientEmail, expiresInDays);
            
            setShareDialogOpen(false);
            toast.success('Document shared successfully');
            onShare?.();
        } catch (error) {
            console.error('Error sharing document:', error);
            setError('Failed to share document');
            toast.error('Failed to share document');
        } finally {
            setLoading(false);
        }
    };

    const handleSign = async () => {
        try {
            if (!signaturePad) {
                setError('Please provide a signature');
                return;
            }

            setLoading(true);
            setError(null);

            const signatureData = signaturePad.toDataURL();
            await DocumentExportService.addElectronicSignature(documentId, 'current-user-id', signatureData);
            
            setSignDialogOpen(false);
            toast.success('Document signed successfully');
            onSign?.();
        } catch (error) {
            console.error('Error signing document:', error);
            setError('Failed to sign document');
            toast.error('Failed to sign document');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Tooltip title="Export as PDF">
                <IconButton
                    onClick={handleExportPDF}
                    disabled={loading}
                    color="primary"
                >
                    <PdfIcon />
                </IconButton>
            </Tooltip>

            <Tooltip title="Share Document">
                <IconButton
                    onClick={() => setShareDialogOpen(true)}
                    disabled={loading}
                    color="primary"
                >
                    <ShareIcon />
                </IconButton>
            </Tooltip>

            <Tooltip title="Sign Document">
                <IconButton
                    onClick={() => setSignDialogOpen(true)}
                    disabled={loading}
                    color="primary"
                >
                    <EditIcon />
                </IconButton>
            </Tooltip>

            {/* Share Dialog */}
            <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)}>
                <DialogTitle>Share Document</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Recipient Email"
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        margin="normal"
                    />
                    <TextField
                        fullWidth
                        label="Expires in (days)"
                        type="number"
                        value={expiresInDays}
                        onChange={(e) => setExpiresInDays(Number(e.target.value))}
                        margin="normal"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShareDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleShare}
                        variant="contained"
                        disabled={loading || !recipientEmail}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Share'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Sign Dialog */}
            <Dialog open={signDialogOpen} onClose={() => setSignDialogOpen(false)}>
                <DialogTitle>Sign Document</DialogTitle>
                <DialogContent>
                    <Box sx={{ border: '1px solid #ccc', borderRadius: 1, p: 2, mb: 2 }}>
                        <SignaturePad
                            ref={(ref) => setSignaturePad(ref)}
                            canvasProps={{
                                width: 500,
                                height: 200,
                                className: 'signature-canvas'
                            }}
                        />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                        Please sign above using your mouse or touch screen
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSignDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleSign}
                        variant="contained"
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Sign'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}; 