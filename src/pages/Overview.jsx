import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  MenuItem,
  Skeleton,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory';
import TodayIcon from '@mui/icons-material/Today';
import { BarChart, LineChart } from '@mui/x-charts';
import { getOverview, MAX_CHART_RANGE } from '../api/stats';
import { connectSocket } from '../api/socket';
import StatCard, { formatMoney } from '../components/StatCard';
import StatusChip from '../components/StatusChip';
import PageHeader from '../components/PageHeader';
import { ErrorState } from '../components/StateViews';

const shortDate = (iso) => iso.slice(5); // '2026-10-06' → '10-06'

// Range dropdown on each chart. The API caps the window at 90 days.
const RANGES = [
  { days: 7, label: 'Last 7 days' },
  { days: 10, label: 'Last 10 days' },
  { days: 30, label: 'Last 1 month' },
  { days: 90, label: 'Last 3 months' },
];

// Keep axis labels legible: show ~`max` of them however long the window is.
const tickEvery = (count, max = 10) => {
  const step = Math.max(1, Math.ceil(count / max));
  return (_value, index) => index % step === 0;
};

// MUI colour slot for each order status, for the status progress bars.
const STATUS_TONE = {
  pending: 'warning',
  processing: 'info',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'error',
};

// Podium tint for the top three best sellers.
const RANK_TINT = [
  { bg: 'rgba(234,154,21,.16)', color: '#b45309' },
  { bg: 'rgba(100,116,139,.16)', color: '#475569' },
  { bg: 'rgba(194,110,58,.16)', color: '#9a3412' },
];

