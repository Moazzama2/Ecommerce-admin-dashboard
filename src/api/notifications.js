import client from './client';

// params: { page, limit }
export const listNotifications = async (params) => {
  const res = await client.get('/api/notifications/admin/all', { params });
  return res.data.data; // { notifications, pagination }
};

export const broadcast = async ({ title, body, audience = 'active_accounts' }) => {
  const res = await client.post('/api/notifications/broadcast', { title, body, audience });
  return res.data.data; // { recipients, audience, title, body }
};
