import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  Description as DocumentIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { MediaManagementService } from '@/lib/services/MediaManagementService';
import { DICOMViewer } from './DICOMViewer';
import { MediaAnnotationTool } from './MediaAnnotationTool';

interface ClinicalMediaManagerProps {
  patientId: string;
  encounterId?: string;
}

export const ClinicalMediaManager: React.FC<ClinicalMediaManagerProps> = ({
  patientId,
  encounterId,
}) => {
  const theme = useTheme();
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewerDialogOpen, setViewerDialogOpen] = useState(false);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'video/*': ['.mp4', '.webm'],
      'application/dicom': ['.dcm'],
    },
    onDrop: handleFileDrop,
  });

  useEffect(() => {
    loadMedia();
  }, [patientId, encounterId]);

  async function loadMedia() {
    try {
      setLoading(true);
      const mediaList = await MediaManagementService.getMedia(patientId);
      setMedia(mediaList);
    } catch (error) {
      console.error('Error loading media:', error);
      toast.error('Failed to load media files');
    } finally {
      setLoading(false);
    }
  }

  async function handleFileDrop(acceptedFiles: File[]) {
    try {
      setLoading(true);
      for (const file of acceptedFiles) {
        await MediaManagementService.uploadMedia(patientId, file, encounterId);
      }
      toast.success('Files uploaded successfully');
      loadMedia();
      setUploadDialogOpen(false);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(mediaId: string) {
    if (!confirm('Are you sure you want to delete this media?')) return;

    try {
      setLoading(true);
      await MediaManagementService.deleteMedia(mediaId);
      toast.success('Media deleted successfully');
      loadMedia();
    } catch (error) {
      console.error('Error deleting media:', error);
      toast.error('Failed to delete media');
    } finally {
      setLoading(false);
    }
  }

  function handleView(media: any) {
    setSelectedMedia(media);
    setViewerDialogOpen(true);
  }

  function getMediaIcon(type: string) {
    switch (type) {
      case 'image':
        return <ImageIcon />;
      case 'recording':
        return <VideoIcon />;
      case 'dicom':
        return <DocumentIcon />;
      default:
        return <DocumentIcon />;
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Clinical Media</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setUploadDialogOpen(true)}
        >
          Upload Media
        </Button>
      </Box>

      <Grid container spacing={2}>
        {media.map((item) => (
          <Grid item xs={12} sm={6} md={4} key={item.id}>
            <Card>
              {item.type === 'image' && (
                <CardMedia
                  component="img"
                  height="140"
                  image={item.url}
                  alt={item.file_name}
                />
              )}
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {getMediaIcon(item.type)}
                  <Typography variant="subtitle1" sx={{ ml: 1 }}>
                    {item.file_name}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {new Date(item.created_at).toLocaleDateString()}
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                  <IconButton
                    size="small"
                    onClick={() => handleView(item)}
                    title="View"
                  >
                    <DownloadIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(item.id)}
                    title="Delete"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload Media</DialogTitle>
        <DialogContent>
          <Box
            {...getRootProps()}
            sx={{
              border: `2px dashed ${theme.palette.primary.main}`,
              borderRadius: 1,
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
            }}
          >
            <input {...getInputProps()} />
            <Typography>
              Drag and drop files here, or click to select files
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Supported formats: Images (PNG, JPG, GIF), Videos (MP4, WebM), DICOM
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={viewerDialogOpen}
        onClose={() => setViewerDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>{selectedMedia?.file_name}</DialogTitle>
        <DialogContent>
          {selectedMedia && (
            <Box sx={{ height: '70vh' }}>
              {selectedMedia.type === 'dicom' ? (
                <DICOMViewer url={selectedMedia.url} />
              ) : selectedMedia.type === 'image' ? (
                <Box
                  component="img"
                  src={selectedMedia.url}
                  alt={selectedMedia.file_name}
                  sx={{ maxWidth: '100%', maxHeight: '100%' }}
                />
              ) : (
                <Box
                  component="video"
                  src={selectedMedia.url}
                  controls
                  sx={{ maxWidth: '100%', maxHeight: '100%' }}
                />
              )}
              <MediaAnnotationTool
                mediaId={selectedMedia.id}
                mediaType={selectedMedia.type}
                onAnnotationAdded={() => loadMedia()}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewerDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 