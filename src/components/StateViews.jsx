import { Alert, Box, Button, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

/** Error state for queries (with retry) and empty state for tables. */
export function ErrorState({ error, onRetry }) {
  return (
    <Alert
      severity="error"
      action={
        onRetry ? (
          <Button color="inherit" size="small" onClick={onRetry} startIcon={<RefreshIcon />}>
            Retry
          </Button>
        ) : null
      }
    >
      {error?.response?.data?.message || error?.message || 'Failed to load data'}
    </Alert>
  );
}

export function EmptyState({ title = 'Nothing here yet', subtitle }) {
  return (
    <Box sx={{ py: 6, textAlign: 'center' }}>
      <Typography fontWeight={600}>{title}</Typography>
      {subtitle ? (
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      ) : null}
    </Box>
  );
}
