import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import { createProduct, deleteProduct, listProducts, updateProduct } from '../api/products';
import { listCategories } from '../api/categories';
import ConfirmDialog from '../components/ConfirmDialog';
import PageHeader from '../components/PageHeader';
import { errorMessage } from '../api/client';

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  category: '',
  stock: '',
  images: [],
};

export default function Products() {
  const queryClient = useQueryClient();

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 20 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // product being edited
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const params = {
    page: paginationModel.page + 1,
    limit: paginationModel.pageSize,
    ...(search ? { search } : {}),
  };

  const productsQuery = useQuery({
    queryKey: ['products', params],
    queryFn: () => listProducts(params),
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
    staleTime: 5 * 60 * 1000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['products'] });

  const saveMutation = useMutation({
    mutationFn: (payload) => (editing ? updateProduct(payload) : createProduct(payload)),
    onSuccess: () => {
      setFormOpen(false);
      setEditing(null);
      invalidate();
    },
    onError: (err) => setFormError(errorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteProduct(id),
    onSuccess: () => {
      setDeleting(null);
      invalidate();
    },
    onError: (err) => setFormError(errorMessage(err)),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price ?? '',
      category: product.category?._id || product.category || '',
      stock: product.stock ?? '',
      images: product.images || [],
    });
    setFormError(null);
    setFormOpen(true);
  };

  const submit = (event) => {
    event.preventDefault();
    setFormError(null);

    if (!form.name.trim() || form.description.trim().length < 10 || !form.category) {
      setFormError('Name, category and a description of at least 10 characters are required.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      category: form.category,
      stock: Number(form.stock) || 0,
      images: form.images.filter((url) => url.trim()),
    };

    saveMutation.mutate(editing ? { _id: editing._id, ...payload } : payload);
  };

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const setImage = (index) => (e) =>
    setForm((f) => {
      const images = [...f.images];
      images[index] = e.target.value;
      return { ...f, images };
    });

  const columns = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Product',
        flex: 1,
        minWidth: 220,
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, minWidth: 0 }}>
            <Box
              component="img"
              src={params.row.images?.[0]}
              alt=""
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1,
                objectFit: 'cover',
                bgcolor: 'grey.100',
                display: params.row.images?.[0] ? 'block' : 'none',
              }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap fontWeight={600}>
                {params.row.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {params.row.category?.name || 'No category'}
              </Typography>
            </Box>
          </Box>
        ),
      },
      {
        field: 'price',
        headerName: 'Price',
        width: 120,
        renderCell: (params) => `PKR ${Number(params.row.price).toLocaleString()}`,
      },
      {
        field: 'stock',
        headerName: 'Stock',
        width: 100,
        align: 'right',
        headerAlign: 'right',
        renderCell: (params) => (
          <Typography
            variant="body2"
            color={params.row.stock > 0 ? 'text.primary' : 'error.main'}
            fontWeight={600}
          >
            {params.row.stock}
          </Typography>
        ),
      },
      {
        field: 'createdAt',
        headerName: 'Created',
        width: 140,
        valueFormatter: (value) => new Date(value).toLocaleDateString(),
      },
      {
        field: 'actions',
        headerName: '',
        width: 110,
        sortable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.5} sx={{ py: 1 }}>
            <IconButton size="small" onClick={() => openEdit(params.row)} aria-label="Edit">
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={() => setDeleting(params.row)}
              aria-label="Delete"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ),
      },
    ],
    // openEdit reads live state, so the columns are rebuilt each render on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const applySearch = () => {
    setSearch(searchInput.trim());
    setPaginationModel((m) => ({ ...m, page: 0 }));
  };

  const data = productsQuery.data;

  return (
    <Box>
      <PageHeader
        title="Products"
        subtitle="Catalogue, pricing and stock"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            New product
          </Button>
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search name or description…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          sx={{ maxWidth: { sm: 360 }, flexGrow: { sm: 1 } }}
        />
        <Button variant="outlined" onClick={applySearch}>
          Search
        </Button>
        {search ? (
          <Button
            onClick={() => {
              setSearch('');
              setSearchInput('');
              setPaginationModel((m) => ({ ...m, page: 0 }));
            }}
          >
            Clear
          </Button>
        ) : null}
      </Stack>

      {productsQuery.error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage(productsQuery.error)}
        </Alert>
      ) : null}

      <Box sx={{ height: 600, bgcolor: 'background.paper' }}>
        <DataGrid
          rows={data?.products || []}
          columns={columns}
          getRowId={(row) => row._id}
          loading={productsQuery.isLoading || productsQuery.isFetching}
          paginationMode="server"
          rowCount={data?.pagination?.total ?? 0}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 20, 50]}
          disableRowSelectionOnClick
          localeText={{ noRowsLabel: 'No products found' }}
        />
      </Box>

      {/* Create / edit dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={submit}>
          <DialogTitle fontWeight={700}>
            {editing ? 'Edit product' : 'New product'}
            <IconButton
              onClick={() => setFormOpen(false)}
              sx={{ position: 'absolute', right: 12, top: 12 }}
              aria-label="Close"
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {formError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            ) : null}

            <Stack spacing={2} sx={{ pt: 0.5 }}>
              <TextField
                label="Name"
                fullWidth
                required
                value={form.name}
                onChange={setField('name')}
              />
              <TextField
                label="Description"
                fullWidth
                required
                multiline
                minRows={3}
                value={form.description}
                onChange={setField('description')}
                helperText={`${form.description.trim().length}/10 characters minimum`}
                error={form.description.length > 0 && form.description.trim().length < 10}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Price"
                  type="number"
                  fullWidth
                  required
                  inputProps={{ min: 0, step: '0.01' }}
                  value={form.price}
                  onChange={setField('price')}
                />
                <TextField
                  label="Stock"
                  type="number"
                  fullWidth
                  required
                  inputProps={{ min: 0 }}
                  value={form.stock}
                  onChange={setField('stock')}
                />
              </Stack>
              <TextField
                select
                label="Category"
                fullWidth
                required
                value={form.category}
                onChange={setField('category')}
              >
                {(categoriesQuery.data || []).map((c) => (
                  <MenuItem key={c._id} value={c._id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Image URLs
                </Typography>
                <Stack spacing={1.5}>
                  {form.images.map((url, index) => (
                    <Stack key={index} direction="row" spacing={1}>
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="https://…"
                        value={url}
                        onChange={setImage(index)}
                      />
                      <IconButton
                        color="error"
                        onClick={() =>
                          setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }))
                        }
                        aria-label="Remove image"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  sx={{ mt: 1 }}
                  onClick={() => setForm((f) => ({ ...f, images: [...f.images, ''] }))}
                >
                  Add image
                </Button>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete product?"
        message={`"${deleting?.name}" will be permanently removed from the catalogue.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteMutation.mutate(deleting._id)}
      />
    </Box>
  );
}