/** Range picker shown in each chart's header. */
function RangeSelect({ value, onChange }) {
  return (
    <TextField
      select
      size="small"
      label="Range"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      sx={{ width: 165 }}
    >
      {RANGES.map((range) => (
        <MenuItem key={range.days} value={range.days}>
          {range.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

/** Placeholder layout shown while the first stats fetch resolves. */
function OverviewSkeleton() {
  const tile = (
    <Card sx={{ p: 2.5, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
      <Skeleton variant="rounded" width={46} height={46} />
      <Box sx={{ flexGrow: 1 }}>
        <Skeleton width="55%" height={14} />
        <Skeleton width="75%" height={28} />
        <Skeleton width="40%" height={12} />
      </Box>
    </Card>
  );

  return (
    <Box>
      <PageHeader title="Overview" subtitle="Store performance at a glance" />
      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          mb: 3,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' },
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Box key={i}>{tile}</Box>
        ))}
      </Box>
      <Box sx={{ display: 'grid', gap: 2.5, mb: 3, gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' } }}>
        <Card sx={{ p: 3 }}>
          <Skeleton width="30%" height={22} />
          <Skeleton variant="rounded" height={260} sx={{ mt: 1 }} />
        </Card>
        <Card sx={{ p: 3 }}>
          <Skeleton width="30%" height={22} />
          <Skeleton variant="rounded" height={260} sx={{ mt: 1 }} />
        </Card>
      </Box>
      <Card sx={{ p: 3 }}>
        <Skeleton width="30%" height={22} />
        <Skeleton height={40} />
        <Skeleton height={40} />
        <Skeleton height={40} />
      </Card>
    </Box>
  );
}

/** Card with a title, optional caption and an action slot in the header. */
function SectionCard({ title, caption, action, children }) {
  return (
    <Card>
      <CardContent sx={{ '&:last-child': { pb: 2.5 } }}>
        <Stack
          direction="row"
          alignItems={caption ? 'flex-start' : 'center'}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 1.5, flexWrap: 'wrap', rowGap: 1 }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" lineHeight={1.3}>
              {title}
            </Typography>
            {caption ? (
              <Typography variant="caption" color="text.secondary">
                {caption}
              </Typography>
            ) : null}
          </Box>
          {action}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

export default function Overview() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['stats', 'overview'],
    // Widest window; the two chart dropdowns slice it client-side.
    queryFn: () => getOverview(MAX_CHART_RANGE),
  });

  // ---------------------------------------------------------------
  // Live feed: new/updated orders arrive over the shared socket the
  // layout opened; each event refreshes the stats behind this screen.
  // ---------------------------------------------------------------
  const [liveEvent, setLiveEvent] = useState(null);

  // Per-chart window, so revenue and orders can be read side by side
  // at different granularities.
  const [revenueRange, setRevenueRange] = useState(7);
  const [ordersRange, setOrdersRange] = useState(30);

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

  if (isLoading) return <OverviewSkeleton />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!data) return null;

  const { totals, charts, orderStatusCounts, recentOrders, topProducts } = data;
  const revenueSeries = charts.revenue.slice(-revenueRange);
  const revenueDates = revenueSeries.map((p) => shortDate(p.date));
  const ordersSeries = charts.orders.slice(-ordersRange);
  const orderDates = ordersSeries.map((p) => shortDate(p.date));

  return (
    <Box>
      <PageHeader
        title="Overview"
        subtitle="Store performance at a glance"
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              size="small"
              label="Live"
              sx={{
                bgcolor: 'rgba(22,163,74,.12)',
                color: 'success.dark',
                '&::before': {
                  content: '""',
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  bgcolor: 'success.main',
                  ml: 1,
                  mr: -0.25,
                  animation: 'softPulse 1.8s ease-in-out infinite',
                },
              }}
            />
            <Chip
              label={`Today: ${formatMoney(totals.revenueToday)}`}
              sx={{ bgcolor: 'rgba(37,99,235,.1)', color: 'primary.dark' }}
            />
          </Stack>
        }
      />

      {/* KPI tiles */}
      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          mb: 3,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' },
          animation: 'fadeUp .35s ease both',
        }}
      >
        <StatCard
          icon={<AttachMoneyIcon />}
          label="Total revenue"
          value={formatMoney(totals.revenue)}
          subheader={`This month: ${formatMoney(totals.revenueMonth)}`}
          color="#2563eb"
          hint="View orders"
          onClick={() => navigate('/orders')}
        />
        <StatCard
          icon={<ShoppingCartIcon />}
          label="Orders"
          value={totals.orders}
          subheader="All time"
          color="#7c3aed"
          hint="View orders"
          onClick={() => navigate('/orders')}
        />
        <StatCard
          icon={<PeopleIcon />}
          label="Customers"
          value={totals.customers}
          subheader="Registered users"
          color="#0d9488"
          hint="View customers"
          onClick={() => navigate('/customers')}
        />
        <StatCard
          icon={<InventoryIcon />}
          label="Products"
          value={totals.products}
          subheader="In catalogue"
          color="#f59e0b"
          hint="View products"
          onClick={() => navigate('/products')}
        />
        <StatCard
          icon={<TodayIcon />}
          label="Revenue today"
          value={formatMoney(totals.revenueToday)}
          subheader="Midnight → now"
          color="#16a34a"
          hint="Open today"
          onClick={() => {
            // The series' last point is the server's current day — reusing
            // it keeps the drill-down on exactly the day this figure counts.
            const today = charts.revenue.at(-1)?.date;
            navigate(today ? `/orders?from=${today}&to=${today}` : '/orders');
          }}
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
        <SectionCard
          title="Revenue"
          caption={`Daily takings · last ${revenueRange} days`}
          action={<RangeSelect value={revenueRange} onChange={setRevenueRange} />}
        >
          <LineChart
            height={260}
            xAxis={[
              {
                data: revenueDates,
                scaleType: 'point',
                tickLabelStyle: { fontSize: 11 },
                tickInterval: tickEvery(revenueSeries.length),
              },
            ]}
            series={[
              {
                data: revenueSeries.map((p) => p.value),
                label: 'Revenue',
                area: true,
                showMark: false,
                valueFormatter: (v) => formatMoney(v),
              },
            ]}
            grid={{ horizontal: true }}
            margin={{ left: 70, right: 16, top: 12, bottom: 28 }}
          />
        </SectionCard>
        <SectionCard
          title="Orders"
          caption={`Orders placed · last ${ordersRange} days`}
          action={<RangeSelect value={ordersRange} onChange={setOrdersRange} />}
        >
          <BarChart
            height={260}
            xAxis={[
              {
                data: orderDates,
                scaleType: 'band',
                tickLabelStyle: { fontSize: 10, angle: -45 },
                tickInterval: tickEvery(ordersSeries.length, 8),
              },
            ]}
            series={[{ data: ordersSeries.map((p) => p.value), label: 'Orders' }]}
            // Clicking a bar opens that day's orders.
            onItemClick={(_event, item) => {
              const point = ordersSeries[item.dataIndex];
              if (point?.date) navigate(`/orders?from=${point.date}&to=${point.date}`);
            }}
            margin={{ left: 40, right: 16, top: 12, bottom: 46 }}
          />
        </SectionCard>
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
        <SectionCard
          title="Orders by status"
          caption={`${totals.orders} orders in total`}
        >
          <Stack spacing={1.75}>
            {orderStatusCounts.map(({ status, count }) => {
              const share = totals.orders ? Math.round((count / totals.orders) * 100) : 0;
              return (
                <Box key={status}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
                    <StatusChip status={status} />
                    <Typography variant="body2" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {count}
                      <Box
                        component="span"
                        sx={{ color: 'text.secondary', fontWeight: 500, fontSize: 12, ml: 0.75 }}
                      >
                        {share}%
                      </Box>
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={Math.max(share, count > 0 ? 2 : 0)}
                    color={STATUS_TONE[status] || 'primary'}
                  />
                </Box>
              );
            })}
          </Stack>
        </SectionCard>
        <SectionCard title="Best sellers" caption="Ranked by units sold">
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
                {topProducts.map((p, index) => (
                  <TableRow key={p._id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: 1,
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 12,
                            fontWeight: 700,
                            flexShrink: 0,
                            bgcolor: RANK_TINT[index]?.bg || 'rgba(100,116,139,.1)',
                            color: RANK_TINT[index]?.color || 'text.secondary',
                          }}
                        >
                          {index + 1}
                        </Box>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {p.name || '—'}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">{p.quantity}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(p.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </SectionCard>
      </Box>

      {/* Recent orders */}
      <SectionCard
        title="Recent orders"
        caption="Click a row to open the full order"
        action={
          <Button size="small" variant="outlined" onClick={() => navigate('/orders')}>
            View all
          </Button>
        }
      >
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
                  <TableCell>
                    <Typography variant="body2" fontWeight={700} sx={{ letterSpacing: '.03em' }}>
                      #{order._id.slice(-8).toUpperCase()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar
                        sx={{
                          width: 28,
                          height: 28,
                          fontSize: 13,
                          bgcolor: 'rgba(37,99,235,.12)',
                          color: 'primary.dark',
                        }}
                      >
                        {(order.userId?.name || '?').charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {order.userId?.name || 'Unknown'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {order.userId?.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{order.totalProducts}</TableCell>
                  <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    <Typography variant="body2" fontWeight={700}>
                      {formatMoney(order.totalAmount)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={order.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>

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
