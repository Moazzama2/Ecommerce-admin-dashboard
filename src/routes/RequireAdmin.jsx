import { Navigate } from 'react-router-dom';
import { Alert, Box } from '@mui/material';
import { useAuthStore } from '../store/auth';

/**
 * Second gate inside RequireAuth: the API's isAdmin middleware rejects
 * non-admin tokens anyway (403), but we also avoid rendering admin UI
 * for a signed-in regular user.
 */
export default function RequireAdmin({ children }) {
  const user = useAuthStore((state) => state.user);

  if (user && user.role !== 'admin') {
    return (
      <Box sx={{ p: 4, maxWidth: 560, mx: 'auto' }}>
        <Alert severity="error" variant="outlined">
          Your account doesn&apos;t have access to the admin dashboard. Ask an
          administrator to grant you the admin role.
        </Alert>
      </Box>
    );
  }

  return children;
}
