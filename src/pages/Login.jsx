import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAuthStore } from '../store/auth';

/**
 * Login screen — public route.
 *
 * Uses POST /api/users/login; on success the access token goes into
 * memory and the refresh cookie is set httpOnly by the server, then we
 * bounce the user to wherever they were originally headed.
 */
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, loading, error, clearError, bootstrapped } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);

  const from = location.state?.from || '/overview';

  useEffect(() => {
    // A reload on /login must still recognise an existing session
    // (otherwise a signed-in admin would be asked to log in again).
    if (!bootstrapped) useAuthStore.getState().bootstrap();
  }, [bootstrapped]);

  useEffect(() => {
    if (bootstrapped && user) navigate(from, { replace: true });
  }, [bootstrapped, user, from, navigate]);

  useEffect(() => () => clearError(), [clearError]);

  const emailError = touched && !email.trim() ? 'Email is required' : '';
  const passwordError = touched && !password ? 'Password is required' : '';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched(true);
    if (!email.trim() || !password) return;

    try {
      const loggedUser = await login(email.trim(), password);
      if (loggedUser?.role !== 'admin') {
        // Store keeps the session, but RequireAdmin will explain the
        // missing permission — navigate so that message renders.
        navigate(from, { replace: true });
        return;
      }
      navigate(from, { replace: true });
    } catch {
      /* error surfaced from the store */
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'background.default',
        px: 2,
        background: 'radial-gradient(1200px 600px at 20% -10%, #dbeafe 0%, transparent 60%), #f4f6fa',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 420, p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 3,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'grid',
              placeItems: 'center',
              mx: 'auto',
              mb: 1.5,
            }}
          >
            <LockOutlinedIcon />
          </Box>
          <Typography variant="h5">Admin Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">
            Sign in with an administrator account
          </Typography>
        </Box>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            label="Email address"
            type="email"
            fullWidth
            margin="normal"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={Boolean(emailError)}
            helperText={emailError}
          />
          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            fullWidth
            margin="normal"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={Boolean(passwordError)}
            helperText={passwordError}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((v) => !v)} edge="end" aria-label="Toggle password">
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 2.5 }} disabled={loading}>
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign in'}
          </Button>
        </Box>
      </Card>
    </Box>
  );
}
