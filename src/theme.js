import { createTheme } from '@mui/material/styles';

// Dashboard theme — clean & minimal. Inter type, layered soft shadows,
// gentle hover states and small transitions so records screens feel
// calm but responsive instead of flat and static.
const EASE = 'cubic-bezier(.4, 0, .2, 1)';

// Layered shadows: a tight contact shadow plus a wide ambient one, which
// reads softer than MUI's default single drop shadow.
const SHADOW_SM = '0 1px 2px rgba(16,24,40,.05), 0 1px 3px rgba(16,24,40,.06)';
const SHADOW_MD = '0 4px 6px -1px rgba(16,24,40,.06), 0 10px 24px -6px rgba(16,24,40,.10)';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2563eb', light: '#60a5fa', dark: '#1d4ed8' },
    success: { main: '#16a34a' },
    warning: { main: '#ea9a15' },
    error: { main: '#dc2626' },
    background: { default: '#f6f7fb', paper: '#ffffff' },
    divider: 'rgba(15,23,42,.08)',
    text: { primary: '#0f172a', secondary: '#64748b' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h5: { fontWeight: 700, letterSpacing: '-0.02em' },
    h6: { fontWeight: 700, letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { fontWeight: 600, letterSpacing: 0 },
    caption: { letterSpacing: '0.01em' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // Slim, always-visible scrollbars so long record tables never
        // look like they're missing content.
        '*': {
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(100,116,139,.35) transparent',
        },
        '::-webkit-scrollbar': { width: 10, height: 10 },
        '::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(100,116,139,.32)',
          borderRadius: 8,
          border: '3px solid transparent',
          backgroundClip: 'content-box',
        },
        '::-webkit-scrollbar-thumb:hover': { backgroundColor: 'rgba(100,116,139,.55)' },
        '::-webkit-scrollbar-track': { background: 'transparent' },
        body: { WebkitFontSmoothing: 'antialiased' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: SHADOW_SM,
          border: '1px solid rgba(15,23,42,.06)',
          backgroundImage: 'none',
          transition: `box-shadow .2s ${EASE}, transform .2s ${EASE}`,
          // Only cards that behave like tiles get the lift; dialogs,
          // menus and the data-grid paper stay put.
          '&.tile:hover': { boxShadow: SHADOW_MD, transform: 'translateY(-2px)' },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 10,
          paddingInline: 16,
          transition: `background-color .18s ${EASE}, box-shadow .18s ${EASE}, transform .18s ${EASE}`,
        },
        contained: { boxShadow: 'none', '&:hover': { boxShadow: '0 4px 12px rgba(37,99,235,.22)' } },
        outlined: { borderColor: 'rgba(15,23,42,.14)', '&:hover': { borderWidth: 1, borderColor: 'rgba(37,99,235,.45)' } },
        sizeSmall: { paddingInline: 10 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, height: 26, borderRadius: 8 },
        label: { paddingInline: 10 },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: { '& .MuiOutlinedInput-root': { borderRadius: 10, transition: `box-shadow .18s ${EASE}` } },
      },
    },
    MuiSelect: { styleOverrides: { select: { borderRadius: 10 } } },
    MuiMenuItem: {
      styleOverrides: { root: { borderRadius: 8, margin: '2px 6px', minHeight: 36 } },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          transition: `background-color .16s ${EASE}, color .16s ${EASE}`,
          '&:hover': { backgroundColor: 'rgba(37,99,235,.06)' },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottomColor: 'rgba(15,23,42,.06)' },
        head: { fontWeight: 700, fontSize: 13, color: '#64748b', letterSpacing: '.02em' },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: { '& .MuiTableCell-head': { backgroundColor: '#f8fafc', borderBottom: 'none' } },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { transition: `background-color .14s ${EASE}`, '&:hover': { backgroundColor: 'rgba(37,99,235,.04)' } },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiDialog: { styleOverrides: { paper: { boxShadow: SHADOW_MD, borderRadius: 16 } } },
    MuiPopover: { styleOverrides: { paper: { boxShadow: SHADOW_MD, borderRadius: 14 } } },
    MuiMenu: { styleOverrides: { paper: { boxShadow: SHADOW_MD, borderRadius: 14 } } },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { borderRadius: 8, fontSize: 12, backgroundColor: '#0f172a' },
        arrow: { color: '#0f172a' },
      },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { height: 6, borderRadius: 6, backgroundColor: 'rgba(15,23,42,.07)' } },
    },
    MuiCircularProgress: { styleOverrides: { root: { strokeWidth: 3 } } },
    // DataGrid: soft header, row hover and a calm footer so the record
    // screens read like part of the same design.
    MuiDataGrid: {
      styleOverrides: {
        root: { border: 'none', borderRadius: 12, fontSize: 14 },
        columnHeaders: {
          backgroundColor: '#f8fafc',
          borderBottom: 'none',
          '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700, fontSize: 13, letterSpacing: '.02em', color: '#64748b' },
        },
        row: { transition: `background-color .14s ${EASE}`, '&:hover': { backgroundColor: 'rgba(37,99,235,.04)' } },
        cell: { borderBottomColor: 'rgba(15,23,42,.06)' },
        footerContainer: { borderTop: '1px solid rgba(15,23,42,.06)', backgroundColor: '#fff' },
        toolbarContainer: { padding: 12, gap: 1 },
        loadingOverlay: { backgroundColor: 'rgba(246,247,251,.6)' },
      },
    },
  },
});

export default theme;
