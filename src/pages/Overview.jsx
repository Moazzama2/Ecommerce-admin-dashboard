import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory';
import TodayIcon from '@mui/icons-material/Today';
import { BarChart, LineChart } from '@mui/x-charts';
import { getOverview } from '../api/stats';
import { connectSocket } from '../api/socket';
import StatCard, { formatMoney } from '../components/StatCard';
import StatusChip from '../components/StatusChip';
import PageHeader from '../components/PageHeader';
import { ErrorState } from '../components/StateViews';

const shortDate = (iso) => iso.slice(5); // '2026-10-06' → '10-06'

export default function Overview() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['stats', 'overview'],
    queryFn: () => getOverview(30),
  });

  // ---------------------------------------------------------------
  // Live feed: new/updated orders arrive over the shared socket the
  // layout opened; each event refreshes the stats behind this screen.
  // ---------------------------------------------------------------
  const [liveEvent, setLiveEvent] = useState(null);

  useEffect(() => {
    const socket = connectSocket();

    const onNewOrder = (order) => {
      setLiveEvent({ kind: 'new', text: `New order — ${formatMoney(order.totalAmount)}` });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    };
    const onUpdatedOrder = (order) => {
      setLiveEvent({ kind: 'update', text: `Order updated — now ${order.status}` });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    };

    socket.on('order:new', onNewOrder);
    socket.on('order:updated', onUpdatedOrder);
    return () => {
      socket.off('order:new', onNewOrder);
      socket.off('order:updated', onUpdatedOrder);
    };
  }, [queryClient]);

  if (isLoading) return <Typography color="text.secondary">Loading dashboard…</Typography>;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!data) return null;

  const { totals, charts, orderStatusCounts, recentOrders, topProducts } = data;
  const weekRevenue = charts.revenue.slice(-7);
  const revenueDates = weekRevenue.map((p) => shortDate(p.date));
  const monthOrders = charts.orders;
  const orderDates = monthOrders.map((p) => shortDate(p.date));

  return (
    <Box>
      <PageHeader
        title="Overview"
        subtitle="Store performance at a glance"
        action={
          <Chip
            label={`Today: ${formatMoney(totals.revenueToday)}`}
            color="success"
            variant="outlined"
          />
        }
      />

      {/* KPI tiles */}
      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          mb: 3,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' },
        }}
      >
        <StatCard
          icon={<AttachMoneyIcon />}
          label="Total revenue"
          value={formatMoney(totals.revenue)}
          subheader={`This month: ${formatMoney(totals.revenueMonth)}`}
          color="#1976d2"
        />
        <StatCard
          icon={<ShoppingCartIcon />}
          label="Orders"
          value={totals.orders}
          subheader="All time"
          color="#7b1fa2"
        />
        <StatCard
          icon={<PeopleIcon />}
          label="Customers"
          value={totals.customers}
          subheader="Registered users"
          color="#00897b"
        />
        <StatCard
          icon={<InventoryIcon />}
          label="Products"
          value={totals.products}
          subheader="In catalogue"
          color="#ed6c02"
        />
        <StatCard
          icon={<TodayIcon />}
          label="Revenue today"
          value={formatMoney(totals.revenueToday)}
          subheader="Midnight → now"
          color="#2e7d32"
        />
      </Box>

      {/* Charts */}
      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          mb: 3,
          gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' },
        }}
      >
        <Card>
          <CardContent>
            <Typography fontWeight={700} gutterBottom>
              Revenue — last 7 days
            </Typography>
            <LineChart
              height={260}
              xAxis={[{ data: revenueDates, scaleType: 'point', tickLabelStyle: { fontSize: 11 } }]}
              series={[
                {
                  data: weekRevenue.map((p) => p.value),
                  label: 'Revenue',
                  area: true,
                  showMark: false,
                  valueFormatter: (v) => formatMoney(v),
                },
              ]}
              grid={{ horizontal: true }}
              margin={{ left: 70, right: 16, top: 12, bottom: 28 }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography fontWeight={700} gutterBottom>
              Orders — last 30 days
            </Typography>
            <BarChart
              height={260}
              xAxis={[
                {
                  data: orderDates,
                  scaleType: 'band',
                  tickLabelStyle: { fontSize: 10, angle: -45 },
                },
              ]}
              series={[{ data: monthOrders.map((p) => p.value), label: 'Orders' }]}
              margin={{ left: 40, right: 16, top: 12, bottom: 46 }}
            />
          </CardContent>
        </Card>
      </Box>

      {/* Status breakdown + best sellers */}
      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          mb: 3,
          gridTemplateColumns: { xs: '1fr', md: '5fr 7fr' },
        }}
      >
        <Card>
          <CardContent>
            <Typography fontWeight={700} gutterBottom>
              Orders by status
            </Typography>
            <List disablePadding>
              {orderStatusCounts.map(({ status, count }) => (
                <ListItem
                  key={status}
                  divider
                  secondaryAction={<Chip size="small" label={count} color="default" />}
                >
                  <ListItemText primary={<StatusChip status={status} />} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography fontWeight={700} gutterBottom>
              Best sellers
            </Typography>
            {topProducts.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No sales yet.
              </Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="right">Sold</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topProducts.map((p) => (
                    <TableRow key={p._id} hover>
                      <TableCell>{p.name || '—'}</TableCell>
                      <TableCell align="right">{p.quantity}</TableCell>
                      <TableCell align="right">{formatMoney(p.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Recent orders */}
      <Card>
        <CardContent>
          <Typography fontWeight={700} gutterBottom>
            Recent orders
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Order</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Items</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow
                    key={order._id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/orders/${order._id}`)}
                  >
                    <TableCell>#{order._id.slice(-8).toUpperCase()}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 26, height: 26 }}>
                          {(order.userId?.name || '?').charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" noWrap>
                            {order.userId?.name || 'Unknown'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {order.userId?.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{order.totalProducts}</TableCell>
                    <TableCell>{formatMoney(order.totalAmount)}</TableCell>
                    <TableCell>
                      <StatusChip status={order.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Live feed toast */}
      <Snackbar
        open={Boolean(liveEvent)}
        autoHideDuration={4000}
        onClose={() => setLiveEvent(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={liveEvent?.kind === 'new' ? 'success' : 'info'}
          variant="filled"
          onClose={() => setLiveEvent(null)}
        >
          {liveEvent?.text}
        </Alert>
      </Snackbar>
    </Box>
  );
}
