import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { listOrders, updateStatus } from '../api/orders';
import { connectSocket } from '../api/socket';
import PageHeader from '../components/PageHeader';
import FilterBar from '../components/FilterBar';
import StatusChip from '../components/StatusChip';
import { formatMoney } from '../components/StatCard';
import { errorMessage } from '../api/client';

// Mirrors order.service.js — the server rejects anything else with 400.
const ALLOWED_TRANSITIONS = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function Orders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Deep-linkable filters: /orders?status=…&search=…&from=…&to=…
  // The overview tiles and the orders chart drill in here pre-filtered.
  const [searchParams, setSearchParams] = useSearchParams();

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 20 });
  const [status, setStatus] = useState(() => searchParams.get('status') || '');
  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') || '');
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [range, setRange] = useState(() => ({
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
  })); // placed-on window
  const [target, setTarget] = useState(null); // order being updated
  const [nextStatus, setNextStatus] = useState('');
  const [toast, setToast] = useState(null);

  const queryParams = {
    page: paginationModel.page + 1,
    limit: paginationModel.pageSize,
    ...(status ? { status } : {}),
    ...(search ? { search } : {}),
    ...(range.from ? { from: range.from } : {}),
    ...(range.to ? { to: range.to } : {}),
  };

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['orders', queryParams],
    queryFn: () => listOrders(queryParams),
  });

  // Live feed — a new order anywhere refreshes this table.
  useEffect(() => {
    const socket = connectSocket();
    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    socket.on('order:new', invalidate);
    socket.on('order:updated', invalidate);
    return () => {
      socket.off('order:new', invalidate);
      socket.off('order:updated', invalidate);
    };
  }, [queryClient]);

  const statusMutation = useMutation({
    mutationFn: ({ id, status: value }) => updateStatus(id, value),
    onSuccess: (_data, vars) => {
      setToast({ severity: 'success', text: `Order is now ${vars.status}` });
      setTarget(null);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (err) => setToast({ severity: 'error', text: errorMessage(err) }),
  });

  const rows = data?.orders || [];
  const columns = useMemo(
    () => [
      {
        field: 'code',
        headerName: 'Order',
        width: 120,
        renderCell: (params) => `#${params.row._id.slice(-8).toUpperCase()}`,
      },
      {
        field: 'customer',
        headerName: 'Customer',
        flex: 1,
        minWidth: 190,
        renderCell: (params) => (
          <Box sx={{ py: 1.5 }}>
            <Typography variant="body2" noWrap>
              {params.row.userId?.name || 'Unknown'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {params.row.userId?.email}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'totalProducts',
        headerName: 'Items',
        width: 80,
        align: 'right',
        headerAlign: 'right',
      },
      {
        field: 'totalAmount',
        headerName: 'Total',
        width: 140,
        renderCell: (params) => formatMoney(params.row.totalAmount),
      },
      {
        field: 'paymentStatus',
        headerName: 'Payment',
        width: 110,
        renderCell: (params) => <StatusChip status={params.row.paymentStatus} />,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        renderCell: (params) => <StatusChip status={params.row.status} />,
      },
      {
        field: 'createdAt',
        headerName: 'Placed',
        width: 150,
        valueFormatter: (value) => new Date(value).toLocaleDateString(),
      },
      {
        field: 'actions',
        headerName: '',
        width: 130,
        sortable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.5} sx={{ py: 1 }}>
            <Button
              size="small"
              startIcon={<VisibilityIcon />}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/orders/${params.row._id}`);
              }}
            >
              View
            </Button>
          </Stack>
        ),
      },
    ],
    [navigate],
  );

  const openUpdate = (order) => {
    setTarget(order);
    setNextStatus('');
  };

  // Every filter restarts at page 1 — the window the admin is looking at
  // changes completely, so page N of the old result set is meaningless.
  // Active filters are mirrored into the URL (replace, so typing a search
  // doesn't bury the Back button) to keep the view shareable and reload-safe.
  const applyFilters = (next) => {
    const params = {};
    Object.entries(next).forEach(([key, value]) => {
      if (value) params[key] = value;
    });
    setSearchParams(params, { replace: true });
  };

  const applySearch = () => {
    const value = searchInput.trim();
    setSearch(value);
    setPaginationModel((m) => ({ ...m, page: 0 }));
    applyFilters({ status, search: value, from: range.from, to: range.to });
  };

  const changeStatus = (event) => {
    const value = event.target.value;
    setStatus(value);
    setPaginationModel((m) => ({ ...m, page: 0 }));
    applyFilters({ status: value, search, from: range.from, to: range.to });
  };

  const setRangeField = (key) => (event) => {
    const value = event.target.value;
    setRange((current) => ({ ...current, [key]: value }));
    setPaginationModel((m) => ({ ...m, page: 0 }));
    applyFilters({
      status,
      search,
      from: key === 'from' ? value : range.from,
      to: key === 'to' ? value : range.to,
    });
  };

  const hasFilters = Boolean(status || search || range.from || range.to);
  const clearFilters = () => {
    setStatus('');
    setSearch('');
    setSearchInput('');
    setRange({ from: '', to: '' });
    setPaginationModel((m) => ({ ...m, page: 0 }));
    applyFilters({});
  };

  return (
    <Box>
      <PageHeader
        title="Orders"
        subtitle={
          hasFilters
            ? `${data?.pagination?.total ?? '—'} orders match the current filters`
            : 'Manage and fulfil customer orders'
        }
        action={
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
            disabled={isFetching}
          >
            Refresh
          </Button>
        }
      />

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(error)}</Alert> : null}

      {/* Filter bar — search, status and the placed-on window */}
      <FilterBar>
        <TextField
          size="small"
          placeholder="Search order id or customer…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          sx={{ minWidth: 240, flexGrow: 1, maxWidth: 340 }}
        />
        <Button variant="outlined" onClick={applySearch}>
          Search
        </Button>
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select
            labelId="status-filter-label"
            label="Status"
            value={status}
            onChange={changeStatus}
          >
            <MenuItem value="">All statuses</MenuItem>
            {STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          type="date"
          size="small"
          label="From"
          value={range.from}
          onChange={setRangeField('from')}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: 155 }}
        />
        <TextField
          type="date"
          size="small"
          label="To"
          value={range.to}
          onChange={setRangeField('to')}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: 155 }}
        />
        {hasFilters ? (
          <Button size="small" color="inherit" onClick={clearFilters}>
            Clear filters
          </Button>
        ) : null}
      </FilterBar>

      <Box
        sx={{
          height: 620,
          bgcolor: 'background.paper',
          border: '1px solid rgba(15,23,42,.08)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(row) => row._id}
          loading={isLoading || isFetching}
          paginationMode="server"
          rowCount={data?.pagination?.total ?? 0}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 20, 50]}
          disableRowSelectionOnClick
          onRowClick={(params) => navigate(`/orders/${params.id}`)}
          sx={{
            '& .MuiDataGrid-row:hover': { cursor: 'pointer' },
          }}
          localeText={{ noRowsLabel: 'No orders match this filter' }}
        />
      </Box>

      {/* Status update dialog */}
      <Dialog open={Boolean(target)} onClose={() => setTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Update order status</DialogTitle>
        <DialogContent>
          {target ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Order #{target._id.slice(-8).toUpperCase()} — currently{' '}
                <strong>{target.status}</strong>
              </Typography>
              <FormControl fullWidth>
                <InputLabel id="new-status-label">New status</InputLabel>
                <Select
                  labelId="new-status-label"
                  label="New status"
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value)}
                >
                  {(ALLOWED_TRANSITIONS[target.status] || []).map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {(ALLOWED_TRANSITIONS[target.status] || []).length === 0 ? (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  This order is closed — no further transitions are allowed.
                </Typography>
              ) : null}
            </>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!nextStatus || statusMutation.isPending}
            onClick={() => statusMutation.mutate({ id: target._id, status: nextStatus })}
          >
            {statusMutation.isPending ? 'Saving…' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

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
