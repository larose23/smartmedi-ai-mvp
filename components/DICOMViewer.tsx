import React, { useEffect, useRef, useState } from 'react';
import {
    Box,
    IconButton,
    Slider,
    Stack,
    Tooltip,
    Typography,
    CircularProgress
} from '@mui/material';
import {
    ZoomIn as ZoomInIcon,
    ZoomOut as ZoomOutIcon,
    PanTool as PanToolIcon,
    Straighten as StraightenIcon,
    TextFields as TextIcon,
    Brightness6 as BrightnessIcon,
    Contrast as ContrastIcon
} from '@mui/icons-material';
import * as cornerstone from 'cornerstone-core';
import * as cornerstoneTools from 'cornerstone-tools';
import { MediaManagementService } from '@/lib/services/MediaManagementService';

interface DICOMViewerProps {
    url: string;
    onAnnotationAdd?: (annotation: any) => void;
}

export const DICOMViewer: React.FC<DICOMViewerProps> = ({
    url,
    onAnnotationAdd
}) => {
    const canvasRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [windowWidth, setWindowWidth] = useState(400);
    const [windowCenter, setWindowCenter] = useState(40);
    const [zoom, setZoom] = useState(1);
    const [activeTool, setActiveTool] = useState<string>('Pan');

    useEffect(() => {
        const initializeViewer = async () => {
            try {
                if (!canvasRef.current) return;

                // Load DICOM file
                const { imageId, image } = await MediaManagementService.loadDICOMFile(url);

                // Enable the element
                cornerstone.enable(canvasRef.current);

                // Display the image
                await cornerstone.displayImage(canvasRef.current, image);

                // Set up tools
                cornerstoneTools.init({
                    showSVGCursors: true
                });

                // Add tools
                cornerstoneTools.addTool(cornerstoneTools.PanTool);
                cornerstoneTools.addTool(cornerstoneTools.ZoomTool);
                cornerstoneTools.addTool(cornerstoneTools.LengthTool);
                cornerstoneTools.addTool(cornerstoneTools.ProbeTool);
                cornerstoneTools.addTool(cornerstoneTools.RectangleRoiTool);
                cornerstoneTools.addTool(cornerstoneTools.TextMarkerTool);

                // Set up event listeners
                cornerstone.events.addEventListener('cornerstoneimagerendered', () => {
                    setLoading(false);
                });

                // Set up annotation event listener
                cornerstone.events.addEventListener('cornerstonenewimage', (event: any) => {
                    const image = event.detail.image;
                    setWindowWidth(image.windowWidth);
                    setWindowCenter(image.windowCenter);
                });

                setLoading(false);
            } catch (error) {
                console.error('Error initializing DICOM viewer:', error);
                setError('Failed to load DICOM image');
                setLoading(false);
            }
        };

        initializeViewer();

        return () => {
            if (canvasRef.current) {
                cornerstone.disable(canvasRef.current);
            }
        };
    }, [url]);

    const handleToolChange = (tool: string) => {
        setActiveTool(tool);
        cornerstoneTools.setToolActive(tool, { mouseButtonMask: 1 });
    };

    const handleWindowWidthChange = (_: Event, value: number | number[]) => {
        const newWidth = value as number;
        setWindowWidth(newWidth);
        if (canvasRef.current) {
            const viewport = cornerstone.getDefaultViewport(canvasRef.current);
            viewport.voi.windowWidth = newWidth;
            cornerstone.setViewport(canvasRef.current, viewport);
        }
    };

    const handleWindowCenterChange = (_: Event, value: number | number[]) => {
        const newCenter = value as number;
        setWindowCenter(newCenter);
        if (canvasRef.current) {
            const viewport = cornerstone.getDefaultViewport(canvasRef.current);
            viewport.voi.windowCenter = newCenter;
            cornerstone.setViewport(canvasRef.current, viewport);
        }
    };

    const handleZoom = (factor: number) => {
        const newZoom = zoom * factor;
        setZoom(newZoom);
        if (canvasRef.current) {
            const viewport = cornerstone.getDefaultViewport(canvasRef.current);
            viewport.scale = newZoom;
            cornerstone.setViewport(canvasRef.current, viewport);
        }
    };

    return (
        <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
            {loading && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(0, 0, 0, 0.5)',
                        zIndex: 1
                    }}
                >
                    <CircularProgress />
                </Box>
            )}

            {error && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(0, 0, 0, 0.5)',
                        zIndex: 1
                    }}
                >
                    <Typography color="error">{error}</Typography>
                </Box>
            )}

            <Box
                ref={canvasRef}
                sx={{
                    width: '100%',
                    height: '100%',
                    bgcolor: 'black'
                }}
            />

            <Stack
                direction="row"
                spacing={1}
                sx={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    borderRadius: 1,
                    p: 1
                }}
            >
                <Tooltip title="Pan">
                    <IconButton
                        color={activeTool === 'Pan' ? 'primary' : 'default'}
                        onClick={() => handleToolChange('Pan')}
                    >
                        <PanToolIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Zoom In">
                    <IconButton onClick={() => handleZoom(1.2)}>
                        <ZoomInIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Zoom Out">
                    <IconButton onClick={() => handleZoom(0.8)}>
                        <ZoomOutIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Measure Length">
                    <IconButton
                        color={activeTool === 'Length' ? 'primary' : 'default'}
                        onClick={() => handleToolChange('Length')}
                    >
                        <StraightenIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Add Text">
                    <IconButton
                        color={activeTool === 'TextMarker' ? 'primary' : 'default'}
                        onClick={() => handleToolChange('TextMarker')}
                    >
                        <TextIcon />
                    </IconButton>
                </Tooltip>
            </Stack>

            <Stack
                direction="column"
                spacing={2}
                sx={{
                    position: 'absolute',
                    right: 16,
                    top: 16,
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    borderRadius: 1,
                    p: 2,
                    width: 200
                }}
            >
                <Box>
                    <Typography variant="body2" color="white" gutterBottom>
                        Window Width
                    </Typography>
                    <Slider
                        value={windowWidth}
                        onChange={handleWindowWidthChange}
                        min={1}
                        max={4000}
                        step={1}
                    />
                </Box>
                <Box>
                    <Typography variant="body2" color="white" gutterBottom>
                        Window Center
                    </Typography>
                    <Slider
                        value={windowCenter}
                        onChange={handleWindowCenterChange}
                        min={-1000}
                        max={1000}
                        step={1}
                    />
                </Box>
            </Stack>
        </Box>
    );
}; 