import { create } from 'zustand';
import * as authApi from '../api/auth';
import { setAccessToken, clearAccessToken, getAccessToken } from '../api/token';

// Session state for the whole dashboard.
//
// `bootstrapped` distinguishes "we haven't asked the server yet" from
// "the server said we're logged out" — route guards must not bounce a
// user to /login during the first 100ms, nor show a spinner forever.
export const useAuthStore = create((set) => ({
  user: null,
  bootstrapped: false,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const data = await authApi.login(email, password);
      setAccessToken(data.accessToken);
      set({ user: data.user, loading: false, bootstrapped: true });
      return data.user;
    } catch (error) {
      set({
        loading: false,
        error: error?.response?.data?.message || 'Login failed',
      });
      throw error;
    }
  },

  // Silent session restore on page load: the httpOnly cookie proves who
  // we are, /refresh mints a fresh access token.
  bootstrap: async () => {
    if (getAccessToken()) {
      set({ bootstrapped: true });
      return;
    }
    try {
      const data = await authApi.refresh();
      setAccessToken(data.accessToken);
      set({ user: data.user, bootstrapped: true });
    } catch {
      clearAccessToken();
      set({ user: null, bootstrapped: true });
    }
  },

  logout: async () => {
    try {
      await authApi.logout(); // revokes the refresh token server-side
    } catch {
      /* already dead locally — still sign out below */
    }
    clearAccessToken();
    set({ user: null, bootstrapped: true, error: null });
  },

  clearError: () => set({ error: null }),
}));
