import { Navigate, Route, Routes } from 'react-router-dom';
import RequireAuth from './RequireAuth';
import RequireAdmin from './RequireAdmin';
import DashboardLayout from '../layouts/DashboardLayout';
import Login from '../pages/Login';
import Overview from '../pages/Overview';
import Orders from '../pages/Orders';
import OrderDetail from '../pages/OrderDetail';
import Products from '../pages/Products';
import Categories from '../pages/Categories';
import Customers from '../pages/Customers';
import Notifications from '../pages/Notifications';
import Profile from '../pages/Profile';
import NotFound from '../pages/NotFound';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <RequireAuth>
            <RequireAdmin>
              <DashboardLayout />
            </RequireAdmin>
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<Overview />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/products" element={<Products />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
