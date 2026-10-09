import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import { createProduct, deleteProduct, listProducts, updateProduct } from '../api/products';
import { deleteImage, uploadImage } from '../api/uploads';
import { listCategories } from '../api/categories';
import ConfirmDialog from '../components/ConfirmDialog';
import FilterBar from '../components/FilterBar';
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

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // keep in sync with the backend limit

/** 40px preview for an image URL; falls back to an empty tile on a 404. */
function ImageThumb({ url }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);

  if (!url || failed) {
    return (
      <Box
        sx={{
          width: 40,
          height: 40,
          flexShrink: 0,
          borderRadius: 1,
          bgcolor: 'grey.100',
          border: '1px dashed',
          borderColor: 'grey.300',
        }}
      />
    );
  }

  return (
    <Box
      component="img"
      src={url}
      alt=""
      onError={() => setFailed(true)}
      sx={{
        width: 40,
        height: 40,
        flexShrink: 0,
        borderRadius: 1,
        objectFit: 'cover',
        bgcolor: 'grey.100',
      }}
    />
  );
}

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
  // Save/delete feedback — the delete dialog closes on success, so the
  // toast is the only place the admin sees the outcome.
  const [toast, setToast] = useState(null);

  // Cloudinary upload state for the open dialog.
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  // Uploads made inside this dialog (image url -> Cloudinary publicId).
  // Anything that never makes it onto the product is deleted on close,
  // so cancelling a dialog never leaves orphaned assets behind.
  const sessionUploads = useRef(new Map());
  const fileInputRef = useRef(null);

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

  // Deletes this dialog's uploads that aren't in `keepUrls` (fire and
  // forget — a failed cleanup must never block the UI). Called with no
  // arguments on cancel, and with the saved images on success.
  const discardSessionUploads = (keepUrls = []) => {
    for (const [url, publicId] of sessionUploads.current) {
      if (!keepUrls.includes(url)) {
        deleteImage(publicId).catch(() => {
          /* orphan stays behind — not worth surfacing an error */
        });
      }
    }
    sessionUploads.current = new Map();
  };

  const closeForm = () => {
    discardSessionUploads(); // cancelling the dialog → nothing was saved
    setFormOpen(false);
    setEditing(null);
  };

  const pickImage = () => fileInputRef.current?.click();

  const addUrlField = () =>
    setForm((f) => (f.images.length >= 10 ? f : { ...f, images: [...f.images, ''] }));

  // Shared by the file picker and drag-and-drop — one validation path.
  const handleFile = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('That file is not an image.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setFormError('Images must be 5 MB or smaller.');
      return;
    }
    // The backend's Joi schema allows 10 images per product.
    if (form.images.length >= 10) {
      setFormError('A product can have at most 10 images.');
      return;
    }

    setFormError(null);
    setUploading(true);
    try {
      const image = await uploadImage(file);
      sessionUploads.current.set(image.url, image.publicId);
      setForm((f) => ({ ...f, images: [...f.images, image.url] }));
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const onFileSelected = (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow picking the same file again
    handleFile(file);
  };

  // Drop a file anywhere on the image list to upload it.
  const onImagesDragOver = (event) => {
    event.preventDefault();
    setDragOver(true);
  };
  const onImagesDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  const saveMutation = useMutation({
    mutationFn: (payload) => (editing ? updateProduct(payload) : createProduct(payload)),
    onSuccess: (_data, payload) => {
      const wasEditing = Boolean(editing);
      setFormOpen(false);
      setEditing(null);
      invalidate();
      // Images that were uploaded here but stripped from the form before
      // saving are orphans now — drop them from Cloudinary.
      discardSessionUploads(payload.images || []);
      setToast({
        severity: 'success',
        text: wasEditing ? 'Product updated' : 'Product created',
      });
    },
    onError: (err) => setFormError(errorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteProduct(id),
    onSuccess: (_data, id) => {
      setDeleting(null);
      invalidate();
      setToast({ severity: 'success', text: 'Product deleted' });
    },
    onError: (err) => {
      const message = errorMessage(err);
      setDeleting(null);
      // No dialog stays open on a failed delete — surface it as a toast.
      setToast({ severity: 'error', text: message });
      setFormError(message);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    sessionUploads.current = new Map();
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
    sessionUploads.current = new Map();
    setFormOpen(true);
  };

  const submit = (event) => {
    event.preventDefault();
    setFormError(null);

    const description = form.description.trim();
    // A NEW product needs the full 200-character description; existing ones
    // were written before that rule and only have to stay non-empty.
    const minDescription = editing ? 1 : 200;

    if (!form.name.trim() || !form.category || description.length === 0) {
      setFormError('Name, category and a description are required.');
      return;
    }

    // Only leaf (sub)categories are assignable — parents are containers.
    if (!subcategoryIds.has(form.category)) {
      setFormError('Please choose a subcategory — parent categories cannot hold products.');
      return;
    }

    if (description.length < minDescription) {
      setFormError(`Description must be at least ${minDescription} characters.`);
      return;
    }

    if (description.length > 2000) {
      setFormError('Description must be 2000 characters or fewer.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      description,
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
            <IconButton
              size="small"
              onClick={(event) => {
                event.stopPropagation(); // the row itself already opens the editor
                openEdit(params.row);
              }}
              aria-label="Edit"
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={(event) => {
                event.stopPropagation();
                setDeleting(params.row);
              }}
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

  // Products live in LEAF categories only: parents (Books, Electronics, …)
  // are containers, so they never appear in the picker.
  const allCategories = categoriesQuery.data || [];
  const subcategories = allCategories.filter((c) => c.parent);
  const subcategoryIds = new Set(subcategories.map((c) => c._id));
  const currentIsSubcategory = subcategoryIds.has(form.category);
  // A few older rows were saved against a parent *name* (or a plain string).
  // Show that value, disabled, so the select never opens blank — the admin
  // still has to pick a real subcategory before saving.
  const legacyCategoryLabel = currentIsSubcategory
    ? null
    : allCategories.find((c) => c._id === form.category || c.name === form.category)?.name ||
      form.category;

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

      <FilterBar direction={{ xs: 'column', sm: 'row' }}>
        <TextField
          size="small"
          placeholder="Search name or description…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          sx={{ maxWidth: { sm: 360 }, flexGrow: { sm: 1 }, width: { xs: '100%' } }}
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
      </FilterBar>

      {productsQuery.error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage(productsQuery.error)}
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
          rows={data?.products || []}
          columns={columns}
          getRowId={(row) => row._id}
          // Clicking anywhere on a row opens the editor (the row action
          // buttons stop propagation so they keep their own behaviour).
          onRowClick={(params) => openEdit(params.row)}
          sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
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
      <Dialog open={formOpen} onClose={closeForm} maxWidth="sm" fullWidth>
        <form onSubmit={submit}>
          <DialogTitle fontWeight={700}>
            {editing ? 'Edit product' : 'New product'}
            <IconButton
              onClick={closeForm}
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
                inputProps={{ maxLength: 2000 }}
                helperText={
                  editing
                    ? `${form.description.trim().length}/2000 characters`
                    : `${form.description.trim().length}/2000 characters (min. 200)`
                }
                error={
                  form.description.length > 0 &&
                  form.description.trim().length < (editing ? 1 : 200)
                }
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
                {subcategories.map((c) => (
                  <MenuItem key={c._id} value={c._id}>
                    {c.name}
                  </MenuItem>
                ))}
                {form.category && !currentIsSubcategory ? (
                  <MenuItem value={form.category} disabled>
                    {legacyCategoryLabel} — pick a subcategory
                  </MenuItem>
                ) : null}
              </TextField>

              <Box>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mb: 1 }}
                >
                  <Typography variant="subtitle2">Images</Typography>
                  <Button
                    size="small"
                    startIcon={
                      uploading ? <CircularProgress size={14} color="inherit" /> : <CloudUploadIcon fontSize="small" />
                    }
                    onClick={pickImage}
                    disabled={uploading || form.images.length >= 10}
                  >
                    {uploading ? 'Uploading…' : 'Upload image'}
                  </Button>
                </Stack>

                {/* Empty on purpose — the button above clicks it. */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={onFileSelected}
                />

                <Stack spacing={1.5}>
                  {form.images.map((url, index) => (
                    <Stack key={index} direction="row" spacing={1} alignItems="center">
                      <ImageThumb url={url} />
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
                          setForm((f) => ({
                            ...f,
                            images: f.images.filter((_, i) => i !== index),
                          }))
                        }
                        aria-label="Remove image"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>

                {form.images.length === 0 ? (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                    No images yet — upload a file or paste a URL.
                  </Typography>
                ) : null}

                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  sx={{ mt: 1 }}
                  onClick={() => setForm((f) => ({ ...f, images: [...f.images, ''] }))}
                >
                  Add URL
                </Button>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={closeForm}>Cancel</Button>
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
