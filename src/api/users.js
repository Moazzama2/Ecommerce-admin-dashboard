import client from './client';

// params: { page, limit, search?, from?, to? }  (from/to: 'YYYY-MM-DD')
export const listUsers = async (params) => {
  const res = await client.get('/api/users/admin/all', { params });
  return res.data.data; // { users, pagination }
};

// One account for the customer detail screen.
export const getUser = async (id) => {
  const res = await client.get(`/api/users/admin/${id}`);
  return res.data.data;
};

export const setRole = async (id, role) => {
  const res = await client.patch(`/api/users/admin/${id}/role`, { role });
  return res.data.data;
};

export const setStatus = async (id, isActive) => {
  const res = await client.patch(`/api/users/admin/${id}/status`, { isActive });
  return res.data.data;
};
