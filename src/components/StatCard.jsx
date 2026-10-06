import { Avatar, Box, Card, Typography } from '@mui/material';

/**
 * KPI tile for the overview screen.
 * `delta` is optional: pass { value: '+12%', up: true } when the API
 * grows to provide comparisons — omitted here, it simply isn't shown.
 */
export default function StatCard({ icon, label, value, subheader, color = 'primary.main', tone }) {
  return (
    <Card sx={{ p: 2.5, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
      <Avatar variant="rounded" sx={{ bgcolor: tone || color, width: 46, height: 46 }}>
        {icon}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary" fontWeight={600}>
          {label}
        </Typography>
        <Typography variant="h5" fontWeight={700} noWrap>
          {value}
        </Typography>
        {subheader ? (
          <Typography variant="caption" color="text.secondary">
            {subheader}
          </Typography>
        ) : null}
      </Box>
    </Card>
  );
}

export function formatMoney(amount, currency = 'PKR') {
  const value = Number(amount) || 0;
  return `${currency} ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
