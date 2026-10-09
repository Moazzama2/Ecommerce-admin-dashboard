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
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import { listCategories, createCategory, updateCategory, deleteCategory } from '../api/categories';
import ConfirmDialog from '../components/ConfirmDialog';
import PageHeader from '../components/PageHeader';
import { errorMessage } from '../api/client';

// The API stores { name, slug, parent } and requires slug explicitly —
// build it from the name the same way the Flutter app does.
const slugify = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export default function Categories() {
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', slug: '', parent: '' });
  const [formError, setFormError] = useState(null);
  // Save/delete feedback — the dialogs close on success, so the toast is
  // the only place the admin sees the outcome.
  const [toast, setToast] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data: categories, isLoading, error, refetch } = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['categories'] });

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing ? updateCategory(editing._id, payload) : createCategory(payload),
    onSuccess: () => {
      const wasEditing = Boolean(editing);
      setFormOpen(false);
      setEditing(null);
      invalidate();
      // Products embed their category, so refresh those too.
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setToast({
        severity: 'success',
        text: wasEditing ? 'Category updated' : 'Category created',
      });
    },
    onError: (err) => setFormError(errorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteCategory(id),
    onSuccess: () => {
      setDeleting(null);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setToast({ severity: 'success', text: 'Category deleted' });
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
    setForm({ name: '', slug: '', parent: '' });
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (category) => {
    setEditing(category);
    setForm({
      name: category.name || '',
      slug: category.slug || '',
      parent: category.parent?._id || category.parent || '',
    });
    setFormError(null);
    setFormOpen(true);
  };

  const submit = (event) => {
    event.preventDefault();
    setFormError(null);

    const name = form.name.trim();
    const slug = (form.slug.trim() || slugify(name)).toLowerCase();
    if (name.length < 2) return setFormError('Name must be at least 2 characters.');
    if (slug.length < 2) return setFormError('Slug must be at least 2 characters.');

    saveMutation.mutate({ name, slug, parent: form.parent || null });
  };

  const list = categories || [];
  const byId = Object.fromEntries(list.map((c) => [c._id, c]));

  // Depth-first flatten: every subcategory is emitted straight after its
  // own parent (and its children after it), so the grid reads as a
  // tree instead of "all top-level first, then a pile of children".
  const rows = (() => {
    const parentIdOf = (category) => category.parent?._id || category.parent || null;
    const childrenOf = (parentId) =>
      list
        .filter((category) => parentIdOf(category) === parentId)
        .sort((a, b) => a.name.localeCompare(b.name));

    const flat = [];
    const seen = new Set();

    const walk = (parentId, depth) => {
      for (const category of childrenOf(parentId)) {
        if (seen.has(category._id)) continue; // cycle guard (a → b → a)
        seen.add(category._id);
        flat.push({ ...category, id: category._id, depth, order: flat.length });
        walk(category._id, depth + 1);
      }
    };

    walk(null, 0); // top-level categories, each with its own subtree

    // Orphans (parent deleted) would otherwise disappear from the table.
    list
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((category) => {
        if (seen.has(category._id)) return;
        flat.push({ ...category, id: category._id, depth: 0, order: flat.length });
      });

    return flat;
  })();

  const columns = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Category',
        flex: 1,
        minWidth: 220,
        renderCell: (params) => (
          <Typography
            variant="body2"
            fontWeight={params.row.depth ? 400 : 600}
            sx={{ pl: params.row.depth * 2.5 }}
          >
            {params.row.depth ? '↳ '.repeat(params.row.depth) : ''}
            {params.row.name}
          </Typography>
        ),
      },
      { field: 'slug', headerName: 'Slug', width: 200 },
      {
        field: 'parent',
        headerName: 'Parent',
        width: 180,
        renderCell: (params) => {
          const parent = params.row.parent;
          if (!parent) return '—';
          if (typeof parent === 'object') return parent.name || '—';
          return byId[parent]?.name || '—';
        },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list.length],
  );

  return (
    <Box>
      <PageHeader
        title="Categories"
        subtitle="Organise the catalogue into a hierarchy"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            New category
          </Button>
        }
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage(error)}
        </Alert>
      ) : null}

      {formError ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>
          {formError}
        </Alert>
      ) : null}

      <Box
        sx={{
          height: 560,
          bgcolor: 'background.paper',
          border: '1px solid rgba(15,23,42,.08)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          // Clicking anywhere on a row opens the editor.
          onRowClick={(params) => openEdit(params.row)}
          sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
          loading={isLoading}
          disableRowSelectionOnClick
          hideFooter
          pageSizeOptions={[50]}
          localeText={{ noRowsLabel: 'No categories yet' }}
        />
      </Box>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={submit}>
          <DialogTitle fontWeight={700}>
            {editing ? 'Edit category' : 'New category'}
            <IconButton
              onClick={() => setFormOpen(false)}
              sx={{ position: 'absolute', right: 12, top: 12 }}
              aria-label="Close"
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ pt: 0.5 }}>
              <TextField
                label="Name"
                fullWidth
                required
                autoFocus
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    name: e.target.value,
                    // Only auto-fill slug when it hasn't been customised yet.
                    slug: f.slug && f.slug !== slugify(f.name) ? f.slug : slugify(e.target.value),
                  }))
                }
              />
              <TextField
                label="Slug"
                fullWidth
                required
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                helperText="Used in URLs, e.g. /category/electronics"
              />
              <TextField
                select
                label="Parent category"
                fullWidth
                value={form.parent}
                onChange={(e) => setForm((f) => ({ ...f, parent: e.target.value }))}
              >
                <MenuItem value="">None (top-level)</MenuItem>
                {list
                  .filter((c) => c._id !== editing?._id)
                  .map((c) => (
                    <MenuItem key={c._id} value={c._id}>
                      {c.name}
                    </MenuItem>
                  ))}
              </TextField>
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
        title="Delete category?"
        message={
          `Delete "${deleting?.name}"? Categories with subcategories can't be deleted.`
        }
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
