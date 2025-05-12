import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { ArchiveVerificationService } from '@/services/archiveVerificationService';

interface ArchiveExportDialogProps {
  open: boolean;
  onClose: () => void;
  patients: any[];
}

type ExportFormat = 'csv' | 'pdf';
type ExportDestination = 'local' | 'metabase' | 'looker';

export const ArchiveExportDialog: React.FC<ArchiveExportDialogProps> = ({
  open,
  onClose,
  patients,
}) => {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [destination, setDestination] = useState<ExportDestination>('local');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const archiveVerificationService = ArchiveVerificationService.getInstance();
      await archiveVerificationService.exportArchiveData({
        format,
        destination,
        dateRange,
        patients,
      });

      setSuccess('Export completed successfully');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Export Archive Data</DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Stack spacing={3}>
          <FormControl component="fieldset">
            <Typography variant="subtitle2" gutterBottom>
              Export Format
            </Typography>
            <RadioGroup
              value={format}
              onChange={(e) => setFormat(e.target.value as ExportFormat)}
            >
              <FormControlLabel
                value="csv"
                control={<Radio />}
                label="CSV"
              />
              <FormControlLabel
                value="pdf"
                control={<Radio />}
                label="PDF"
              />
            </RadioGroup>
          </FormControl>

          <FormControl component="fieldset">
            <Typography variant="subtitle2" gutterBottom>
              Export Destination
            </Typography>
            <RadioGroup
              value={destination}
              onChange={(e) => setDestination(e.target.value as ExportDestination)}
            >
              <FormControlLabel
                value="local"
                control={<Radio />}
                label="Download Locally"
              />
              <FormControlLabel
                value="metabase"
                control={<Radio />}
                label="Export to Metabase"
              />
              <FormControlLabel
                value="looker"
                control={<Radio />}
                label="Export to Looker"
              />
            </RadioGroup>
          </FormControl>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Date Range
            </Typography>
            <Box display="flex" gap={2}>
              <DatePicker
                label="Start Date"
                value={dateRange[0]}
                onChange={(date) => setDateRange([date, dateRange[1]])}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <DatePicker
                label="End Date"
                value={dateRange[1]}
                onChange={(date) => setDateRange([dateRange[0], date])}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Box>
          </Box>

          {destination !== 'local' && (
            <TextField
              label="API Key"
              type="password"
              fullWidth
              helperText={`Enter your ${destination} API key`}
            />
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          disabled={loading || !dateRange[0] || !dateRange[1]}
        >
          {loading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Exporting...
            </>
          ) : (
            'Export'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 