import client from './client';

export const listCategories = async () => {
  const res = await client.get('/api/categories');
  return res.data.data; // flat array: { _id, name, slug, parent }
};

// slug is required by the API — build it from the name in the form.
export const createCategory = async (payload) => {
  const res = await client.post('/api/categories', payload);
  return res.data.data;
};

export const updateCategory = async (id, payload) => {
  const res = await client.patch(`/api/categories/${id}`, payload);
  return res.data.data;
};

export const deleteCategory = async (id) => {
  const res = await client.delete(`/api/categories/${id}`);
  return res.data.data;
};
