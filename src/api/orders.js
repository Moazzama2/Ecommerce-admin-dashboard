import client from './client';

// Admin list: server-side pagination + filters.
// params: { page, limit, status?, sortBy?, productId? }
export const listOrders = async (params) => {
  const res = await client.get('/api/orders/admin/all', { params });
  return res.data.data; // { orders, pagination }
};

export const getOrder = async (id) => {
  const res = await client.get(`/api/orders/admin/${id}`);
  return res.data.data;
};

export const updateStatus = async (id, status) => {
  const res = await client.patch(`/api/orders/${id}/status`, { status });
  return res.data.data;
};
