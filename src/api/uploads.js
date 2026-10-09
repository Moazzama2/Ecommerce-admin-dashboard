import client from './client';

// Uploads go as multipart/form-data — the client's default JSON
// Content-Type must be overridden or axios would serialise the FormData
// (see transformRequest in axios defaults).
export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);

  const res = await client.post('/api/uploads/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data; // { url, publicId, width, height, format, bytes }
};

// publicId comes straight from the upload response — encodeURIComponent
// so the slashes in "ecommerce/products/abc" survive the path segment.
export const deleteImage = async (publicId) => {
  const res = await client.delete(`/api/uploads/image/${encodeURIComponent(publicId)}`);
  return res.data.data;
};
