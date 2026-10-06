import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Pagination,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { broadcast, listNotifications } from '../api/notifications';
import PageHeader from '../components/PageHeader';
import { errorMessage } from '../api/client';

export default function Notifications() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ title: '', body: '' });
  const [formError, setFormError] = useState(null);
  const [sent, setSent] = useState(null);

  const params = { page, limit: 15 };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['notifications', params],
    queryFn: () => listNotifications(params),
  });

  const mutation = useMutation({
    mutationFn: (payload) => broadcast(payload),
    onSuccess: (result) => {
      setForm({ title: '', body: '' });
      setFormError(null);
      setSent(`Sent to ${result.recipients} user${result.recipients === 1 ? '' : 's'}`);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err) => setFormError(errorMessage(err)),
  });

  const submit = (event) => {
    event.preventDefault();
    setFormError(null);
    if (form.title.trim().length < 3 || form.body.trim().length < 3) {
      setFormError('Title and message must be at least 3 characters.');
      return;
    }
    mutation.mutate({ title: form.title.trim(), body: form.body.trim() });
  };

  const rows = data?.notifications || [];

  return (
    <Box>
      <PageHeader
        title="Notifications"
        subtitle="Send announcements and audit what customers received"
      />

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: '380px 1fr' } }}>
        {/* Broadcast form */}
        <Card>
          <CardContent>
            <Typography fontWeight={700} gutterBottom>
              New announcement
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Delivered to every active account — in-app feed, live socket and push.
            </Typography>

            {formError ? (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>
                {formError}
              </Alert>
            ) : null}
            {sent ? (
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSent(null)}>
                {sent}
              </Alert>
            ) : null}

            <Box component="form" onSubmit={submit}>
              <TextField
                label="Title"
                fullWidth
                required
                margin="dense"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                inputProps={{ maxLength: 100 }}
              />
              <TextField
                label="Message"
                fullWidth
                required
                margin="dense"
                multiline
                minRows={4}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                inputProps={{ maxLength: 500 }}
                helperText={`${form.body.length}/500`}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                startIcon={<SendIcon />}
                sx={{ mt: 2 }}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Sending…' : 'Send to all users'}
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Log */}
        <Card>
          <CardContent>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1 }}
            >
              <Typography fontWeight={700}>Notification log</Typography>
              <Button size="small" onClick={() => refetch()} disabled={isLoading}>
                Refresh
              </Button>
            </Stack>

            {error ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorMessage(error)}
              </Alert>
            ) : null}

            <Divider sx={{ mb: 1 }} />

            {rows.length === 0 && !isLoading ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                No notifications sent yet.
              </Typography>
            ) : (
              <Stack divider={<Divider flexItem />} spacing={1}>
                {rows.map((n) => (
                  <Box key={n._id} sx={{ py: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <Chip
                        size="small"
                        label={n.type.replace('_', ' ')}
                        color={
                          n.type === 'announcement'
                            ? 'primary'
                            : n.type === 'payment'
                              ? 'success'
                              : 'default'
                        }
                        variant="outlined"
                      />
                      <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                        {n.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(n.createdAt).toLocaleString()}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {n.body}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      → {n.userId?.name || 'Unknown'} ({n.userId?.email || 'n/a'})
                      {n.read ? ' · read' : ' · unread'}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}

            {data?.pagination?.pages > 1 ? (
              <Stack alignItems="center" sx={{ mt: 2 }}>
                <Pagination
                  count={data.pagination.pages}
                  page={page}
                  onChange={(_e, value) => setPage(value)}
                  color="primary"
                />
              </Stack>
            ) : null}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
