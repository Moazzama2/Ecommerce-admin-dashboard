import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getOrder, updateStatus } from '../api/orders';
import StatusChip from '../components/StatusChip';
import { formatMoney } from '../components/StatCard';
import { DetailSkeleton, ErrorState } from '../components/StateViews';
import { errorMessage } from '../api/client';

const ALLOWED_TRANSITIONS = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

const FLOW = ['pending', 'processing', 'shipped', 'delivered'];

function AddressBlock({ title, address }) {
  if (!address) return null;
  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2">{address.fullName}</Typography>
      <Typography variant="body2" color="text.secondary">
        {address.address}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {address.city}, {address.zipCode}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {address.phone}
      </Typography>
    </Box>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [nextStatus, setNextStatus] = useState('');
  const [toast, setToast] = useState(null);

  const { data: order, isLoading, error, refetch } = useQuery({
    queryKey: ['orders', 'detail', id],
    queryFn: () => getOrder(id),
  });

  const mutation = useMutation({
    mutationFn: (status) => updateStatus(id, status),
    onSuccess: (_data, status) => {
      setToast({ severity: 'success', text: `Order is now ${status}` });
      setNextStatus('');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (err) => setToast({ severity: 'error', text: errorMessage(err) }),
  });

  if (isLoading) return <DetailSkeleton cards={2} />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!order) return null;

  const transitions = ALLOWED_TRANSITIONS[order.status] || [];
  const flowIndex = FLOW.indexOf(order.status);

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/orders')}>
          Orders
        </Button>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          Order #{order._id.slice(-8).toUpperCase()}
        </Typography>
        <StatusChip status={order.status} />
        <StatusChip status={order.paymentStatus} />
      </Stack>

      {/* Progress along the fulfilment flow (cancelled shows a warning) */}
      <Card sx={{ mb: 2.5 }}>
        <CardContent>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {FLOW.map((step, index) => (
              <Chip
                key={step}
                label={step}
                color={order.status === step ? 'primary' : index < flowIndex ? 'success' : 'default'}
                variant={index <= flowIndex ? 'filled' : 'outlined'}
              />
            ))}
            {order.status === 'cancelled' ? (
              <Chip label="cancelled" color="error" variant="filled" />
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' } }}>
        {/* Items */}
        <Card>
          <CardContent>
            <Typography fontWeight={700} gutterBottom>
              Items
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(order.items || []).map((item, index) => (
                    <TableRow key={`${item.productId}-${index}`}>
                      <TableCell>{item.productName || item.productId?.name || 'Product'}</TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">{formatMoney(item.price)}</TableCell>
                      <TableCell align="right">{formatMoney(item.itemSubtotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Divider sx={{ my: 2 }} />
            <Stack direction="row" justifyContent="space-between">
              <Typography fontWeight={700}>Total ({order.totalProducts} products)</Typography>
              <Typography fontWeight={700}>{formatMoney(order.totalAmount)}</Typography>
            </Stack>
          </CardContent>
        </Card>

        {/* Side panel: customer, addresses, status control */}
        <Stack spacing={2.5}>
          <Card>
            <CardContent>
              <Typography fontWeight={700} gutterBottom>
                Customer
              </Typography>
              <Typography variant="body2">{order.userId?.name || 'Unknown'}</Typography>
              <Typography variant="body2" color="text.secondary">
                {order.userId?.email}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'grid', gap: 2 }}>
                <AddressBlock title="Shipping address" address={order.shippingAddress} />
                <AddressBlock title="Billing address" address={order.billingAddress} />
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography fontWeight={700} gutterBottom>
                Update status
              </Typography>
              {transitions.length === 0 ? (
                <Alert severity="info" variant="outlined">
                  This order is {order.status} — no further transitions.
                </Alert>
              ) : (
                <>
                  <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                    <InputLabel id="next-status-label">New status</InputLabel>
                    <Select
                      labelId="next-status-label"
                      label="New status"
                      value={nextStatus}
                      onChange={(e) => setNextStatus(e.target.value)}
                    >
                      {transitions.map((s) => (
                        <MenuItem key={s} value={s}>
                          {s}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button
                    fullWidth
                    variant="contained"
                    disabled={!nextStatus || mutation.isPending}
                    onClick={() => mutation.mutate(nextStatus)}
                  >
                    {mutation.isPending ? 'Saving…' : 'Update status'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Box>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast?.severity || 'success'} variant="filled" onClose={() => setToast(null)}>
          {toast?.text}
        </Alert>
      </Snackbar>
    </Box>
  );
}
