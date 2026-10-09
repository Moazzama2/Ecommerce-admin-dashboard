import client from './client';

// GET /api/stats/overview — totals, chart series, recent orders, best sellers.
// Always ask for the widest window (90 days): the overview ships one dense
// series per day and each chart slices the range its dropdown selects, so
// switching ranges never costs another round trip.
export const MAX_CHART_RANGE = 90;

export const getOverview = async (days = MAX_CHART_RANGE) => {
  const res = await client.get('/api/stats/overview', { params: { days } });
  return res.data.data;
};
