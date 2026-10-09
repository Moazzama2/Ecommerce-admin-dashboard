import { Box, Typography } from '@mui/material';

/** Consistent page title + optional action slot. */
export default function PageHeader({ title, subtitle, action }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 2,
        mb: 3,
        flexWrap: 'wrap',
        animation: 'fadeUp .35s ease both',
      }}
    >
      <Box sx={{ flexGrow: 1, minWidth: 200 }}>
        <Typography variant="h5">{title}</Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {action ? <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>{action}</Box> : null}
    </Box>
  );
}
