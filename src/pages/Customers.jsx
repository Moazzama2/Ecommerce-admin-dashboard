import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { listUsers, setRole, setStatus } from '../api/users';
import { useAuthStore } from '../store/auth';
import ConfirmDialog from '../components/ConfirmDialog';
import FilterBar from '../components/FilterBar';
import PageHeader from '../components/PageHeader';
import { errorMessage } from '../api/client';

export default function Customers() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = useAuthStore((s) => s.user);

  // Deep-linkable filters: /customers?search=…&from=…&to=…
  // The overview "Customers" tile lands here, and date windows can be shared.
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 20 });
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') || '');
  const [range, setRange] = useState(() => ({
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
  })); // joined-date window
  const [confirm, setConfirm] = useState(null); // { user, kind: 'ban' | 'role' }
  const [toast, setToast] = useState(null);

  const params = {
    page: paginationModel.page + 1,
    limit: paginationModel.pageSize,
    ...(search ? { search } : {}),
    ...(range.from ? { from: range.from } : {}),
    ...(range.to ? { to: range.to } : {}),
  };

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['users', params],
    queryFn: () => listUsers(params),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const handleError = (err) => setToast({ severity: 'error', text: errorMessage(err) });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }) => setRole(id, role),
    onSuccess: (_d, vars) => {
      setConfirm(null);
      invalidate();
      setToast({
        severity: 'success',
        text: vars.role === 'admin' ? 'User promoted to admin' : 'Admin role removed',
      });
    },
    onError: handleError,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }) => setStatus(id, isActive),
    onSuccess: (_d, vars) => {
      setConfirm(null);
      invalidate();
      setToast({
        severity: 'success',
        text: vars.isActive ? 'Account enabled' : 'Account disabled',
      });
    },
    onError: handleError,
  });

  const columns = [
    {
      field: 'name',
      headerName: 'Customer',
      flex: 1,
      minWidth: 220,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, minWidth: 0 }}>
          <Avatar sx={{ width: 32, height: 32 }}>
            {(params.row.name || '?').charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap fontWeight={600}>
              {params.row.name}
              {params.row.id === currentUser?.id ? (
                <Typography component="span" variant="caption" color="text.secondary">
                  {' '}(you)
                </Typography>
              ) : null}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {params.row.email}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'role',
      headerName: 'Role',
      width: 130,
      renderCell: (params) =>
        params.row.role === 'admin' ? (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <AdminPanelSettingsIcon fontSize="small" color="primary" />
            <Typography variant="body2">admin</Typography>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            user
          </Typography>
        ),
    },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Typography
          variant="body2"
          color={params.row.isActive === false ? 'error.main' : 'success.main'}
          fontWeight={600}
        >
          {params.row.isActive === false ? 'disabled' : 'active'}
        </Typography>
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Joined',
      width: 140,
      valueFormatter: (value) => (value ? new Date(value).toLocaleDateString() : '—'),
    },
    {
      field: 'actions',
      headerName: '',
      width: 350,
      sortable: false,
      renderCell: (params) => {
        const isSelf = params.row.id === currentUser?.id;
        return (
          <Stack direction="row" spacing={1} sx={{ py: 1.5 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<VisibilityIcon />}
              onClick={() => navigate(`/customers/${params.row.id}`)}
            >
              View
            </Button>
            <Button
              size="small"
              variant="outlined"
              disabled={isSelf}
              onClick={() => setConfirm({ user: params.row, kind: 'role' })}
            >
              {params.row.role === 'admin' ? 'Demote' : 'Make admin'}
            </Button>
            <Button
              size="small"
              variant="outlined"
              color={params.row.isActive === false ? 'success' : 'error'}
              disabled={isSelf}
              startIcon={
                params.row.isActive === false ? <PersonIcon /> : <PersonOffIcon fontSize="small" />
              }
              onClick={() => setConfirm({ user: params.row, kind: 'ban' })}
            >
              {params.row.isActive === false ? 'Enable' : 'Disable'}
            </Button>
          </Stack>
        );
      },
    },
  ];

  // Active filters are mirrored into the URL (replace) so a date window
  // can be reloaded or shared without losing it.
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
    applyFilters({ search: value, from: range.from, to: range.to });
  };

  // Date filters apply as soon as a day is picked; always restart at page 1.
  const setRangeField = (key) => (event) => {
    const value = event.target.value;
    setRange((current) => ({ ...current, [key]: value }));
    setPaginationModel((m) => ({ ...m, page: 0 }));
    applyFilters({
      search,
      from: key === 'from' ? value : range.from,
      to: key === 'to' ? value : range.to,
    });
  };

  const hasFilters = Boolean(search || range.from || range.to);
  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setRange({ from: '', to: '' });
    setPaginationModel((m) => ({ ...m, page: 0 }));
    applyFilters({});
  };

  const runConfirmed = () => {
    if (!confirm) return;
    if (confirm.kind === 'ban') {
      statusMutation.mutate({
        id: confirm.user.id,
        isActive: confirm.user.isActive === false,
      });
    } else {
      roleMutation.mutate({
        id: confirm.user.id,
        role: confirm.user.role === 'admin' ? 'user' : 'admin',
      });
    }
  };

  // Safe accessors: these render on every pass, including before any
  // row has been selected (confirm === null).
  const confirmTitle = !confirm
    ? ''
    : confirm.kind === 'ban'
      ? confirm.user.isActive === false
        ? 'Enable account?'
        : 'Disable account?'
      : confirm.user.role === 'admin'
        ? 'Remove admin role?'
        : 'Grant admin role?';

  const confirmMessage = !confirm
    ? ''
    : confirm.kind === 'ban'
      ? confirm.user.isActive === false
        ? `${confirm.user.email} will be able to sign in again.`
        : `${confirm.user.email} will be signed out and blocked from logging in.`
      : confirm.user.role === 'admin'
        ? `${confirm.user.email} will lose access to this admin dashboard.`
        : `${confirm.user.email} will get full access to the admin dashboard.`;

  return (
    <Box>
      <PageHeader
        title="Customers"
        subtitle={
          range.from || range.to
            ? `${data?.pagination?.total ?? '—'} customers joined ${range.from || '…'} → ${
                range.to || 'today'
              }`
            : 'Everyone who has registered an account'
        }
      />

      <FilterBar>
        <TextField
          size="small"
          placeholder="Search name or email…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applySearch()}
        />
        <Button variant="outlined" onClick={applySearch}>
          Search
        </Button>
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
            Clear
          </Button>
        ) : null}
      </FilterBar>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage(error)}
        </Alert>
      ) : null}

      <Box
        sx={{
          height: 600,
          bgcolor: 'background.paper',
          border: '1px solid rgba(15,23,42,.08)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        <DataGrid
          rows={data?.users || []}
          columns={columns}
          getRowId={(row) => row.id}
          loading={isLoading || isFetching}
          paginationMode="server"
          rowCount={data?.pagination?.total ?? 0}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 20, 50]}
          disableRowSelectionOnClick
          localeText={{ noRowsLabel: 'No customers found' }}
        />
      </Box>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel="Confirm"
        loading={roleMutation.isPending || statusMutation.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirmed}
      />

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
