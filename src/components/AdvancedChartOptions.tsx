import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  TextField,
  Typography,
  Divider,
} from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';

interface ChartOptions {
  chartType: 'line' | 'bar' | 'area' | 'scatter';
  showTooltip: boolean;
  showLegend: boolean;
  showGrid: boolean;
  animation: boolean;
  yAxisLabel: string;
  xAxisLabel: string;
  tooltipFormat: string;
}

interface AdvancedChartOptionsProps {
  onOptionsChange: (options: ChartOptions) => void;
  currentOptions: ChartOptions;
}

const AdvancedChartOptions: React.FC<AdvancedChartOptionsProps> = ({
  onOptionsChange,
  currentOptions,
}) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ChartOptions>(currentOptions);

  const handleChange = (field: keyof ChartOptions, value: any) => {
    const newOptions = { ...options, [field]: value };
    setOptions(newOptions);
    onOptionsChange(newOptions);
  };

  return (
    <Box>
      <Button
        variant="outlined"
        startIcon={<SettingsIcon />}
        onClick={() => setOpen(true)}
      >
        Chart Options
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Advanced Chart Options</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Chart Type</InputLabel>
              <Select
                value={options.chartType}
                label="Chart Type"
                onChange={(e) => handleChange('chartType', e.target.value)}
              >
                <MenuItem value="line">Line Chart</MenuItem>
                <MenuItem value="bar">Bar Chart</MenuItem>
                <MenuItem value="area">Area Chart</MenuItem>
                <MenuItem value="scatter">Scatter Plot</MenuItem>
              </Select>
            </FormControl>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" gutterBottom>
              Display Options
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={options.showTooltip}
                  onChange={(e) => handleChange('showTooltip', e.target.checked)}
                />
              }
              label="Show Tooltip"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={options.showLegend}
                  onChange={(e) => handleChange('showLegend', e.target.checked)}
                />
              }
              label="Show Legend"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={options.showGrid}
                  onChange={(e) => handleChange('showGrid', e.target.checked)}
                />
              }
              label="Show Grid"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={options.animation}
                  onChange={(e) => handleChange('animation', e.target.checked)}
                />
              }
              label="Enable Animation"
            />

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" gutterBottom>
              Axis Labels
            </Typography>

            <TextField
              fullWidth
              label="X-Axis Label"
              value={options.xAxisLabel}
              onChange={(e) => handleChange('xAxisLabel', e.target.value)}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Y-Axis Label"
              value={options.yAxisLabel}
              onChange={(e) => handleChange('yAxisLabel', e.target.value)}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Tooltip Format"
              value={options.tooltipFormat}
              onChange={(e) => handleChange('tooltipFormat', e.target.value)}
              helperText="Use {value} for the value and {label} for the label"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdvancedChartOptions; 