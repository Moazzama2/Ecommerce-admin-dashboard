import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
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
import { getUser } from '../api/users';
import { listOrders } from '../api/orders';
import StatusChip from '../components/StatusChip';
import StatCard, { formatMoney } from '../components/StatCard';
import { DetailSkeleton, ErrorState, RowsSkeleton } from '../components/StateViews';
import PersonIcon from '@mui/icons-material/Person';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PendingIcon from '@mui/icons-material/Pending';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

// Still being fulfilled — shown in the "current" table.
const CURRENT_STATUSES = ['pending', 'processing', 'shipped'];

const isCurrentOrder = (order) => CURRENT_STATUSES.includes(order.status);

const shortDate = (value) => (value ? new Date(value).toLocaleDateString() : '—');

/** Orders table used by both the "current" and the "past" card. */
function OrdersTable({ orders, isLoading, emptyText, onOpen }) {
  if (isLoading) {
    return (
      <Box sx={{ py: 1.5 }}>
        <RowsSkeleton rows={2} height={44} />
      </Box>
    );
  }

  if (orders.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        {emptyText}
      </Typography>
    );
  }

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Order</TableCell>
            <TableCell>Placed</TableCell>
            <TableCell align="right">Items</TableCell>
            <TableCell align="right">Total</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.map((order) => (
            <TableRow
              key={order._id}
              hover
              sx={{ cursor: 'pointer' }}
              onClick={() => onOpen(order._id)}
            >
              <TableCell>#{order._id.slice(-8).toUpperCase()}</TableCell>
              <TableCell>{shortDate(order.createdAt)}</TableCell>
              <TableCell align="right">{order.totalProducts}</TableCell>
              <TableCell align="right">{formatMoney(order.totalAmount)}</TableCell>
              <TableCell>
                <StatusChip status={order.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const userQuery = useQuery({
    queryKey: ['users', 'detail', id],
    queryFn: () => getUser(id),
  });

  // One page of this customer's orders — enough to split into current/past
  // and to total up what they have spent.
  const ordersQuery = useQuery({
    queryKey: ['orders', 'customer', id],
    queryFn: () => listOrders({ userId: id, limit: 100 }),
  });

  if (userQuery.isLoading) {
    return <DetailSkeleton cards={2} />;
  }
  if (userQuery.error) {
    return <ErrorState error={userQuery.error} onRetry={userQuery.refetch} />;
  }
  if (!userQuery.data) return null;

  const user = userQuery.data;
  const orders = ordersQuery.data?.orders || [];
  // Server-side total; the tables below only render the first page we ask for.
  const totalOrders = ordersQuery.data?.pagination?.total ?? orders.length;
  const truncated = totalOrders > orders.length;
  const currentOrders = orders.filter(isCurrentOrder);
  const pastOrders = orders.filter((order) => !isCurrentOrder(order));
  // Cancelled orders never count towards what the customer paid.
  const totalSpent = orders
    .filter((order) => order.status !== 'cancelled')
    .reduce((sum, order) => sum + (order.totalAmount || 0), 0);

  const active = user.isActive !== false;

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/customers')}>
          Customers
        </Button>
        <Typography variant="h5" sx={{ flexGrow: 1, minWidth: 200 }}>
          {user.name}
        </Typography>
        <Chip
          label={user.role === 'admin' ? 'admin' : 'user'}
          color={user.role === 'admin' ? 'primary' : 'default'}
          variant="outlined"
        />
        <Chip label={active ? 'active' : 'disabled'} color={active ? 'success' : 'error'} />
      </Stack>

      {ordersQuery.error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          Could not load this customer's orders.
        </Alert>
      ) : null}

      {/* Profile */}
      <Card sx={{ mb: 2.5 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
              {(user.name || '?').charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={700}>{user.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1 }} />
            <Box>
              <Typography variant="caption" color="text.secondary">
                Joined
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {shortDate(user.createdAt)}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* KPI tiles */}
      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          mb: 3,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
        }}
      >
        <StatCard
          icon={<ReceiptIcon />}
          label="Total orders"
          value={totalOrders}
          subheader={truncated ? 'Latest 100 listed below' : 'All time'}
          color="#7b1fa2"
        />
        <StatCard
          icon={<PendingIcon />}
          label="Current orders"
          value={currentOrders.length}
          subheader="Pending, processing, shipped"
          color="#ed6c02"
        />
        <StatCard
          icon={<AttachMoneyIcon />}
          label="Total spent"
          value={formatMoney(totalSpent)}
          subheader={truncated ? 'Cancelled excluded · latest 100' : 'Cancelled orders excluded'}
          color="#1976d2"
        />
        <StatCard
          icon={<PersonIcon />}
          label="Status"
          value={active ? 'Active' : 'Disabled'}
          subheader={user.role === 'admin' ? 'Administrator account' : 'Customer account'}
          color={active ? '#2e7d32' : '#d32f2f'}
        />
      </Box>

      {/* Orders, split by whether they are still in flight */}
      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        }}
      >
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography fontWeight={700}>Current orders</Typography>
              <Chip size="small" label={currentOrders.length} color="warning" variant="outlined" />
            </Stack>
            <Divider sx={{ mb: 1 }} />
            <OrdersTable
              orders={currentOrders}
              isLoading={ordersQuery.isLoading}
              emptyText="No orders in progress."
              onOpen={(orderId) => navigate(`/orders/${orderId}`)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography fontWeight={700}>Past orders</Typography>
              <Chip size="small" label={pastOrders.length} variant="outlined" />
            </Stack>
            <Divider sx={{ mb: 1 }} />
            <OrdersTable
              orders={pastOrders}
              isLoading={ordersQuery.isLoading}
              emptyText="No completed or cancelled orders yet."
              onOpen={(orderId) => navigate(`/orders/${orderId}`)}
            />
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
