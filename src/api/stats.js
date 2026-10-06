import client from './client';

// GET /api/stats/overview — totals, chart series, recent orders, best sellers.
export const getOverview = async (days = 30) => {
  const res = await client.get('/api/stats/overview', { params: { days } });
  return res.data.data;
};
