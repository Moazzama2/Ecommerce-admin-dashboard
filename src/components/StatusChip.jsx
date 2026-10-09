import { Chip } from '@mui/material';

const TONE = {
  pending: 'warning',
  processing: 'info',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'error',
  paid: 'success',
  unpaid: 'warning',
};

/**
 * Coloured label for order / payment status.
 * Rendered as a soft tinted pill (light background, solid text) instead
 * of a solid fill, so long tables of statuses stay easy on the eyes.
 */
export default function StatusChip({ status, size = 'small' }) {
  const color = TONE[status] || 'default';
  const isDefault = color === 'default';

  return (
    <Chip
      size={size}
      color={color}
      label={status || '—'}
      sx={{
        bgcolor: isDefault ? 'rgba(100,116,139,.12)' : (theme) => `color-mix(in srgb, ${theme.palette[color].main} 14%, transparent)`,
        color: isDefault ? 'text.secondary' : (theme) => theme.palette[color].dark,
        '& .MuiChip-label': { textTransform: 'capitalize' },
      }}
    />
  );
}
