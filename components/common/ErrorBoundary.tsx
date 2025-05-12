import React from 'react';
import {
  Box,
  Alert,
  Button,
  Typography,
  Paper,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to error reporting service
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Paper
          elevation={3}
          sx={{
            p: 3,
            m: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Alert severity="error" sx={{ width: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {this.state.error?.message || 'An unexpected error occurred'}
            </Typography>
          </Alert>
          <Box display="flex" gap={2}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={this.handleRetry}
            >
              Retry
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>
          </Box>
        </Paper>
      );
    }

    return this.props.children;
  }
} 