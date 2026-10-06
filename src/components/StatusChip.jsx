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

/** Coloured label for order / payment status. */
export default function StatusChip({ status, size = 'small' }) {
  return <Chip size={size} color={TONE[status] || 'default'} label={status || '—'} />;
}
