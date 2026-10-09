import { Alert, Box, Button, Skeleton, Stack, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

/**
 * Loading layout for detail screens (order / customer): mirrors the real
 * page's shape — back button, title block and a couple of cards — so the
 * content doesn't jump sideways when it finally arrives.
 */
export function DetailSkeleton({ cards = 2 }) {
  return (
    <Box sx={{ animation: 'fadeUp .3s ease both' }}>
      <Skeleton variant="rounded" width={104} height={32} sx={{ mb: 2 }} />
      <Skeleton variant="rounded" width={280} height={38} sx={{ maxWidth: '100%' }} />
      <Skeleton width={200} height={16} sx={{ mb: 0.75 }} />
      <Skeleton width={150} height={16} sx={{ mb: 2.5 }} />
      <Stack spacing={2}>
        {Array.from({ length: cards }).map((_, index) => (
          <Skeleton key={index} variant="rounded" height={150} />
        ))}
      </Stack>
    </Box>
  );
}

/** A few pulsing rows — stands in for a small list that's still loading. */
export function RowsSkeleton({ rows = 3, height = 52 }) {
  return (
    <Stack spacing={1.25}>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} variant="rounded" height={height} />
      ))}
    </Stack>
  );
}

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
