import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { TriageCase } from '../../types/triage';
import { triageService } from '../../services/triageService';

interface QueuePanelProps {
  cases: TriageCase[];
  onUpdate: () => void;
}

const severityColors = {
  critical: '#d32f2f',
  urgent: '#f57c00',
  moderate: '#1976d2',
  stable: '#388e3c',
};

export default function QueuePanel({ cases, onUpdate }: QueuePanelProps) {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterAgeGroup, setFilterAgeGroup] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCase, setSelectedCase] = useState<TriageCase | null>(null);
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [escalateReason, setEscalateReason] = useState('');
  const [staffNotes, setStaffNotes] = useState('');

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, case_: TriageCase) => {
    setAnchorEl(event.currentTarget);
    setSelectedCase(case_);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCase(null);
  };

  const handleOverride = async () => {
    if (!selectedCase) return;
    try {
      await triageService.overrideTriageSeverity(
        selectedCase.id,
        filterSeverity,
        overrideReason
      );
      handleMenuClose();
      setOverrideDialogOpen(false);
      setOverrideReason('');
      onUpdate();
    } catch (error) {
      console.error('Error overriding triage severity:', error);
    }
  };

  const handleEscalate = async () => {
    if (!selectedCase) return;
    try {
      await triageService.escalateCase(selectedCase.id, escalateReason);
      handleMenuClose();
      setEscalateDialogOpen(false);
      setEscalateReason('');
      onUpdate();
    } catch (error) {
      console.error('Error escalating case:', error);
    }
  };

  const handleAddNotes = async () => {
    if (!selectedCase) return;
    try {
      await triageService.addStaffNotes(selectedCase.id, staffNotes);
      handleMenuClose();
      setNotesDialogOpen(false);
      setStaffNotes('');
      onUpdate();
    } catch (error) {
      console.error('Error adding staff notes:', error);
    }
  };

  const handleMarkAsSeen = async (case_: TriageCase) => {
    try {
      await triageService.markCaseAsSeen(case_.id);
      onUpdate();
    } catch (error) {
      console.error('Error marking case as seen:', error);
    }
  };

  const filteredCases = cases.filter((case_) => {
    if (filterSeverity !== 'all' && case_.severity !== filterSeverity) return false;
    if (filterAgeGroup !== 'all' && case_.ageGroup !== filterAgeGroup) return false;
    if (filterDepartment !== 'all' && case_.department !== filterDepartment) return false;
    return true;
  });

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>Severity</InputLabel>
            <Select
              value={filterSeverity}
              label="Severity"
              onChange={(e) => setFilterSeverity(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
              <MenuItem value="moderate">Moderate</MenuItem>
              <MenuItem value="stable">Stable</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>Age Group</InputLabel>
            <Select
              value={filterAgeGroup}
              label="Age Group"
              onChange={(e) => setFilterAgeGroup(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pediatric">Pediatric</MenuItem>
              <MenuItem value="adult">Adult</MenuItem>
              <MenuItem value="geriatric">Geriatric</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>Department</InputLabel>
            <Select
              value={filterDepartment}
              label="Department"
              onChange={(e) => setFilterDepartment(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="emergency">Emergency</MenuItem>
              <MenuItem value="urgent_care">Urgent Care</MenuItem>
              <MenuItem value="primary_care">Primary Care</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {filteredCases.map((case_) => (
        <Card key={case_.id} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6">{case_.patientName}</Typography>
                <Typography color="textSecondary">
                  Age: {case_.age} ({case_.ageGroup})
                </Typography>
                <Typography color="textSecondary">Department: {case_.department}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={case_.severity}
                  sx={{
                    backgroundColor: severityColors[case_.severity],
                    color: 'white',
                  }}
                />
                {case_.isEscalated && (
                  <Chip
                    icon={<WarningIcon />}
                    label="Escalated"
                    color="warning"
                  />
                )}
                {!case_.seenByStaff && (
                  <Chip
                    icon={<ErrorIcon />}
                    label="Unseen"
                    color="error"
                  />
                )}
                <IconButton onClick={(e) => handleMenuClick(e, case_)}>
                  <MoreVertIcon />
                </IconButton>
              </Box>
            </Box>
            <Typography sx={{ mt: 1 }}>Symptoms: {case_.symptoms}</Typography>
            <Typography color="textSecondary">
              Wait Time: {case_.waitTime} minutes
            </Typography>
            {case_.staffNotes && (
              <Typography color="textSecondary" sx={{ mt: 1 }}>
                Staff Notes: {case_.staffNotes}
              </Typography>
            )}
          </CardContent>
        </Card>
      ))}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => setOverrideDialogOpen(true)}>
          Override Triage
        </MenuItem>
        <MenuItem onClick={() => setEscalateDialogOpen(true)}>
          Escalate Case
        </MenuItem>
        <MenuItem onClick={() => setNotesDialogOpen(true)}>
          Add Staff Notes
        </MenuItem>
        {selectedCase && !selectedCase.seenByStaff && (
          <MenuItem onClick={() => handleMarkAsSeen(selectedCase)}>
            Mark as Seen
          </MenuItem>
        )}
      </Menu>

      {/* Override Dialog */}
      <Dialog open={overrideDialogOpen} onClose={() => setOverrideDialogOpen(false)}>
        <DialogTitle>Override Triage Severity</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Reason for Override"
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOverrideDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleOverride} color="primary">
            Override
          </Button>
        </DialogActions>
      </Dialog>

      {/* Escalate Dialog */}
      <Dialog open={escalateDialogOpen} onClose={() => setEscalateDialogOpen(false)}>
        <DialogTitle>Escalate Case</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Reason for Escalation"
            value={escalateReason}
            onChange={(e) => setEscalateReason(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEscalateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEscalate} color="warning">
            Escalate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onClose={() => setNotesDialogOpen(false)}>
        <DialogTitle>Add Staff Notes</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Staff Notes"
            value={staffNotes}
            onChange={(e) => setStaffNotes(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotesDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddNotes} color="primary">
            Add Notes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 