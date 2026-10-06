import client from './client';

export const login = async (email, password) => {
  const res = await client.post('/api/users/login', { email, password });
  return res.data.data; // { accessToken, refreshToken, user }
};

export const refresh = async () => {
  const res = await client.post('/api/users/refresh', {}, { withCredentials: true });
  return res.data.data;
};

export const logout = async () => {
  const res = await client.post('/api/users/logout');
  return res.data.data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const res = await client.post('/api/users/change-password', { currentPassword, newPassword });
  return res.data.data;
};

export const getProfile = async () => {
  const res = await client.get('/api/users/view');
  return res.data.data;
};
