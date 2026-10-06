import { Box, Typography } from '@mui/material';

/** Consistent page title + optional action slot. */
export default function PageHeader({ title, subtitle, action }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
      <Box sx={{ flexGrow: 1, minWidth: 200 }}>
        <Typography variant="h5">{title}</Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {action}
    </Box>
  );
}
