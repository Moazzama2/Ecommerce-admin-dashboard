import axios from 'axios';
import { getAccessToken, setAccessToken, clearAccessToken } from './token';

// Base URL:
//  - development → '' (Vite proxy forwards /api to :5000, see vite.config.js)
//  - production  → VITE_API_URL if the API lives on another origin
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true, // send/receive the httpOnly refresh cookie
  headers: { 'Content-Type': 'application/json' },
});

// ---------------------------------------------------------------
// Request: attach the current access token.
// ---------------------------------------------------------------
client.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---------------------------------------------------------------
// Response: on 401, refresh once and replay the request.
//
// Single-flight: N concurrent 401s share ONE /refresh call instead of
// hammering the endpoint (and racing token rotation).
// ---------------------------------------------------------------
let refreshPromise = null;

export const refreshSession = async () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post('/api/users/refresh', {}, { withCredentials: true })
      .then((res) => {
        const { accessToken: newToken } = res.data.data;
        setAccessToken(newToken);
        return newToken;
      })
      .catch((error) => {
        clearAccessToken();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

const isAuthUrl = (url = '') =>
  url.includes('/api/users/login') ||
  url.includes('/api/users/refresh') ||
  url.includes('/api/users/signup');

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !isAuthUrl(original.url)
    ) {
      original._retried = true;
      try {
        const token = await refreshSession();
        original.headers.Authorization = `Bearer ${token}`;
        return client(original);
      } catch {
        // Refresh failed → session is really over; the route guard
        // redirects to /login on the next tick.
      }
    }
    return Promise.reject(error);
  },
);

/** Backend error message with a sensible fallback. */
export const errorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Something went wrong';

export default client;
