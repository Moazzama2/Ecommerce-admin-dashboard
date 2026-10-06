import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuthStore } from '../store/auth';

/**
 * Gate for every authenticated screen.
 *
 * On first mount the app hasn't asked the server who we are yet
 * (bootstrap → /api/users/refresh with the httpOnly cookie), so we show
 * a spinner instead of yanking the user to /login mid-restore.
 */
export default function RequireAuth({ children }) {
  const { user, bootstrapped, bootstrap } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (!bootstrapped) bootstrap();
  }, [bootstrapped, bootstrap]);

  if (!bootstrapped) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    // Remember where they were headed so login can send them back.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
