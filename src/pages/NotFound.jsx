import { Box, Button, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        textAlign: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Box>
        <Typography variant="h2" fontWeight={800} color="primary.main">
          404
        </Typography>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Page not found
        </Typography>
        <Button component={Link} to="/overview" variant="contained">
          Back to dashboard
        </Button>
      </Box>
    </Box>
  );
}
