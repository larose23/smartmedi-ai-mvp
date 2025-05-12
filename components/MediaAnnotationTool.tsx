import React, { useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    Typography,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Save as SaveIcon
} from '@mui/icons-material';
import { MediaManagementService, MediaAnnotation } from '@/lib/services/MediaManagementService';
import { toast } from 'react-hot-toast';

interface MediaAnnotationToolProps {
    mediaId: string;
    mediaType: 'image' | 'recording' | 'dicom';
    onAnnotationAdd?: (annotation: MediaAnnotation) => void;
}

export const MediaAnnotationTool: React.FC<MediaAnnotationToolProps> = ({
    mediaId,
    mediaType,
    onAnnotationAdd
}) => {
    const [open, setOpen] = useState(false);
    const [annotationType, setAnnotationType] = useState<MediaAnnotation['type']>('rectangle');
    const [label, setLabel] = useState('');
    const [color, setColor] = useState('#FF0000');
    const [notes, setNotes] = useState('');
    const [coordinates, setCoordinates] = useState<number[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);

    const handleStartAnnotation = () => {
        setOpen(true);
        setIsDrawing(true);
    };

    const handleSaveAnnotation = async () => {
        try {
            if (!label) {
                toast.error('Please provide a label for the annotation');
                return;
            }

            if (coordinates.length === 0) {
                toast.error('Please draw the annotation on the media');
                return;
            }

            const annotation = await MediaManagementService.addAnnotation(mediaId, {
                type: annotationType,
                coordinates,
                label,
                color,
                notes,
                createdBy: 'current-user-id' // TODO: Get actual user ID
            });

            toast.success('Annotation added successfully');
            onAnnotationAdd?.(annotation);
            setOpen(false);
            resetForm();
        } catch (error) {
            console.error('Error adding annotation:', error);
            toast.error('Failed to add annotation');
        }
    };

    const handleCancel = () => {
        setOpen(false);
        resetForm();
    };

    const resetForm = () => {
        setAnnotationType('rectangle');
        setLabel('');
        setColor('#FF0000');
        setNotes('');
        setCoordinates([]);
        setIsDrawing(false);
    };

    return (
        <>
            <Tooltip title="Add Annotation">
                <IconButton
                    onClick={handleStartAnnotation}
                    color="primary"
                >
                    <AddIcon />
                </IconButton>
            </Tooltip>

            <Dialog
                open={open}
                onClose={handleCancel}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Add Annotation</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 2 }}>
                        <FormControl fullWidth>
                            <InputLabel>Annotation Type</InputLabel>
                            <Select
                                value={annotationType}
                                onChange={(e) => setAnnotationType(e.target.value as MediaAnnotation['type'])}
                                label="Annotation Type"
                            >
                                <MenuItem value="rectangle">Rectangle</MenuItem>
                                <MenuItem value="circle">Circle</MenuItem>
                                <MenuItem value="polygon">Polygon</MenuItem>
                                <MenuItem value="line">Line</MenuItem>
                                <MenuItem value="point">Point</MenuItem>
                                <MenuItem value="text">Text</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            fullWidth
                            label="Label"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            required
                        />

                        <Box>
                            <Typography variant="body2" gutterBottom>
                                Color
                            </Typography>
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                style={{ width: '100%', height: 40 }}
                            />
                        </Box>

                        <TextField
                            fullWidth
                            label="Notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            multiline
                            rows={3}
                        />

                        <Box sx={{ border: '1px dashed grey', p: 2, borderRadius: 1 }}>
                            <Typography variant="body2" color="text.secondary" align="center">
                                {isDrawing ? 'Draw on the media to create annotation' : 'Click "Start Drawing" to begin'}
                            </Typography>
                            {!isDrawing && (
                                <Button
                                    startIcon={<EditIcon />}
                                    onClick={() => setIsDrawing(true)}
                                    sx={{ mt: 1 }}
                                >
                                    Start Drawing
                                </Button>
                            )}
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancel}>Cancel</Button>
                    <Button
                        onClick={handleSaveAnnotation}
                        variant="contained"
                        startIcon={<SaveIcon />}
                    >
                        Save Annotation
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}; 