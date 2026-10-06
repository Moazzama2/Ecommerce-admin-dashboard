import { useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { changePassword } from '../api/auth';
import { useAuthStore } from '../store/auth';
import PageHeader from '../components/PageHeader';
import { errorMessage } from '../api/client';

export default function Profile() {
  const user = useAuthStore((s) => s.user);

  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [formError, setFormError] = useState(null);
  const [done, setDone] = useState(null);

  const mutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }) => changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      setFormError(null);
      setDone('Password updated successfully.');
    },
    onError: (err) => {
      setDone(null);
      setFormError(errorMessage(err));
    },
  });

  const submit = (event) => {
    event.preventDefault();
    setFormError(null);
    setDone(null);

    if (!form.currentPassword || !form.newPassword) {
      return setFormError('Both fields are required.');
    }
    if (form.newPassword.length < 8) {
      return setFormError('New password must be at least 8 characters.');
    }
    if (form.newPassword !== form.confirm) {
      return setFormError('New passwords do not match.');
    }
    mutation.mutate({ currentPassword: form.currentPassword, newPassword: form.newPassword });
  };

  return (
    <Box>
      <PageHeader title="Profile" subtitle="Your account details and password" />

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <Card>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: 28 }}>
                {(user?.name || 'A').charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="h6">{user?.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email}
                </Typography>
              </Box>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  ROLE
                </Typography>
                <Typography fontWeight={700} textTransform="capitalize">
                  {user?.role || '—'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  ACCOUNT
                </Typography>
                <Typography fontWeight={700} color={user?.isActive === false ? 'error.main' : 'success.main'}>
                  {user?.isActive === false ? 'Disabled' : 'Active'}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography fontWeight={700} gutterBottom>
              Change password
            </Typography>

            {formError ? (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>
                {formError}
              </Alert>
            ) : null}
            {done ? (
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setDone(null)}>
                {done}
              </Alert>
            ) : null}

            <Box component="form" onSubmit={submit}>
              <TextField
                label="Current password"
                type="password"
                fullWidth
                margin="dense"
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
              />
              <TextField
                label="New password"
                type="password"
                fullWidth
                margin="dense"
                autoComplete="new-password"
                value={form.newPassword}
                onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
              />
              <TextField
                label="Confirm new password"
                type="password"
                fullWidth
                margin="dense"
                autoComplete="new-password"
                value={form.confirm}
                onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
              />
              <Button
                type="submit"
                variant="contained"
                sx={{ mt: 2 }}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Saving…' : 'Update password'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
