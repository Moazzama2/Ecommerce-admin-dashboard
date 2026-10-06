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
  Chip,
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
import CircleIcon from '@mui/icons-material/Circle';
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

function NavList({ onNavigate }) {
  const location = useLocation();

  return (
    <List sx={{ px: 1.5, py: 1 }}>
      {NAV_ITEMS.map(({ to, label, icon }) => {
        const active = location.pathname === to || location.pathname.startsWith(`${to}/`);
        return (
          <ListItemButton
            key={to}
            component={NavLink}
            to={to}
            onClick={onNavigate}
            selected={active}
            sx={{ borderRadius: 2, mb: 0.5, color: 'text.secondary', '&.Mui-selected': { color: 'primary.main' } }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>{icon}</ListItemIcon>
            <ListItemText primary={label} primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }} />
          </ListItemButton>
        );
      })}
    </List>
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
        <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 700 }}>A</Avatar>
        <Box>
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
      <List sx={{ px: 1.5, pb: 2 }}>
        <ListItemButton
          component={NavLink}
          to="/profile"
          onClick={() => setMobileOpen(false)}
          selected={location.pathname === '/profile'}
          sx={{ borderRadius: 2, color: 'text.secondary' }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
            <PersonIcon />
          </ListItemIcon>
          <ListItemText primary="Profile" primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }} />
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
        <Toolbar>
          {isMobile && (
            <IconButton edge="start" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ flexGrow: 1, fontSize: 18 }}>
            Ecommerce Admin
          </Typography>

          <Chip
            icon={<CircleIcon sx={{ fontSize: 10, color: 'success.main' }} />}
            label="Live"
            size="small"
            variant="outlined"
            sx={{ mr: 2, display: { xs: 'none', sm: 'flex' } }}
          />

          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} aria-label="Account menu">
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
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
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          pt: { xs: 7, md: 8 },
          px: { xs: 2, sm: 3 },
          pb: 4,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
