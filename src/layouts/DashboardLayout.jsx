import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import InventoryIcon from '@mui/icons-material/Inventory';
import CategoryIcon from '@mui/icons-material/Category';
import PeopleIcon from '@mui/icons-material/People';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuthStore } from '../store/auth';
import { connectSocket, disconnectSocket } from '../api/socket';

const DRAWER_WIDTH = 250;

const NAV_ITEMS = [
  { to: '/overview', label: 'Overview', icon: <DashboardIcon /> },
  { to: '/orders', label: 'Orders', icon: <ShoppingCartIcon /> },
  { to: '/products', label: 'Products', icon: <InventoryIcon /> },
  { to: '/categories', label: 'Categories', icon: <CategoryIcon /> },
  { to: '/customers', label: 'Customers', icon: <PeopleIcon /> },
  { to: '/notifications', label: 'Notifications', icon: <NotificationsIcon /> },
];

// Friendly, human title for the top bar on every route the layout owns.
function pageTitle(pathname) {
  if (pathname.startsWith('/orders')) return 'Orders';
  if (pathname.startsWith('/customers')) return 'Customers';
  const match = NAV_ITEMS.find(({ to }) => pathname === to || pathname.startsWith(`${to}/`));
  if (match) return match.label;
  if (pathname.startsWith('/profile')) return 'Profile';
  return 'Admin';
}

function NavList({ onNavigate }) {
  const location = useLocation();

  return (
    <>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ px: 3, pt: 2, pb: 0.5, display: 'block', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700 }}
      >
        Menu
      </Typography>
      <List sx={{ px: 1.5, py: 0.5 }}>
        {NAV_ITEMS.map(({ to, label, icon }) => {
          const active = location.pathname === to || location.pathname.startsWith(`${to}/`);
          return (
            <ListItemButton
              key={to}
              component={NavLink}
              to={to}
              onClick={onNavigate}
              selected={active}
              sx={{
                position: 'relative',
                borderRadius: 2,
                mb: 0.5,
                py: 1,
                color: 'text.secondary',
                '&:hover': { color: 'primary.main' },
                '&.Mui-selected': {
                  color: 'primary.main',
                  bgcolor: 'rgba(37,99,235,.08)',
                  fontWeight: 600,
                  '&:hover': { bgcolor: 'rgba(37,99,235,.12)' },
                },
                // Slim indicator bar on the active item's left edge.
                '&.Mui-selected::before': {
                  content: '""',
                  position: 'absolute',
                  left: -6,
                  top: '22%',
                  height: '56%',
                  width: 3,
                  borderRadius: 3,
                  bgcolor: 'primary.main',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>{icon}</ListItemIcon>
              <ListItemText
                primary={label}
                primaryTypographyProps={{ fontWeight: active ? 700 : 600, fontSize: 14 }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </>
  );
}

export default function DashboardLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  // Static for the session — just enough warmth to make the shell feel alive.
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // One live connection for the whole dashboard; pages subscribe with
  // socket.on(...) and clean up on unmount.
  useEffect(() => {
    const socket = connectSocket();
    return () => {
      // In React 18/19 dev StrictMode effects run twice — only tear down
      // if this is still the active connection.
      if (socket) disconnectSocket();
    };
  }, []);

  const handleLogout = async () => {
    setAnchorEl(null);
    await logout();
    navigate('/login', { replace: true });
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2.5, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar
          variant="rounded"
          sx={{ bgcolor: 'primary.main', fontWeight: 800, width: 40, height: 40, borderRadius: 2.5 }}
        >
          A
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
            Admin Panel
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Ecommerce
          </Typography>
        </Box>
      </Box>
      <Divider />
      <NavList onNavigate={() => setMobileOpen(false)} />
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      <List sx={{ px: 1.5, py: 1.5 }}>
        <ListItemButton
          component={NavLink}
          to="/profile"
          onClick={() => setMobileOpen(false)}
          selected={location.pathname === '/profile'}
          sx={{
            position: 'relative',
            borderRadius: 2,
            color: 'text.secondary',
            '&.Mui-selected': { color: 'primary.main', bgcolor: 'rgba(37,99,235,.08)' },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
            <PersonIcon />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography variant="body2" fontWeight={location.pathname === '/profile' ? 700 : 600}>
                {user?.name || 'Profile'}
              </Typography>
            }
            secondary={user?.role ? user.role : null}
            secondaryTypographyProps={{ fontSize: 11, textTransform: 'capitalize' }}
          />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Toolbar sx={{ gap: 1, minHeight: { xs: 56, md: 64 } }}>
          {isMobile && (
            <IconButton edge="start" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <MenuIcon />
            </IconButton>
          )}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontSize: 17, lineHeight: 1.2 }}>
              {pageTitle(location.pathname)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {todayLabel}
            </Typography>
          </Box>

          <IconButton
            onClick={() => navigate('/notifications')}
            aria-label="Notifications"
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2.5,
              '&:hover': { bgcolor: 'rgba(37,99,235,.06)', borderColor: 'rgba(37,99,235,.35)' },
            }}
          >
            <NotificationsIcon fontSize="small" />
          </IconButton>
          <IconButton
            onClick={(e) => setAnchorEl(e.currentTarget)}
            aria-label="Account menu"
            sx={{ ml: 0.5, p: 0.5, '&:hover .MuiAvatar-root': { boxShadow: '0 0 0 3px rgba(37,99,235,.18)' } }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: 'primary.main',
                fontWeight: 700,
                transition: 'box-shadow .18s cubic-bezier(.4,0,.2,1)',
              }}
            >
              {(user?.name || 'A').charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography fontWeight={600}>{user?.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.email}
              </Typography>
            </Box>
            <Divider />
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                navigate('/profile');
              }}
            >
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Permanent drawer on desktop */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: 0, display: { xs: 'none', md: 'block' } }}
      >
        <Drawer
          variant="permanent"
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Temporary drawer on mobile */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        key={location.pathname}
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          pt: { xs: 7, md: 8 },
          px: { xs: 2, sm: 3 },
          pb: 4,
          // Soft entrance for each route change.
          animation: 'fadeUp .3s ease both',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
