import { createTheme } from '@mui/material/styles';

// Dashboard theme — Material Design defaults with a slightly tighter,
// data-dense feel suited to admin screens.
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    success: { main: '#2e7d32' },
    warning: { main: '#ed6c02' },
    background: { default: '#f4f6fa' },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
  },
  components: {
    MuiCard: {
      styleOverrides: { root: { boxShadow: '0 1px 3px rgba(16,24,40,.08), 0 1px 2px rgba(16,24,40,.04)' } },
    },
    MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    MuiTableHead: {
      styleOverrides: {
        root: { '& .MuiTableCell-head': { fontWeight: 700, backgroundColor: '#f8fafc' } },
      },
    },
  },
});

export default theme;
