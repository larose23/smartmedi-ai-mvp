import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    MenuItem,
    Select,
    TextField,
    Typography,
    useTheme,
    CircularProgress
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    History as HistoryIcon,
    Search as SearchIcon
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';

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

export default function DocumentExchangeManager() {
    const theme = useTheme();
    const [documents, setDocuments] = useState<DocumentExchange[]>([]);
    const [selectedDocument, setSelectedDocument] = useState<DocumentExchange | null>(null);
    const [versions, setVersions] = useState<DocumentVersion[]>([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [openVersionDialog, setOpenVersionDialog] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        sourceSystem: '',
        targetSystem: '',
        documentType: '',
        status: ''
    });

    const [newDocument, setNewDocument] = useState({
        sourceSystem: '',
        targetSystem: '',
        documentType: '',
        documentId: '',
        content: '',
        metadata: {}
    });

    const [newVersion, setNewVersion] = useState({
        content: '',
        metadata: {}
    });

    const [openStatusDialog, setOpenStatusDialog] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingVersions, setLoadingVersions] = useState(false);

    useEffect(() => {
        fetchDocuments();
    }, [searchQuery, filters]);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                query: searchQuery,
                ...filters
            });

            const response = await fetch(`/api/documents?${queryParams}`);
            if (!response.ok) throw new Error('Failed to fetch documents');
            const data = await response.json();
            setDocuments(data);
        } catch (error) {
            console.error('Error fetching documents:', error);
            toast.error('Failed to fetch documents');
        } finally {
            setLoading(false);
        }
    };

    const fetchVersions = async (documentId: string) => {
        setLoadingVersions(true);
        try {
            const response = await fetch(`/api/documents/${documentId}/versions`);
            if (!response.ok) throw new Error('Failed to fetch versions');
            const data = await response.json();
            setVersions(data);
        } catch (error) {
            console.error('Error fetching versions:', error);
            toast.error('Failed to fetch versions');
        } finally {
            setLoadingVersions(false);
        }
    };

    const handleCreateDocument = async () => {
        try {
            const response = await fetch('/api/documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newDocument)
            });

            if (!response.ok) throw new Error('Failed to create document');
            await response.json();
            toast.success('Document created successfully');
            setOpenDialog(false);
            fetchDocuments();
        } catch (error) {
            console.error('Error creating document:', error);
            toast.error('Failed to create document');
        }
    };

    const handleCreateVersion = async () => {
        if (!selectedDocument) return;

        try {
            const response = await fetch('/api/documents', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documentId: selectedDocument.id,
                    ...newVersion
                })
            });

            if (!response.ok) throw new Error('Failed to create version');
            await response.json();
            toast.success('Version created successfully');
            setOpenVersionDialog(false);
            fetchVersions(selectedDocument.id);
        } catch (error) {
            console.error('Error creating version:', error);
            toast.error('Failed to create version');
        }
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            const response = await fetch('/api/documents', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status })
            });

            if (!response.ok) throw new Error('Failed to update status');
            await response.json();
            toast.success('Status updated successfully');
            fetchDocuments();
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Failed to update status');
        }
    };

    const handleStatusUpdate = async () => {
        if (!selectedDocument || !selectedStatus) return;

        try {
            await handleUpdateStatus(selectedDocument.id, selectedStatus);
            setOpenStatusDialog(false);
            setSelectedStatus('');
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Failed to update status');
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                        <TextField
                            fullWidth
                            variant="outlined"
                            placeholder="Search documents..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: <SearchIcon />
                            }}
                        />
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => setOpenDialog(true)}
                        >
                            New Document
                        </Button>
                    </Box>
                </Grid>

                {/* Filter Bar */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={3}>
                                    <TextField
                                        fullWidth
                                        label="Source System"
                                        value={filters.sourceSystem}
                                        onChange={(e) =>
                                            setFilters({ ...filters, sourceSystem: e.target.value })
                                        }
                                    />
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <TextField
                                        fullWidth
                                        label="Target System"
                                        value={filters.targetSystem}
                                        onChange={(e) =>
                                            setFilters({ ...filters, targetSystem: e.target.value })
                                        }
                                    />
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <TextField
                                        fullWidth
                                        label="Document Type"
                                        value={filters.documentType}
                                        onChange={(e) =>
                                            setFilters({ ...filters, documentType: e.target.value })
                                        }
                                    />
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <Select
                                        fullWidth
                                        value={filters.status}
                                        onChange={(e) =>
                                            setFilters({ ...filters, status: e.target.value })
                                        }
                                        displayEmpty
                                    >
                                        <MenuItem value="">All Statuses</MenuItem>
                                        <MenuItem value="pending">Pending</MenuItem>
                                        <MenuItem value="processing">Processing</MenuItem>
                                        <MenuItem value="completed">Completed</MenuItem>
                                        <MenuItem value="failed">Failed</MenuItem>
                                    </Select>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Grid container spacing={2}>
                            {documents.map((doc) => (
                                <Grid item xs={12} md={6} lg={4} key={doc.id}>
                                    <Card>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                                <Typography variant="h6">
                                                    {doc.documentType}
                                                </Typography>
                                                <Chip
                                                    label={doc.status}
                                                    color={
                                                        doc.status === 'completed'
                                                            ? 'success'
                                                            : doc.status === 'pending'
                                                            ? 'warning'
                                                            : 'error'
                                                    }
                                                />
                                            </Box>
                                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                                From: {doc.sourceSystem} → To: {doc.targetSystem}
                                            </Typography>
                                            <Typography variant="body2" noWrap>
                                                ID: {doc.documentId}
                                            </Typography>
                                            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => {
                                                        setSelectedDocument(doc);
                                                        fetchVersions(doc.id);
                                                        setOpenVersionDialog(true);
                                                    }}
                                                >
                                                    <HistoryIcon />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setSelectedDocument(doc)}
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </Grid>
            </Grid>

            {/* New Document Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Create New Document Exchange</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Source System"
                                value={newDocument.sourceSystem}
                                onChange={(e) =>
                                    setNewDocument({ ...newDocument, sourceSystem: e.target.value })
                                }
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Target System"
                                value={newDocument.targetSystem}
                                onChange={(e) =>
                                    setNewDocument({ ...newDocument, targetSystem: e.target.value })
                                }
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Document Type"
                                value={newDocument.documentType}
                                onChange={(e) =>
                                    setNewDocument({ ...newDocument, documentType: e.target.value })
                                }
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Document ID"
                                value={newDocument.documentId}
                                onChange={(e) =>
                                    setNewDocument({ ...newDocument, documentId: e.target.value })
                                }
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                label="Content"
                                value={newDocument.content}
                                onChange={(e) =>
                                    setNewDocument({ ...newDocument, content: e.target.value })
                                }
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreateDocument} variant="contained">
                        Create
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Version History Dialog */}
            <Dialog
                open={openVersionDialog}
                onClose={() => setOpenVersionDialog(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Document Version History</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                label="New Version Content"
                                value={newVersion.content}
                                onChange={(e) =>
                                    setNewVersion({ ...newVersion, content: e.target.value })
                                }
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>
                                Version History
                            </Typography>
                            {loadingVersions ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                                    <CircularProgress />
                                </Box>
                            ) : (
                                versions.map((version) => (
                                    <Card key={version.id} sx={{ mb: 2 }}>
                                        <CardContent>
                                            <Typography variant="subtitle2">
                                                Version {version.versionNumber}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {new Date(version.createdAt).toLocaleString()}
                                            </Typography>
                                            <Typography variant="body2" sx={{ mt: 1 }}>
                                                {version.content}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenVersionDialog(false)}>Close</Button>
                    <Button onClick={handleCreateVersion} variant="contained">
                        Create Version
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Status Update Dialog */}
            <Dialog
                open={openStatusDialog}
                onClose={() => setOpenStatusDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Update Document Status</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <Select
                            fullWidth
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            displayEmpty
                        >
                            <MenuItem value="" disabled>
                                Select Status
                            </MenuItem>
                            <MenuItem value="pending">Pending</MenuItem>
                            <MenuItem value="processing">Processing</MenuItem>
                            <MenuItem value="completed">Completed</MenuItem>
                            <MenuItem value="failed">Failed</MenuItem>
                        </Select>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenStatusDialog(false)}>Cancel</Button>
                    <Button
                        onClick={handleStatusUpdate}
                        variant="contained"
                        disabled={!selectedStatus}
                    >
                        Update
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
} 