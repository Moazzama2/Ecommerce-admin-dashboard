import client from './client';

// params: { page, limit, search?, category? }
export const listProducts = async (params) => {
  const res = await client.get('/api/products/all', { params });
  return res.data.data; // { products, pagination }
};

// The create schema (Joi) expects: name, description, price, category,
// stock, and optionally images[] — send exactly those keys.
export const createProduct = async (payload) => {
  const res = await client.post('/api/products/create', payload);
  return res.data.data;
};

// The update endpoint takes the id inside the body (no :id segment).
export const updateProduct = async (payload) => {
  const res = await client.patch('/api/products/update', payload);
  return res.data.data;
};

export const deleteProduct = async (id) => {
  const res = await client.delete(`/api/products/remove/${id}`);
  return res.data.data;
};
